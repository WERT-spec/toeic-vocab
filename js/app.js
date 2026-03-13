const state = {
    dayKey: "Day 01",
    card: {
        range: 'all',
        idx: 0,
        activeList: [],
    },
    quiz: {
        currentIdx: 0,
        score: 0,
        total: 0,
        mode: 'en-zh',
        range: 'all',
        targetWord: null,
        isAnswered: false,
        activeList: [],
        allMeanings: [],
        revealedPositions: [],
        hintPenalty: 0,
    },
};

const MODE_CONFIG = {
    'en-zh':      { name: '選擇題',  path: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
    'zh-en-type': { name: '拼字填空', path: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' },
};

// --- 語音播放 (Web Speech API) ---

function playVocabAudio(type, btnElement, event) {
    if (event) event.stopPropagation();
    try {
        let text = '';
        if (type === 'card') {
            text = state.card.activeList[state.card.idx].w;
        } else if (type === 'quiz') {
            text = state.quiz.targetWord.w;
        }
        if (text) {
            // Remove accents for better TTS compatibility (e.g. résumé -> resume)
            const cleanText = text.normalize('NFD').replace(/[̀-ͯ]/g, '');
            playAudio(cleanText, btnElement, event);
        }
    } catch (e) {
        console.error('Audio playback error:', e);
    }
}

function normalize(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}


// Global reference to prevent garbage collection bugs in some browsers
let currentUtterance = null;
function playAudio(text, btnElement, event) {
    if (event) event.stopPropagation();
    if (!window.speechSynthesis) {
        console.warn('speechSynthesis not supported');
        return;
    }

    // Force resume and cancel previous
    window.speechSynthesis.resume();
    window.speechSynthesis.cancel();

    if (btnElement) {
        btnElement.classList.add('is-speaking');
        // Fallback cleanup
        setTimeout(() => btnElement.classList.remove('is-speaking'), 3000);
    }

    // Normalize text (remove accents) for better TTS compatibility
    const normalizedText = text.normalize('NFD').replace(/[̀-ͯ]/g, '');
    
    currentUtterance = new SpeechSynthesisUtterance(normalizedText);
    currentUtterance.lang = 'en-US';
    currentUtterance.rate = 0.9;
    currentUtterance.volume = 1.0;
    
    currentUtterance.onstart = () => console.log('TTS started:', normalizedText);
    currentUtterance.onend = () => {
        console.log('TTS ended');
        if (btnElement) btnElement.classList.remove('is-speaking');
    };
    currentUtterance.onerror = (e) => {
        console.error('TTS Error:', e);
        if (btnElement) btnElement.classList.remove('is-speaking');
    };

    // Chrome Bug Fix: sometimes speak() needs to be wrapped in a timeout
    // and voices need to be loaded.
    setTimeout(() => {
        window.speechSynthesis.speak(currentUtterance);
    }, 50);
}

function getSubList(range) {
    if (range === 'all') return [...vocabData[state.dayKey]];
    const [start, end] = range.split('-').map(Number);
    return vocabData[state.dayKey].slice(start - 1, end);
}

// --- 天次選擇 ---
function initDaySelector() {
    const grid = document.getElementById('day-grid');
    const buttons = [];
    for (let i = 1; i <= 30; i++) {
        const dayKey = `Day ${i < 10 ? '0' + i : i}`;
        const hasData = !!vocabData[dayKey];
        buttons.push(`
            <button onclick="changeDay('${dayKey}')"
                class="py-2.5 text-[11px] font-bold rounded-lg border ${hasData ? 'border-slate-200 bg-white text-slate-700 shadow-sm active:scale-95 hover:bg-slate-50' : 'border-slate-100 bg-slate-50 text-slate-300 pointer-events-none'} transition-all ${dayKey === state.dayKey ? 'active-day' : ''}">
                D${i}
            </button>`);
    }
    grid.innerHTML = buttons.join('');
}

function changeDay(day) {
    state.dayKey = day;
    const num = day.replace('Day ', '');
    document.getElementById('day-label').textContent = `DAY ${num}`;
    initDaySelector();
    updateRangeSelectors();
    setGlobalRange('all');
    const dropdown = document.getElementById('day-selector-dropdown'); if (dropdown) dropdown.classList.remove('open');
}

// --- 範圍選擇器 ---
function updateRangeSelectors() {
    const wordCount = vocabData[state.dayKey].length;
    const cardSel = document.getElementById('card-range-selector');
    const quizSel = document.getElementById('quiz-range-selector');
    const globalSel = document.getElementById('global-range-selector');

    let cardButtons = '';
    let quizButtons = '';
    let globalButtons = '';

    for (let i = 0; i < wordCount; i += 10) {
        const rangeText = `${i + 1}-${Math.min(i + 10, wordCount)}`;
        cardButtons   += `<button onclick="setCardRange('${rangeText}')" id="card-range-${rangeText}" class="range-btn-card px-4 py-2 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm active:scale-95 transition-all">${rangeText}</button>`;
        quizButtons   += `<button onclick="setQuizRange('${rangeText}')" id="btn-range-${rangeText}" class="range-btn-quiz w-full py-2 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm active:scale-95 transition-all">${rangeText}</button>`;
        globalButtons += `<button onclick="setGlobalRange('${rangeText}')" id="global-range-${rangeText}" class="range-btn-global px-4 py-2 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm active:scale-95 transition-all">${rangeText}</button>`;
    }

    cardButtons   += `<button onclick="setCardRange('all')" id="card-range-all" class="range-btn-card px-5 py-2 text-xs font-bold rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-600 shadow-sm active:scale-95 transition-all">全部</button>`;
    quizButtons   += `<button onclick="setQuizRange('all')" id="btn-range-all" class="range-btn-quiz w-full py-2 text-xs font-bold rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-600 shadow-sm active:scale-95 transition-all">全部</button>`;
    globalButtons += `<button onclick="setGlobalRange('all')" id="global-range-all" class="range-btn-global px-5 py-2 text-xs font-bold rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-600 shadow-sm active:scale-95 transition-all">全部</button>`;

    if (cardSel)   cardSel.innerHTML   = cardButtons;
    if (quizSel)   quizSel.innerHTML   = quizButtons;
    if (globalSel) globalSel.innerHTML = globalButtons;

    setRangeActive('range-btn-global', 'global-range-', state.card.range || 'all');
}

function setGlobalRange(range) {
    state.card.range      = range;
    state.card.activeList = getSubList(range);
    state.card.idx        = 0;
    state.quiz.range      = range;

    setRangeActive('range-btn-global', 'global-range-', range);
    setRangeActive('range-btn-card',   'card-range-',   range);
    setRangeActive('range-btn-quiz',   'btn-range-',    range);

    initTable(range);

    if (!document.getElementById('section-cards').classList.contains('hidden')) {
        document.getElementById('card-area').classList.remove('hidden');
        updateCard();
    }

    if (!document.getElementById('section-quiz').classList.contains('hidden')) {
        resetQuiz();
    }

    // 關閉選單（只在已開啟時才關）
    const container = document.getElementById('global-range-selector-container');
    const btn = document.getElementById('global-range-btn');
    if (container && !container.classList.contains('hidden')) {
        container.classList.add('hidden');
        btn.classList.remove('bg-indigo-600', 'text-white', 'border-indigo-600');
    }
}

// --- 單字列表 ---
function initTable(range = 'all') {
    const tbody = document.getElementById('vocab-table-body');
    const displayList = getSubList(range);
    const startIdx = range === 'all' ? 0 : parseInt(range.split('-')[0]) - 1;

    tbody.innerHTML = displayList.map((item, idx) => `
        <tr class="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition group">
            <td class="py-6 font-mono text-slate-400 dark:text-slate-500 text-xs sm:text-sm text-center align-middle pl-2">
                ${startIdx + idx + 1}
            </td>
            <td class="py-4 sm:py-6 align-middle pr-2 sm:pr-4 pl-2">
                <div class="flex items-center justify-between">
                    <div class="flex-1 pr-1">
                        <div class="font-bold text-slate-800 dark:text-indigo-400 text-base sm:text-lg tracking-widest leading-tight break-all">${item.w}</div>
                        <div class="text-[11px] sm:text-[13px] text-slate-500 dark:text-slate-500 font-mono mt-1 tracking-widest break-all leading-tight">
                            [ ${item.ph.replace(/[\/\[\]]/g, '')} ]
                        </div>
                    </div>
                    <button onclick="playAudio('${item.w.replace(/'/g, "\\'")}', this, event)" class="p-2 sm:p-2 text-slate-400 hover:text-indigo-500 dark:text-slate-500 dark:hover:text-slate-300 transition-colors active:scale-90 flex-shrink-0 mr-1 sm:mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
                    </button>
                </div>
            </td>
            <td class="py-4 sm:py-6 align-middle pr-2 sm:pr-4">
                <div class="flex flex-col sm:flex-row items-start sm:items-center gap-0.5 sm:gap-2 h-full justify-center sm:justify-start">
                    <span class="text-indigo-500 dark:text-indigo-500 font-medium italic text-[12px] sm:text-[14px] shrink-0">
                        (${item.p.replace(/[()]/g, '')})
                    </span>
                    <span class="text-slate-700 dark:text-slate-200 text-[13px] sm:text-[15px] tracking-widest leading-snug font-medium text-left">
                        ${item.m}
                    </span>
                </div>
            </td>
        </tr>
    `).join('');
}

// --- 全域選單 ---
function toggleGlobalRangeSelector() {
    const container = document.getElementById('global-range-selector-container');
    const btn = document.getElementById('global-range-btn');
    if (!container || !btn) return;
    const isHidden = container.classList.toggle('hidden');
    btn.classList.toggle('bg-indigo-600', !isHidden);
    btn.classList.toggle('text-white', !isHidden);
    btn.classList.toggle('border-indigo-600', !isHidden);
}

// --- 分頁切換 ---

function switchTab(tab) {
    ['list', 'cards', 'quiz'].forEach(s => {
        document.getElementById('section-' + s).classList.add('hidden');
        
        const btn = document.getElementById('tab-' + s);
        if (btn) {
            btn.classList.remove('text-indigo-600', 'dark:text-indigo-400');
            btn.classList.add('text-slate-400', 'dark:text-slate-500');
            btn.style.transform = 'scale(1)';
        }
    });
    
    document.getElementById('section-' + tab).classList.remove('hidden');
    
    const activeBtn = document.getElementById('tab-' + tab);
    if (activeBtn) {
        activeBtn.classList.remove('text-slate-400', 'dark:text-slate-500');
        activeBtn.classList.add('text-indigo-600', 'dark:text-indigo-400');
        activeBtn.style.transform = 'scale(1.1)';
        activeBtn.classList.add('animate-pop');
        setTimeout(() => activeBtn.classList.remove('animate-pop'), 400);
    }
    
    if (tab === 'quiz')  showQuizSetup();
    if (tab === 'cards') setCardRange(state.card.range || 'all');
}

function setRangeActive(btnClass, idPrefix, range) {
    document.querySelectorAll(`.${btnClass}`).forEach(b => {
        b.className = `${btnClass} px-4 py-2 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm active:scale-95 transition-all`;
    });
    const btn = document.getElementById(`${idPrefix}${range}`);
    if (btn) btn.className = `${btnClass} px-5 py-2 text-xs font-bold rounded-lg border border-indigo-300 bg-indigo-100 text-indigo-700 shadow-sm active:scale-95 transition-all`;
}

// --- 字卡模式 ---
function setCardRange(range) {
    state.card.range      = range;
    state.card.activeList = getSubList(range);
    state.card.idx        = 0;
    setRangeActive('range-btn-card', 'card-range-', range);
    document.getElementById('card-area').classList.remove('hidden');
    updateCard();
}

function handleCardClick(e) {
    if (!e.target.closest('button')) {
        document.getElementById('flashcard-inner').classList.toggle('flipped');
    }
}

function updateCard() {
    const card = state.card.activeList[state.card.idx];
    if (!card) return;
    document.getElementById('flashcard-inner').classList.remove('flipped');
    setTimeout(() => {
        document.getElementById('card-word').textContent = card.w;
        document.getElementById('card-info').textContent = `(${card.p}) ${card.ph}`;
        document.getElementById('card-meaning').textContent = card.m;
        document.getElementById('card-progress').textContent = `${state.card.idx + 1} / ${state.card.activeList.length}`;
    }, 150);
}

function nextCard() { state.card.idx = (state.card.idx + 1) % state.card.activeList.length; updateCard(); }
function prevCard() { state.card.idx = (state.card.idx - 1 + state.card.activeList.length) % state.card.activeList.length; updateCard(); }

// --- 測驗模式 ---
function cycleQuizMode() {
    setQuizMode(state.quiz.mode === 'en-zh' ? 'zh-en-type' : 'en-zh');
}

function setQuizMode(mode) {
    state.quiz.mode = mode;
    const cfg = MODE_CONFIG[mode];
    const btn = document.getElementById('quiz-mode-btn');
    if (btn) btn.title = `切換模式：${cfg.name}`;
    const icon = document.getElementById('quiz-mode-icon');
    if (icon) icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="${cfg.path}"/>`;
    resetQuiz();
}

function setQuizRange(range) {
    state.quiz.range = range;
    setRangeActive('range-btn-quiz', 'btn-range-', range);
    resetQuiz();
}

function showQuizSetup() {
    document.getElementById('quiz-result').classList.add('hidden');
    document.getElementById('quiz-content').classList.remove('hidden');
    document.getElementById('next-quiz-btn').classList.add('hidden');
}

function resetQuiz() {
    state.quiz.score      = 0;
    state.quiz.currentIdx = 0;

    const subList = getSubList(state.quiz.range);
    for (let i = subList.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [subList[i], subList[j]] = [subList[j], subList[i]];
    }
    state.quiz.activeList  = subList;
    state.quiz.total       = subList.length;
    state.quiz.allMeanings = vocabData[state.dayKey].map(x => x.m);

    document.getElementById('quiz-content').classList.remove('hidden');
    document.getElementById('quiz-result').classList.add('hidden');

    startQuiz();
}

function startQuiz() {
    if (state.quiz.currentIdx >= state.quiz.total) { showQuizResult(); return; }
    state.quiz.isAnswered = false;
    state.quiz.targetWord = state.quiz.activeList[state.quiz.currentIdx];
    document.getElementById('next-quiz-btn').classList.add('hidden');
    document.getElementById('quiz-feedback').classList.add('hidden');
    document.getElementById('quiz-progress').textContent = `第 ${state.quiz.currentIdx + 1} / ${state.quiz.total} 題`;
    document.getElementById('quiz-score').textContent = `得分: ${Math.round(state.quiz.score)}`;
    if (state.quiz.mode === 'en-zh') setupMCQ(); else setupTyping();
}

function setupMCQ() {
    document.getElementById('quiz-options').classList.remove('hidden');
    document.getElementById('quiz-typing').classList.add('hidden');
    document.getElementById('quiz-question').innerHTML = `<span class="text-indigo-600 text-3xl font-black tracking-tight w-full text-center block">${state.quiz.targetWord.w}</span>`;

    let options = [state.quiz.targetWord.m];
    const allMeanings = state.quiz.allMeanings;
    while (options.length < 4) {
        const rand = allMeanings[Math.floor(Math.random() * allMeanings.length)];
        if (!options.includes(rand)) options.push(rand);
    }
    options.sort(() => Math.random() - 0.5);

    document.getElementById('quiz-options').innerHTML = options.map(opt => `
        <button data-answer="${opt.replace(/"/g, '&quot;')}" onclick="checkMCQAnswer(this)" class="mcq-btn w-full text-left p-5 rounded-xl border-2 border-slate-100 hover:border-indigo-300 hover:bg-indigo-50 transition-all font-bold text-slate-700 bg-white shadow-sm active:scale-[0.98]">${opt}</button>
    `).join('');
}

function setupTyping() {
    document.getElementById('quiz-options').classList.add('hidden');
    document.getElementById('quiz-typing').classList.remove('hidden');
    document.getElementById('quiz-question').innerHTML = `<div><p class="text-4xl font-black text-slate-800 leading-tight mb-1">${state.quiz.targetWord.m}</p><p class="text-sm text-slate-500 font-medium">${state.quiz.targetWord.p}</p></div>`;

    state.quiz.revealedPositions = [];
    state.quiz.hintPenalty       = 0;

    const input = document.getElementById('typing-input');
    input.value = ""; input.disabled = false; input.focus();
    input.oninput  = () => renderTiles(input.value, false);
    input.onkeydown = (e) => { if (e.key === 'Enter') checkTypingAnswer(); };

    const hintBtn = document.getElementById('hint-btn');
    hintBtn.disabled = false;
    hintBtn.classList.remove('opacity-40', 'pointer-events-none');

    renderTiles('', false);
}

function renderTiles(typed, submitted) {
    const word  = state.quiz.targetWord.w;
    const tiles = document.getElementById('typing-tiles');
    tiles.innerHTML = word.split('').map((char, i) => {
        if (char === ' ') return `<div class="letter-tile tile-space"></div>`;
        const typedChar = typed[i] || '';
        const isHinted  = state.quiz.revealedPositions.includes(i);
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
    const word = state.quiz.targetWord.w;
    const unrevealed = [...word].reduce((acc, c, i) => {
        if (c !== ' ' && !state.quiz.revealedPositions.includes(i)) acc.push(i);
        return acc;
    }, []);
    if (unrevealed.length === 0) return;
    state.quiz.revealedPositions.push(unrevealed[0]);
    state.quiz.hintPenalty += 5;
    const input = document.getElementById('typing-input');
    renderTiles(input.value, false);
    if (unrevealed.length <= 1) {
        const btn = document.getElementById('hint-btn');
        btn.disabled = true;
        btn.classList.add('opacity-40', 'pointer-events-none');
    }
}

function checkMCQAnswer(btn) {
    if (state.quiz.isAnswered) return;
    state.quiz.isAnswered = true;
    const selected = btn.dataset.answer;
    const correct  = state.quiz.targetWord.m;
    document.querySelectorAll('.mcq-btn').forEach(b => b.disabled = true);
    if (selected === correct) {
        btn.classList.replace('border-slate-100', 'border-green-500');
        btn.classList.add('bg-green-50', 'text-green-700', 'animate-pop');
        state.quiz.score += (100 / state.quiz.total);
    } else {
        btn.classList.replace('border-slate-100', 'border-red-500');
        btn.classList.add('bg-red-50', 'text-red-700', 'animate-shake');
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
    if (state.quiz.isAnswered) return;
    const input = document.getElementById('typing-input');
    const userAnswer = input.value.trim();
    if (!userAnswer) return;
    state.quiz.isAnswered = true; input.disabled = true;

    renderTiles(userAnswer, true);

    const isCorrect  = normalize(userAnswer) === normalize(state.quiz.targetWord.w);
    const basePoints = 100 / state.quiz.total;
    if (isCorrect) state.quiz.score += Math.max(0, basePoints - state.quiz.hintPenalty);
    showTypingFeedback(isCorrect, state.quiz.targetWord);
    finishQuestion();
}

function finishQuestion() {
    state.quiz.currentIdx++;
    document.getElementById('quiz-score').textContent = `得分: ${Math.round(state.quiz.score)}`;
    const nextBtn = document.getElementById('next-quiz-btn');
    nextBtn.classList.remove('hidden');
    nextBtn.textContent = state.quiz.currentIdx === state.quiz.total ? "查看最終結算" : "下一題 ➔";
}

function showQuizResult() {
    document.getElementById('quiz-content').classList.add('hidden');
    document.getElementById('next-quiz-btn').classList.add('hidden');
    document.getElementById('result-day-label').textContent = `${state.dayKey} 測驗成績`;
    document.getElementById('result-score-display').textContent = Math.round(state.quiz.score);
    document.getElementById('quiz-result').classList.remove('hidden');
}

// --- 其他 UI ---
function toggleDaySelector() {
    const dropdown = document.getElementById('day-selector-dropdown');
    if (dropdown) dropdown.classList.toggle('open');
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
    setGlobalRange('all');
};
