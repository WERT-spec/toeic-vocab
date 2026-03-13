let currentDayKey = "Day 01";
let currentCardIdx = 0;
let cardState = { range: 'all', activeList: [] };
let quizState = { currentIdx: 0, score: 0, total: 0, mode: 'en-zh', range: 'all', targetWord: null, isAnswered: false, activeList: [] };

// --- 💯 升級的離線原用語音播放邏輯 (Web Speech API) ---
function normalize(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function playAudio(text, btnElement, event) {
    // 防止點擊按鈕時觸發卡片翻轉
    if (event) event.stopPropagation();

    if (!('speechSynthesis' in window)) {
        alert('您的瀏覽器不支援語音播放功能。建議使用 Chrome 或 Safari。');
        return;
    }

    // 視覺回饋：按下時按鈕改變顏色
    if (btnElement) btnElement.classList.add('is-speaking');

    // 建立語音內容
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9; // 稍微放慢速度，適合學習

    // 播放結束或出錯時恢復按鈕狀態
    const resetBtn = () => { if (btnElement) btnElement.classList.remove('is-speaking'); };
    utterance.onend = resetBtn;
    utterance.onerror = resetBtn;

    // 中斷之前的播放，確保點擊立即反應
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
}

function getSubList(range) {
    if (range === 'all') return [...vocabData[currentDayKey]];
    const [start, end] = range.split('-').map(Number);
    return vocabData[currentDayKey].slice(start - 1, end);
}

// --- UI 操作邏輯 ---
function initDaySelector() {
    const grid = document.getElementById('day-grid');
    const buttons = [];
    for (let i = 1; i <= 30; i++) {
        const dayKey = `Day ${i < 10 ? '0' + i : i}`;
        const hasData = !!vocabData[dayKey];
        buttons.push(`
            <button onclick="changeDay('${dayKey}')"
                class="py-2.5 text-[11px] font-bold rounded-lg border ${hasData ? 'border-slate-200 bg-white text-slate-700 shadow-sm active:scale-95 hover:bg-slate-50' : 'border-slate-100 bg-slate-50 text-slate-300 pointer-events-none'} transition-all ${dayKey === currentDayKey ? 'active-day' : ''}">
                D${i}
            </button>`);
    }
    grid.innerHTML = buttons.join('');
}

function changeDay(day) {
    currentDayKey = day;
    const num = day.replace('Day ', '');
    document.getElementById('day-label').textContent = `DAY ${num}`;
    initDaySelector();
    updateRangeSelectors();
    setGlobalRange('all'); // 切換天數時，預設顯示全部範圍
    document.querySelector('details').open = false;
}

function updateRangeSelectors() {
    const wordCount = vocabData[currentDayKey].length;
    const cardSel = document.getElementById('card-range-selector');
    const quizSel = document.getElementById('quiz-range-selector');
    const globalSel = document.getElementById('global-range-selector');

    let cardButtons = '';
    let quizButtons = '';
    let globalButtons = '';

    for (let i = 0; i < wordCount; i += 10) {
        let rangeText = `${i + 1}-${Math.min(i + 10, wordCount)}`;
        cardButtons += `<button onclick="setCardRange('${rangeText}')" id="card-range-${rangeText}" class="range-btn-card px-4 py-2 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm active:scale-95 transition-all">${rangeText}</button>`;
        quizButtons += `<button onclick="setQuizRange('${rangeText}')" id="btn-range-${rangeText}" class="range-btn-quiz w-full py-2 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm active:scale-95 transition-all">${rangeText}</button>`;
        globalButtons += `<button onclick="setGlobalRange('${rangeText}')" id="global-range-${rangeText}" class="range-btn-global px-4 py-2 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm active:scale-95 transition-all">${rangeText}</button>`;
    }
    
    cardButtons += `<button onclick="setCardRange('all')" id="card-range-all" class="range-btn-card px-5 py-2 text-xs font-bold rounded-lg border border-blue-200 bg-blue-50 text-blue-600 shadow-sm active:scale-95 transition-all">全部</button>`;
    quizButtons += `<button onclick="setQuizRange('all')" id="btn-range-all" class="range-btn-quiz w-full py-2 text-xs font-bold rounded-lg border border-blue-200 bg-blue-50 text-blue-600 shadow-sm active:scale-95 transition-all">全部</button>`;
    globalButtons += `<button onclick="setGlobalRange('all')" id="global-range-all" class="range-btn-global px-5 py-2 text-xs font-bold rounded-lg border border-blue-200 bg-blue-50 text-blue-600 shadow-sm active:scale-95 transition-all">全部</button>`;

    if (cardSel) cardSel.innerHTML = cardButtons;
    if (quizSel) quizSel.innerHTML = quizButtons;
    if (globalSel) globalSel.innerHTML = globalButtons;
    
    // 初始化高亮
    setRangeActive('range-btn-global', 'global-range-', cardState.range || 'all');
}

function setGlobalRange(range) {
    // 更新各模式狀態
    cardState.range = range;
    cardState.activeList = getSubList(range);
    currentCardIdx = 0;
    
    quizState.range = range;
    
    // 更新 UI 高亮
    setRangeActive('range-btn-global', 'global-range-', range);
    setRangeActive('range-btn-card', 'card-range-', range);
    setRangeActive('range-btn-quiz', 'btn-range-', range);
    
    // 1. 更新單字列表 (List)
    initTable(range);
    
    // 2. 如果在字卡模式，立即更新內容
    if (!document.getElementById('section-cards').classList.contains('hidden')) {
        document.getElementById('card-area').classList.remove('hidden');
        updateCard();
    }
    
    // 3. 如果在測驗模式，重設測驗
    if (!document.getElementById('section-quiz').classList.contains('hidden')) {
        resetQuiz();
    }

    // 關閉選單
    toggleGlobalRangeSelector();
}

function initTable(range = 'all') {
    const tbody = document.getElementById('vocab-table-body');
    const displayList = getSubList(range);
    
    // 獲取起始索引（用於顯示正確的序號）
    let startIdx = 0;
    if (range !== 'all') {
        startIdx = parseInt(range.split('-')[0]) - 1;
    }

    tbody.innerHTML = displayList.map((item, idx) => `
        <tr class="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition group">
            <!-- 序號 -->
            <td class="py-6 font-mono text-slate-400 dark:text-slate-500 text-xs sm:text-sm text-center align-middle pl-2">
                ${startIdx + idx + 1}
            </td>
            
            <!-- 單字與發音 & 語音按鈕 -->
            <td class="py-4 sm:py-6 align-middle pr-2 sm:pr-4 pl-2">
                <div class="flex items-center justify-between">
                    <div class="flex-1 pr-1">
                        <!-- 單字 -->
                        <div class="font-bold text-slate-800 dark:text-blue-400 text-base sm:text-lg tracking-wide leading-tight break-all">${item.w}</div>
                        <!-- 發音 -->
                        <div class="text-[11px] sm:text-[13px] text-slate-500 dark:text-slate-500 font-mono mt-1 tracking-widest break-all leading-tight">
                            [ ${item.ph.replace(/[\/\[\]]/g, '')} ]
                        </div>
                    </div>
                    <!-- 語音按鈕 -->
                    <button onclick="playAudio('${item.w.replace(/'/g, "\\'")}', this, event)" class="p-2 sm:p-2 text-slate-400 hover:text-blue-500 dark:text-slate-500 dark:hover:text-slate-300 transition-colors active:scale-90 flex-shrink-0 mr-1 sm:mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
                    </button>
                </div>
            </td>
            
            <!-- 詞性與中文意思 -->
            <td class="py-4 sm:py-6 align-middle pr-2 sm:pr-4">
                <div class="flex flex-col sm:flex-row items-start sm:items-center gap-0.5 sm:gap-2 h-full justify-center sm:justify-start">
                    <span class="text-blue-500 dark:text-blue-500 font-medium italic text-[12px] sm:text-[14px] shrink-0">
                        (${item.p.replace(/[()]/g, '')})
                    </span>
                    <span class="text-slate-700 dark:text-slate-200 text-[13px] sm:text-[15px] tracking-wide leading-snug font-medium text-left">
                        ${item.m}
                    </span>
                </div>
            </td>
        </tr>
    `).join('');
}

function toggleGlobalRangeSelector() {
    const container = document.getElementById('global-range-selector-container');
    const btn = document.getElementById('global-range-btn');
    if (!container || !btn) return;
    const isHidden = container.classList.toggle('hidden');
    btn.classList.toggle('bg-blue-600', !isHidden);
    btn.classList.toggle('text-white', !isHidden);
    btn.classList.toggle('border-blue-600', !isHidden);
}

function switchTab(tab) {
    ['list', 'cards', 'quiz'].forEach(s => {
        document.getElementById(`section-${s}`).classList.add('hidden');
        document.getElementById(`tab-${s}`).className = 'flex-1 py-3 text-sm rounded-lg text-slate-600 hover:bg-slate-50 transition-all';
    });
    document.getElementById(`section-${tab}`).classList.remove('hidden');
    document.getElementById(`tab-${tab}`).className = 'flex-1 py-3 text-sm rounded-lg bg-blue-600 text-white shadow-sm transition-all';
    if (tab === 'quiz') showQuizSetup();
    if (tab === 'cards') setCardRange(cardState.range || 'all');
}

function setRangeActive(btnClass, idPrefix, range) {
    document.querySelectorAll(`.${btnClass}`).forEach(b => {
        b.className = `${btnClass} px-4 py-2 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm active:scale-95 transition-all`;
    });
    const btn = document.getElementById(`${idPrefix}${range}`);
    if (btn) btn.className = `${btnClass} px-5 py-2 text-xs font-bold rounded-lg border border-blue-300 bg-blue-100 text-blue-700 shadow-sm active:scale-95 transition-all`;
}

function setCardRange(range) {
    cardState.range = range;
    setRangeActive('range-btn-card', 'card-range-', range);
    cardState.activeList = getSubList(range);
    currentCardIdx = 0;
    document.getElementById('card-area').classList.remove('hidden');
    updateCard();
}

function handleCardClick(e) {
    // 如果點擊的是按鈕或 SVG 圖示，不要翻轉卡片
    if (!e.target.closest('button')) {
        document.getElementById('flashcard-inner').classList.toggle('flipped');
    }
}

function updateCard() {
    const card = cardState.activeList[currentCardIdx];
    if (!card) return;
    document.getElementById('flashcard-inner').classList.remove('flipped');
    setTimeout(() => {
        document.getElementById('card-word').textContent = card.w;
        document.getElementById('card-info').textContent = `(${card.p}) ${card.ph}`;
        document.getElementById('card-meaning').textContent = card.m;
        document.getElementById('card-progress').textContent = `${currentCardIdx + 1} / ${cardState.activeList.length}`;
    }, 150);
}

function nextCard() { currentCardIdx = (currentCardIdx + 1) % cardState.activeList.length; updateCard(); }
function prevCard() { currentCardIdx = (currentCardIdx - 1 + cardState.activeList.length) % cardState.activeList.length; updateCard(); }

const MODE_CONFIG = {
    'en-zh':      { name: '選擇題',  path: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
    'zh-en-type': { name: '拼字填空', path: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' }
};

function cycleQuizMode() {
    setQuizMode(quizState.mode === 'en-zh' ? 'zh-en-type' : 'en-zh');
}

function setQuizMode(mode) {
    quizState.mode = mode;
    const cfg = MODE_CONFIG[mode];
    const btn = document.getElementById('quiz-mode-btn');
    if (btn) btn.title = `切換模式：${cfg.name}`;
    const icon = document.getElementById('quiz-mode-icon');
    if (icon) icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="${cfg.path}"/>`;
    resetQuiz();
}

function setQuizRange(range) {
    quizState.range = range;
    setRangeActive('range-btn-quiz', 'btn-range-', range);
    resetQuiz();
}

function showQuizSetup() {
    // 此函數保留以相容原本程式碼的呼叫，但因面板已移除，改為只重設狀態
    document.getElementById('quiz-result').classList.add('hidden');
    document.getElementById('quiz-content').classList.remove('hidden');
    document.getElementById('next-quiz-btn').classList.add('hidden');
}

function resetQuiz() {
    quizState.score = 0;
    quizState.currentIdx = 0;
    const subList = getSubList(quizState.range);
    for (let i = subList.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [subList[i], subList[j]] = [subList[j], subList[i]];
    }
    quizState.activeList = subList;
    quizState.total = quizState.activeList.length;
    quizState.allMeanings = vocabData[currentDayKey].map(x => x.m);

    document.getElementById('quiz-content').classList.remove('hidden');
    document.getElementById('quiz-result').classList.add('hidden');

    startQuiz();
}

function startQuiz() {
    if (quizState.currentIdx >= quizState.total) { showQuizResult(); return; }
    quizState.isAnswered = false;
    quizState.targetWord = quizState.activeList[quizState.currentIdx];
    document.getElementById('next-quiz-btn').classList.add('hidden');
    document.getElementById('quiz-feedback').classList.add('hidden');
    document.getElementById('quiz-progress').textContent = `第 ${quizState.currentIdx + 1} / ${quizState.total} 題`;
    document.getElementById('quiz-score').textContent = `得分: ${Math.round(quizState.score)}`;
    if (quizState.mode === 'en-zh') setupMCQ(); else setupTyping();
}

function setupMCQ() {
    document.getElementById('quiz-options').classList.remove('hidden');
    document.getElementById('quiz-typing').classList.add('hidden');
    document.getElementById('quiz-question').innerHTML = `<span class="text-blue-600 text-3xl font-black tracking-tight w-full text-center block">${quizState.targetWord.w}</span>`;
    let options = [quizState.targetWord.m];
    const allMeanings = quizState.allMeanings;
    while (options.length < 4) {
        const rand = allMeanings[Math.floor(Math.random() * allMeanings.length)];
        if (!options.includes(rand)) options.push(rand);
    }
    options.sort(() => Math.random() - 0.5);

    // 使用 data-answer 避免引號造成的 JS 錯誤
    document.getElementById('quiz-options').innerHTML = options.map(opt => `
        <button data-answer="${opt.replace(/"/g, '&quot;')}" onclick="checkMCQAnswer(this)" class="mcq-btn w-full text-left p-5 rounded-xl border-2 border-slate-100 hover:border-blue-300 hover:bg-blue-50 transition-all font-bold text-slate-700 bg-white shadow-sm active:scale-[0.98]">${opt}</button>
    `).join('');
}

function setupTyping() {
    document.getElementById('quiz-options').classList.add('hidden');
    document.getElementById('quiz-typing').classList.remove('hidden');
    document.getElementById('quiz-question').innerHTML = `<div><p class="text-4xl font-black text-slate-800 leading-tight mb-1">${quizState.targetWord.m}</p><p class="text-sm text-slate-500 font-medium">${quizState.targetWord.p}</p></div>`;

    quizState.revealedPositions = [];
    quizState.hintPenalty = 0;

    const input = document.getElementById('typing-input');
    input.value = ""; input.disabled = false; input.focus();
    input.oninput = () => renderTiles(input.value, false);
    input.onkeydown = (e) => { if (e.key === 'Enter') checkTypingAnswer(); };

    const hintBtn = document.getElementById('hint-btn');
    hintBtn.disabled = false;
    hintBtn.classList.remove('opacity-40', 'pointer-events-none');

    renderTiles('', false);
}

function renderTiles(typed, submitted) {
    const word = quizState.targetWord.w;
    const tiles = document.getElementById('typing-tiles');
    tiles.innerHTML = word.split('').map((char, i) => {
        if (char === ' ') return `<div class="letter-tile tile-space"></div>`;
        const typedChar = typed[i] || '';
        const isHinted = quizState.revealedPositions && quizState.revealedPositions.includes(i);
        let cls = 'letter-tile', display = '';
        if (submitted) {
            const ok = normalize(typedChar) === normalize(char);
            cls += ok ? ' tile-correct' : ' tile-wrong';
            display = typedChar ? typedChar.toUpperCase() : '?';
        } else if (isHinted) {
            cls += ' tile-hint';
            display = char.toUpperCase();
        } else if (typedChar) {
            cls += ' tile-filled';
            display = typedChar.toUpperCase();
        }
        return `<div class="${cls}" style="animation-delay:${submitted ? i * 60 : 0}ms">${display}</div>`;
    }).join('');
}

function giveHint() {
    const word = quizState.targetWord.w;
    const unrevealed = [...word].reduce((acc, c, i) => {
        if (c !== ' ' && !quizState.revealedPositions.includes(i)) acc.push(i);
        return acc;
    }, []);
    if (unrevealed.length === 0) return;
    quizState.revealedPositions.push(unrevealed[0]);
    quizState.hintPenalty += 5;
    const input = document.getElementById('typing-input');
    renderTiles(input.value, false);
    if (unrevealed.length <= 1) {
        const btn = document.getElementById('hint-btn');
        btn.disabled = true;
        btn.classList.add('opacity-40', 'pointer-events-none');
    }
}

function checkMCQAnswer(btn) {
    if (quizState.isAnswered) return;
    quizState.isAnswered = true;
    const selected = btn.dataset.answer;
    const correct = quizState.targetWord.m;
    document.querySelectorAll('.mcq-btn').forEach(b => b.disabled = true);
    if (selected === correct) {
        btn.classList.replace('border-slate-100', 'border-green-500');
        btn.classList.add('bg-green-50', 'text-green-700');
        quizState.score += (100 / quizState.total);
    } else {
        btn.classList.replace('border-slate-100', 'border-red-500');
        btn.classList.add('bg-red-50', 'text-red-700');
        document.querySelectorAll('.mcq-btn').forEach(b => {
            if (b.dataset.answer === correct) {
                b.classList.replace('border-slate-100', 'border-green-500');
                b.classList.add('bg-green-50');
            }
        });
    }
    finishQuestion();
}

function showTypingFeedback(isCorrect, word) {
    const feedback = document.getElementById('quiz-feedback');
    feedback.classList.remove('hidden');
    const info = `<span class="text-xs text-slate-500 italic mt-1 inline-block">(${word.p}) ${word.ph}</span>`;
    if (isCorrect) {
        feedback.innerHTML = `✅ 答對了！<br>單字：<span class="font-bold text-lg">${word.w}</span> <br> ${info}`;
        feedback.className = "mt-4 p-5 rounded-xl text-base font-bold bg-green-50 text-green-700 border-2 border-green-200 shadow-sm";
    } else {
        feedback.innerHTML = `❌ 答錯了！<br>正確答案：<span class="font-bold text-lg text-red-700">${word.w}</span> <br> ${info}`;
        feedback.className = "mt-4 p-5 rounded-xl text-base font-bold bg-red-50 text-red-700 border-2 border-red-200 shadow-sm";
    }
}

function checkTypingAnswer() {
    if (quizState.isAnswered) return;
    const input = document.getElementById('typing-input');
    const userAnswer = input.value.trim();
    if (!userAnswer) return;
    quizState.isAnswered = true; input.disabled = true;

    renderTiles(userAnswer, true);

    // 忽略重音符號的寬容比對
    const isCorrect = normalize(userAnswer) === normalize(quizState.targetWord.w);
    const basePoints = 100 / quizState.total;
    if (isCorrect) quizState.score += Math.max(0, basePoints - quizState.hintPenalty);
    showTypingFeedback(isCorrect, quizState.targetWord);
    finishQuestion();
}

function finishQuestion() {
    quizState.currentIdx++;
    document.getElementById('quiz-score').textContent = `得分: ${Math.round(quizState.score)}`;
    const nextBtn = document.getElementById('next-quiz-btn');
    nextBtn.classList.remove('hidden');
    nextBtn.textContent = quizState.currentIdx === quizState.total ? "查看最終結算" : "下一題 ➔";
}

function showQuizResult() {
    document.getElementById('quiz-content').classList.add('hidden');
    document.getElementById('next-quiz-btn').classList.add('hidden');
    document.getElementById('result-day-label').textContent = `${currentDayKey} 測驗成績`;
    document.getElementById('result-score-display').textContent = Math.round(quizState.score);
    document.getElementById('quiz-result').classList.remove('hidden');
}

function toggleDaySelector() {
    const details = document.querySelector('details');
    if (details) details.open = !details.open;
}

function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('darkMode', isDark);
    document.getElementById('dark-mode-btn').textContent = isDark ? '☀️' : '🌙';
}

function toggleQuizSetup() {
    const body = document.getElementById('quiz-setup-body');
    const chevron = document.getElementById('quiz-setup-chevron');
    if (!body || !chevron) return;
    const isHidden = body.classList.toggle('hidden');
    chevron.style.transform = isHidden ? 'rotate(-90deg)' : '';
}

function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('darkMode', isDark);
    document.getElementById('dark-mode-btn').textContent = isDark ? '☀️' : '🌙';
}

window.onload = () => {
    if (localStorage.getItem('darkMode') === 'true') {
        document.documentElement.classList.add('dark');
        document.getElementById('dark-mode-btn').textContent = '☀️';
    }
    initDaySelector(); 
    updateRangeSelectors();
    setGlobalRange('all'); // 初始載入時，預設顯示全部範圍
};
