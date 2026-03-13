// ===== STATE =====
const state = {
    activeScreen: 'home',
    studySubTab: 'cards',
    dayKey: 'Day 01',
    range: 'all',
    card: { idx: 0, activeList: [] },
    quiz: {
        phase: 'setup',       // 'setup' | 'active' | 'results'
        mode: 'en-zh',
        currentIdx: 0,
        score: 0,
        total: 0,
        activeList: [],
        allMeanings: [],
        targetWord: null,
        isAnswered: false,
        revealedPositions: [],
        hintPenalty: 0,
        log: [],              // { word, isCorrect, userAnswer, pointsEarned }
    },
};

// ===== LOCALSTORAGE HELPERS =====

function loadPrefs() {
    try {
        const p = JSON.parse(localStorage.getItem('toeic_v2_prefs') || '{}');
        if (p.darkMode) { document.documentElement.classList.add('dark'); syncDarkBtns(true); }
        if (p.lastDayKey && vocabData[p.lastDayKey]) state.dayKey = p.lastDayKey;
        if (p.lastRange) state.range = p.lastRange;
        if (p.defaultQuizMode) state.quiz.mode = p.defaultQuizMode;
    } catch(e) {}
}

function savePrefs() {
    try {
        localStorage.setItem('toeic_v2_prefs', JSON.stringify({
            darkMode: document.documentElement.classList.contains('dark'),
            lastDayKey: state.dayKey,
            lastRange: state.range,
            defaultQuizMode: state.quiz.mode,
        }));
    } catch(e) {}
}

function loadProgress() {
    try { return JSON.parse(localStorage.getItem('toeic_v2_progress') || '{}'); } catch(e) { return {}; }
}

function saveProgress(dayKey, patch) {
    try {
        const all = loadProgress();
        all[dayKey] = Object.assign(all[dayKey] || {}, patch);
        localStorage.setItem('toeic_v2_progress', JSON.stringify(all));
    } catch(e) {}
}

function loadHistory() {
    try { return JSON.parse(localStorage.getItem('toeic_v2_history') || '[]'); } catch(e) { return []; }
}

function saveHistory(entry) {
    try {
        const h = loadHistory();
        h.unshift(entry);
        localStorage.setItem('toeic_v2_history', JSON.stringify(h.slice(0, 100)));
    } catch(e) {}
}

function getWeakWords() {
    try { return JSON.parse(localStorage.getItem('toeic_v2_weakwords') || '[]'); } catch(e) { return []; }
}

function updateWeakWords(log) {
    try {
        const weak = new Set(getWeakWords());
        log.forEach(e => { if (!e.isCorrect) weak.add(e.word.w); });
        localStorage.setItem('toeic_v2_weakwords', JSON.stringify([...weak]));
    } catch(e) {}
}

function getMeta() {
    try { return JSON.parse(localStorage.getItem('toeic_v2_meta') || '{}'); } catch(e) { return {}; }
}

function updateStreak() {
    try {
        const meta = getMeta();
        const today = new Date().toISOString().slice(0, 10);
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        if (meta.lastStreakDate === today) return;
        meta.streakDays = (meta.lastStreakDate === yesterday) ? (meta.streakDays || 0) + 1 : 1;
        meta.lastStreakDate = today;
        localStorage.setItem('toeic_v2_meta', JSON.stringify(meta));
    } catch(e) {}
}

// ===== AUDIO =====

let currentUtterance = null;

function playVocabAudio(type, btnElement, event) {
    if (event) event.stopPropagation();
    try {
        let text = '';
        if (type === 'card') text = state.card.activeList[state.card.idx].w;
        else if (type === 'quiz') text = state.quiz.targetWord.w;
        else if (typeof type === 'string' && type.length > 3) text = type; // direct word
        if (text) playAudio(text.normalize('NFD').replace(/[̀-ͯ]/g, ''), btnElement, event);
    } catch(e) { console.error('Audio error:', e); }
}

function normalize(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function playAudio(text, btnElement, event) {
    if (event) event.stopPropagation();
    if (!window.speechSynthesis) return;
    window.speechSynthesis.resume();
    window.speechSynthesis.cancel();
    if (btnElement) {
        btnElement.classList.add('is-speaking');
        setTimeout(() => btnElement.classList.remove('is-speaking'), 3000);
    }
    const normalizedText = text.normalize('NFD').replace(/[̀-ͯ]/g, '');
    currentUtterance = new SpeechSynthesisUtterance(normalizedText);
    currentUtterance.lang = 'en-US';
    currentUtterance.rate = 0.9;
    currentUtterance.volume = 1.0;
    currentUtterance.onend = () => { if (btnElement) btnElement.classList.remove('is-speaking'); };
    currentUtterance.onerror = () => { if (btnElement) btnElement.classList.remove('is-speaking'); };
    setTimeout(() => window.speechSynthesis.speak(currentUtterance), 50);
}

// ===== NAVIGATION =====

function switchScreen(screenName) {
    const screens = ['home', 'study', 'quiz', 'stats'];
    const prevScreen = state.activeScreen;
    screens.forEach(s => {
        const el = document.getElementById('screen-' + s);
        el.classList.add('hidden');
        el.classList.remove('screen-enter', 'screen-enter-left');
        const tab = document.getElementById('tab-' + s);
        if (tab) tab.classList.remove('tab-btn-active');
    });
    const el = document.getElementById('screen-' + screenName);
    el.classList.remove('hidden');
    // Slide direction: home always slides left, going to home from child slides right
    const order = { home: 0, study: 1, quiz: 2, stats: 3 };
    const isGoingBack = order[screenName] < order[prevScreen];
    el.classList.add(isGoingBack ? 'screen-enter-left' : 'screen-enter');
    setTimeout(() => el.classList.remove('screen-enter', 'screen-enter-left'), 300);

    const tab = document.getElementById('tab-' + screenName);
    if (tab) tab.classList.add('tab-btn-active');

    state.activeScreen = screenName;
    if (screenName === 'home')  renderHomeScreen();
    if (screenName === 'study') renderStudyScreen();
    if (screenName === 'quiz')  renderQuizSetup();
    if (screenName === 'stats') renderStatsScreen();
    savePrefs();
}

function goStudy() { switchScreen('study'); }
function goQuiz()  { switchScreen('quiz'); }

// ===== DARK MODE =====

function syncDarkBtns(isDark) {
    ['dark-mode-btn', 'dark-mode-btn-study', 'dark-mode-btn-quiz', 'dark-mode-btn-stats'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = isDark ? '☀️' : '🌙';
    });
}

function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    syncDarkBtns(isDark);
    savePrefs();
}

// ===== RANGE =====

function getSubList(range, dayKey) {
    const key = dayKey || state.dayKey;
    if (!vocabData[key]) return [];
    if (range === 'all') return [...vocabData[key]];
    const [start, end] = range.split('-').map(Number);
    return vocabData[key].slice(start - 1, end);
}

function setRange(range) {
    state.range = range;
    state.card.activeList = getSubList(range);
    state.card.idx = 0;
    renderRangePills('study-range-pills', range, 'setRange');
    renderRangePills('quiz-range-pills', range, 'setRange');
    if (state.activeScreen === 'study') {
        if (state.studySubTab === 'cards') updateCard();
        else initTable();
    }
    savePrefs();
}

function renderRangePills(containerId, activeRange, callbackName) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const words = vocabData[state.dayKey] || [];
    const count = words.length;
    let html = `<button onclick="${callbackName}('all')" class="range-pill ${activeRange === 'all' ? 'range-pill-active' : ''}">全部</button>`;
    for (let i = 0; i < count; i += 10) {
        const rangeText = `${i + 1}-${Math.min(i + 10, count)}`;
        html += `<button onclick="${callbackName}('${rangeText}')" class="range-pill ${activeRange === rangeText ? 'range-pill-active' : ''}">${rangeText}</button>`;
    }
    container.innerHTML = html;
}

// ===== HOME SCREEN =====

function renderHomeScreen() {
    const progress = loadProgress();
    const meta = getMeta();
    const grid = document.getElementById('day-grid');

    // Streak
    const streakEl = document.getElementById('streak-display');
    if (streakEl && meta.streakDays > 0) {
        streakEl.textContent = `🔥 連續學習 ${meta.streakDays} 天`;
    }

    // Day grid
    let html = '';
    for (let i = 1; i <= 30; i++) {
        const dayKey = `Day ${i < 10 ? '0' + i : i}`;
        const hasData = !!vocabData[dayKey];
        const prog = progress[dayKey] || {};
        const bestScore = prog.quizBestScore || 0;
        const isSelected = dayKey === state.dayKey;
        const isHigh = bestScore >= 80;
        const ringPct = bestScore / 100;
        const circumference = 2 * Math.PI * 12; // r=12
        const dashOffset = circumference * (1 - ringPct);

        if (hasData) {
            html += `
            <button onclick="selectDay('${dayKey}')" class="day-cell has-data relative flex flex-col items-center py-2.5 rounded-xl border ${isSelected ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30' : isHigh ? 'border-green-300 bg-green-50 dark:bg-green-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'} active:scale-95 transition-all">
                <svg width="28" height="28" viewBox="0 0 28 28" class="mb-0.5">
                    <circle cx="14" cy="14" r="12" fill="none" stroke="${isSelected ? '#c7d2fe' : '#e2e8f0'}" stroke-width="2.5"/>
                    ${bestScore > 0 ? `<circle cx="14" cy="14" r="12" fill="none" stroke="${isHigh ? '#22c55e' : '#6366f1'}" stroke-width="2.5" stroke-dasharray="${circumference}" stroke-dashoffset="${dashOffset}" class="progress-ring-circle"/>` : ''}
                </svg>
                <span class="text-[10px] font-bold ${isSelected ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-300'}">D${i}</span>
            </button>`;
        } else {
            html += `<div class="day-cell flex flex-col items-center py-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 opacity-40"><svg width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="12" fill="none" stroke="#e2e8f0" stroke-width="2.5"/></svg><span class="text-[10px] font-bold text-slate-300">D${i}</span></div>`;
        }
    }
    grid.innerHTML = html;

    // Show panel for selected day
    renderDayPanel(state.dayKey);
}

function renderDayPanel(dayKey) {
    const panel = document.getElementById('day-panel');
    if (!vocabData[dayKey]) { panel.classList.add('hidden'); return; }
    const progress = loadProgress();
    const prog = progress[dayKey] || {};
    const num = dayKey.replace('Day ', '');
    document.getElementById('panel-day-label').textContent = `DAY ${num}`;
    document.getElementById('panel-word-count').textContent = `共 ${vocabData[dayKey].length} 個單字`;
    const scoreEl = document.getElementById('panel-best-score');
    if (prog.quizBestScore) {
        const color = prog.quizBestScore >= 80 ? 'text-green-600' : prog.quizBestScore >= 60 ? 'text-amber-600' : 'text-red-500';
        scoreEl.innerHTML = `<div class="text-xs text-slate-400 mb-0.5">最佳成績</div><div class="text-2xl font-black ${color}">${prog.quizBestScore}</div>`;
    } else {
        scoreEl.innerHTML = `<div class="text-xs text-slate-400">尚未測驗</div>`;
    }
    panel.classList.remove('hidden');
}

function selectDay(dayKey) {
    if (!vocabData[dayKey]) return;
    state.dayKey = dayKey;
    state.range = 'all';
    state.card.idx = 0;
    state.card.activeList = getSubList('all');
    renderDayPanel(dayKey);
    // Update selected state in grid
    document.querySelectorAll('.day-cell.has-data').forEach(el => {
        el.classList.remove('border-indigo-400', 'bg-indigo-50', 'dark:bg-indigo-900/30');
        el.classList.add('border-slate-200', 'dark:border-slate-700', 'bg-white', 'dark:bg-slate-800');
        el.querySelector('span').className = 'text-[10px] font-bold text-slate-600 dark:text-slate-300';
    });
    // Can't easily target just this button, so re-render grid
    renderHomeScreen();
    savePrefs();
}

// ===== STUDY SCREEN =====

function renderStudyScreen() {
    // Only reset activeList if not a "review missed words" override
    if (!state._reviewOverride) state.card.activeList = getSubList(state.range);
    state._reviewOverride = false;
    const num = state.dayKey.replace('Day ', '');
    document.getElementById('study-day-label').textContent = `DAY ${num}`;

    renderRangePills('study-range-pills', state.range, 'setRange');
    switchStudySubTab(state.studySubTab);

    // Show quiz CTA if has history
    const progress = loadProgress();
    const prog = progress[state.dayKey] || {};
    const cta = document.getElementById('study-quiz-cta');
    if (prog.quizAttempts > 0) cta.classList.remove('hidden');
    else cta.classList.add('hidden');

    updateStreak();
    saveProgress(state.dayKey, { studiedAt: new Date().toISOString().slice(0, 10) });
}

function switchStudySubTab(subTab) {
    state.studySubTab = subTab;
    const cardsView = document.getElementById('study-cards-view');
    const listView  = document.getElementById('study-list-view');
    const tabCards  = document.getElementById('study-tab-cards');
    const tabList   = document.getElementById('study-tab-list');

    if (subTab === 'cards') {
        cardsView.classList.remove('hidden');
        listView.classList.add('hidden');
        tabCards.classList.add('study-sub-tab-active');
        tabList.classList.remove('study-sub-tab-active');
        updateCard();
    } else {
        cardsView.classList.add('hidden');
        listView.classList.remove('hidden');
        tabCards.classList.remove('study-sub-tab-active');
        tabList.classList.add('study-sub-tab-active');
        initTable();
    }
}

// ===== FLASHCARD =====

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
    // Save card position
    saveProgress(state.dayKey, { cardIdx: state.card.idx });
}

function nextCard() {
    state.card.idx = (state.card.idx + 1) % state.card.activeList.length;
    updateCard();
}

function prevCard() {
    state.card.idx = (state.card.idx - 1 + state.card.activeList.length) % state.card.activeList.length;
    updateCard();
}

// ===== WORD LIST =====

function initTable() {
    const tbody = document.getElementById('vocab-table-body');
    const displayList = getSubList(state.range);
    const startIdx = state.range === 'all' ? 0 : parseInt(state.range.split('-')[0]) - 1;
    tbody.innerHTML = displayList.map((item, idx) => `
        <tr class="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition group">
            <td class="py-6 font-mono text-slate-400 dark:text-slate-500 text-xs sm:text-sm text-center align-middle pl-2">${startIdx + idx + 1}</td>
            <td class="py-4 sm:py-6 align-middle pr-2 sm:pr-4 pl-2">
                <div class="flex items-center justify-between">
                    <div class="flex-1 pr-1">
                        <div class="font-bold text-slate-800 dark:text-indigo-400 text-base sm:text-lg tracking-widest leading-tight break-all">${item.w}</div>
                        <div class="text-[11px] sm:text-[13px] text-slate-500 dark:text-slate-500 font-mono mt-1 tracking-widest break-all leading-tight">[ ${item.ph.replace(/[\/\[\]]/g, '')} ]</div>
                    </div>
                    <button onclick="playAudio('${item.w.replace(/'/g, "\\'")}', this, event)" class="p-2 sm:p-2 text-slate-400 hover:text-indigo-500 dark:text-slate-500 dark:hover:text-slate-300 transition-colors active:scale-90 flex-shrink-0 mr-1 sm:mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
                    </button>
                </div>
            </td>
            <td class="py-4 sm:py-6 align-middle pr-2 sm:pr-4">
                <div class="flex flex-col sm:flex-row items-start sm:items-center gap-0.5 sm:gap-2 h-full justify-center sm:justify-start">
                    <span class="text-indigo-500 dark:text-indigo-500 font-medium italic text-[12px] sm:text-[14px] shrink-0">(${item.p.replace(/[()]/g, '')})</span>
                    <span class="text-slate-700 dark:text-slate-200 text-[13px] sm:text-[15px] tracking-widest leading-snug font-medium text-left">${item.m}</span>
                </div>
            </td>
        </tr>
    `).join('');
}

// ===== QUIZ SETUP =====

function renderQuizSetup() {
    document.getElementById('quiz-setup').classList.remove('hidden');
    document.getElementById('quiz-active').classList.add('hidden');
    document.getElementById('quiz-results').classList.add('hidden');
    state.quiz.phase = 'setup';

    const num = state.dayKey.replace('Day ', '');
    document.getElementById('quiz-setup-day-label').textContent = `DAY ${num}`;

    renderRangePills('quiz-range-pills', state.range, 'setRange');
    selectQuizMode(state.quiz.mode);

    // Show last score
    const progress = loadProgress();
    const prog = progress[state.dayKey] || {};
    const lastScoreEl = document.getElementById('quiz-last-score');
    if (prog.quizBestScore) {
        lastScoreEl.textContent = `上次最佳：${prog.quizBestScore} 分（共 ${prog.quizAttempts} 次測驗）`;
        lastScoreEl.classList.remove('hidden');
    } else {
        lastScoreEl.classList.add('hidden');
    }
}

function selectQuizMode(mode) {
    state.quiz.mode = mode;
    ['en-zh', 'zh-en-type'].forEach(m => {
        const card = document.getElementById('mode-card-' + m);
        if (!card) return;
        card.classList.remove('quiz-mode-card-selected', 'border-indigo-400', 'bg-indigo-50', 'dark:bg-indigo-900/30');
        card.classList.add('border-slate-200', 'dark:border-slate-700');
    });
    const selected = document.getElementById('mode-card-' + mode);
    if (selected) {
        selected.classList.add('quiz-mode-card-selected', 'border-indigo-400', 'bg-indigo-50', 'dark:bg-indigo-900/30');
        selected.classList.remove('border-slate-200', 'dark:border-slate-700');
    }
}

function startQuizFromSetup() {
    document.getElementById('quiz-setup').classList.add('hidden');
    document.getElementById('quiz-active').classList.remove('hidden');
    document.getElementById('quiz-results').classList.add('hidden');
    state.quiz.phase = 'active';
    resetQuiz();
}

function abandonQuiz() {
    if (state.quiz.currentIdx === 0 && !state.quiz.isAnswered) {
        renderQuizSetup(); return;
    }
    showResults();
}

// ===== QUIZ LOGIC =====

function resetQuiz() {
    state.quiz.score      = 0;
    state.quiz.currentIdx = 0;
    state.quiz.log        = [];

    const subList = getSubList(state.range);
    for (let i = subList.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [subList[i], subList[j]] = [subList[j], subList[i]];
    }
    state.quiz.activeList  = subList;
    state.quiz.total       = subList.length;
    state.quiz.allMeanings = vocabData[state.dayKey].map(x => x.m);

    startQuiz();
}

function startQuiz() {
    if (state.quiz.currentIdx >= state.quiz.total) { showResults(); return; }
    state.quiz.isAnswered = false;
    state.quiz.targetWord = state.quiz.activeList[state.quiz.currentIdx];

    document.getElementById('next-quiz-btn').classList.add('hidden');
    document.getElementById('quiz-feedback').classList.add('hidden');

    const progress = (state.quiz.currentIdx / state.quiz.total) * 100;
    document.getElementById('quiz-progress-fill').style.width = progress + '%';
    document.getElementById('quiz-progress-text').textContent = `第 ${state.quiz.currentIdx + 1} / ${state.quiz.total} 題`;
    document.getElementById('quiz-score-display').textContent = `${Math.round(state.quiz.score)} 分`;

    if (state.quiz.mode === 'en-zh') setupMCQ();
    else setupTyping();
}

function setupMCQ() {
    document.getElementById('quiz-options').classList.remove('hidden');
    document.getElementById('quiz-typing').classList.add('hidden');
    document.getElementById('quiz-audio-btn').classList.remove('hidden');
    document.getElementById('quiz-question').innerHTML = `<span class="text-indigo-600 dark:text-indigo-400 text-3xl font-black tracking-tight w-full text-center block">${state.quiz.targetWord.w}</span>`;

    let options = [state.quiz.targetWord.m];
    const allMeanings = state.quiz.allMeanings;
    while (options.length < 4) {
        const rand = allMeanings[Math.floor(Math.random() * allMeanings.length)];
        if (!options.includes(rand)) options.push(rand);
    }
    options.sort(() => Math.random() - 0.5);

    document.getElementById('quiz-options').innerHTML = options.map(opt => `
        <button data-answer="${opt.replace(/"/g, '&quot;')}" onclick="checkMCQAnswer(this)"
            class="mcq-btn w-full text-left p-5 rounded-xl border-2 border-slate-100 dark:border-slate-700 hover:border-indigo-300 hover:bg-indigo-50 transition-all font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 shadow-sm active:scale-[0.98]">${opt}</button>
    `).join('');
}

function setupTyping() {
    document.getElementById('quiz-options').classList.add('hidden');
    document.getElementById('quiz-typing').classList.remove('hidden');
    document.getElementById('quiz-audio-btn').classList.add('hidden');
    document.getElementById('quiz-question').innerHTML = `<div><p class="text-4xl font-black text-slate-800 dark:text-slate-100 leading-tight mb-1">${state.quiz.targetWord.m}</p><p class="text-sm text-slate-500 font-medium">${state.quiz.targetWord.p}</p></div>`;

    state.quiz.revealedPositions = [];
    state.quiz.hintPenalty = 0;

    const input = document.getElementById('typing-input');
    input.value = ''; input.disabled = false; input.focus();
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
    renderTiles(document.getElementById('typing-input').value, false);
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
    const isCorrect = selected === correct;
    document.querySelectorAll('.mcq-btn').forEach(b => b.disabled = true);
    if (isCorrect) {
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
    state.quiz.log.push({ word: state.quiz.targetWord, isCorrect, userAnswer: selected, pointsEarned: isCorrect ? (100 / state.quiz.total) : 0 });
    finishQuestion();
}

function showTypingFeedback(isCorrect, word) {
    const feedback = document.getElementById('quiz-feedback');
    feedback.classList.remove('hidden');
    const info = `<span class="text-xs text-slate-500 italic mt-1 inline-block">(${word.p}) ${word.ph}</span>`;
    if (isCorrect) {
        feedback.innerHTML = `✅ 答對了！<br>單字：<span class="font-bold text-lg">${word.w}</span><br>${info}`;
        feedback.className = "mt-4 p-5 rounded-xl text-base font-bold bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-2 border-green-200 dark:border-green-800 shadow-sm";
    } else {
        feedback.innerHTML = `❌ 答錯了！<br>正確答案：<span class="font-bold text-lg text-red-700 dark:text-red-400">${word.w}</span><br>${info}`;
        feedback.className = "mt-4 p-5 rounded-xl text-base font-bold bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-2 border-red-200 dark:border-red-800 shadow-sm";
    }
}

function checkTypingAnswer() {
    if (state.quiz.isAnswered) return;
    const input = document.getElementById('typing-input');
    const userAnswer = input.value.trim();
    if (!userAnswer) return;
    state.quiz.isAnswered = true;
    input.disabled = true;
    renderTiles(userAnswer, true);
    const isCorrect = normalize(userAnswer) === normalize(state.quiz.targetWord.w);
    const basePoints = 100 / state.quiz.total;
    const earned = isCorrect ? Math.max(0, basePoints - state.quiz.hintPenalty) : 0;
    if (isCorrect) state.quiz.score += earned;
    state.quiz.log.push({ word: state.quiz.targetWord, isCorrect, userAnswer, pointsEarned: earned });
    showTypingFeedback(isCorrect, state.quiz.targetWord);
    finishQuestion();
}

function finishQuestion() {
    state.quiz.currentIdx++;
    document.getElementById('quiz-score-display').textContent = `${Math.round(state.quiz.score)} 分`;
    const nextBtn = document.getElementById('next-quiz-btn');
    nextBtn.classList.remove('hidden');
    nextBtn.textContent = state.quiz.currentIdx >= state.quiz.total ? '查看結果 ✨' : '下一題 ➔';
}

function advanceQuiz() {
    startQuiz();
}

// ===== QUIZ RESULTS =====

function showResults() {
    document.getElementById('quiz-setup').classList.add('hidden');
    document.getElementById('quiz-active').classList.add('hidden');
    document.getElementById('quiz-results').classList.remove('hidden');
    state.quiz.phase = 'results';

    const score = Math.round(state.quiz.score);
    const total = state.quiz.log.length;
    const correct = state.quiz.log.filter(e => e.isCorrect).length;
    const wrong = state.quiz.log.filter(e => !e.isCorrect);

    // Header
    const num = state.dayKey.replace('Day ', '');
    document.getElementById('results-day-label').textContent = `DAY ${num} — ${state.quiz.mode === 'en-zh' ? '選擇題' : '拼字填空'}`;
    document.getElementById('results-score').textContent = score;
    const stars = score >= 90 ? '⭐⭐⭐⭐⭐' : score >= 80 ? '⭐⭐⭐⭐' : score >= 70 ? '⭐⭐⭐' : score >= 60 ? '⭐⭐' : '⭐';
    document.getElementById('results-stars').textContent = stars;
    document.getElementById('results-summary').textContent = `答對 ${correct} / ${total} 題`;

    // Missed words
    const missedSection = document.getElementById('missed-section');
    const reviewBtn = document.getElementById('review-missed-btn');
    if (wrong.length > 0) {
        document.getElementById('missed-title').textContent = `答錯的單字（${wrong.length} 個）`;
        missedSection.classList.remove('hidden');
        reviewBtn.classList.remove('hidden');

        const missedList = document.getElementById('missed-list');
        missedList.innerHTML = wrong.map(e => `
            <div class="missed-word-row p-4 flex items-center justify-between gap-3">
                <div class="flex-1">
                    <div class="font-bold text-slate-800 dark:text-slate-100">${e.word.w}</div>
                    <div class="text-xs text-slate-500 dark:text-slate-400">(${e.word.p}) ${e.word.m}</div>
                    ${e.userAnswer && e.userAnswer !== e.word.m ? `<div class="text-xs text-red-400 mt-0.5">你的答案：${e.userAnswer}</div>` : ''}
                </div>
                <button onclick="playAudio('${e.word.w.replace(/'/g, "\\'")}', this, event)" class="p-2 text-slate-400 hover:text-indigo-500 active:scale-90 transition-all flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
                </button>
            </div>
        `).join('');
    } else {
        missedSection.classList.add('hidden');
        reviewBtn.classList.add('hidden');
    }

    // Save
    saveHistory({ dayKey: state.dayKey, range: state.range, mode: state.quiz.mode, score, total, timestamp: Date.now(), log: state.quiz.log });
    const progress = loadProgress();
    const prev = progress[state.dayKey] || {};
    saveProgress(state.dayKey, {
        quizBestScore: Math.max(score, prev.quizBestScore || 0),
        quizAttempts: (prev.quizAttempts || 0) + 1,
    });
    updateWeakWords(state.quiz.log);
    updateStreak();
}

function toggleMissedWords() {
    const list = document.getElementById('missed-list');
    const chevron = document.getElementById('missed-chevron');
    list.classList.toggle('hidden');
    chevron.style.transform = list.classList.contains('hidden') ? '' : 'rotate(180deg)';
}

function retryQuiz() {
    renderQuizSetup();
}

function reviewMissedWords() {
    const wrong = state.quiz.log.filter(e => !e.isCorrect).map(e => e.word);
    if (wrong.length === 0) return;
    state.card.activeList = wrong;
    state.card.idx = 0;
    state.studySubTab = 'cards';
    state._reviewOverride = true;
    switchScreen('study');
}

// ===== STATS SCREEN =====

function renderStatsScreen() {
    // Weak words
    const weak = getWeakWords();
    const weakEl = document.getElementById('weak-words-list');
    if (weak.length === 0) {
        weakEl.innerHTML = '<p class="text-slate-400 text-center py-2">尚無弱點單字</p>';
    } else {
        weakEl.innerHTML = weak.slice(0, 20).map(w => `
            <span class="inline-flex items-center gap-1 px-2 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-xs font-bold mr-2 mb-2">${w}</span>
        `).join('');
    }

    // History
    const history = loadHistory();
    const histEl = document.getElementById('history-list');
    if (history.length === 0) {
        histEl.innerHTML = '<p class="text-slate-400 text-center py-4">尚無測驗記錄</p>';
    } else {
        histEl.innerHTML = history.map(entry => {
            const date = new Date(entry.timestamp).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            const num = (entry.dayKey || '').replace('Day ', '');
            const modeName = entry.mode === 'en-zh' ? '選擇題' : '拼字填空';
            const scoreColor = entry.score >= 80 ? 'score-badge-high' : entry.score >= 60 ? 'score-badge-mid' : 'score-badge-low';
            return `
            <div class="history-entry flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <div>
                    <span class="font-bold text-slate-700 dark:text-slate-200 text-sm">DAY ${num}</span>
                    <span class="mx-1 text-slate-300">·</span>
                    <span class="text-xs text-slate-400">${modeName}</span>
                    <div class="text-[10px] text-slate-400 mt-0.5">${date}</div>
                </div>
                <span class="${scoreColor} px-3 py-1 rounded-full text-sm font-black">${entry.score}</span>
            </div>`;
        }).join('');
    }
}

// ===== STATUS BAR CLOCK =====
function updateClock() {
    const el = document.getElementById('sb-time');
    if (!el) return;
    const now = new Date();
    el.textContent = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
}

// ===== INIT =====

window.onload = () => {
    loadPrefs();
    state.card.activeList = getSubList(state.range);
    updateClock();
    setInterval(updateClock, 10000);
    renderHomeScreen();
    document.getElementById('tab-home').classList.add('tab-btn-active');
};
