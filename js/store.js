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
        log.forEach(e => { if (!e.isCorrect) weak.add(e.word.w); else weak.delete(e.word.w); });
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

// ===== DATA HELPERS =====

function getSubList(range, dayKey) {
    const key = dayKey || state.dayKey;
    if (!vocabData[key]) return [];
    if (range === 'all') return [...vocabData[key]];
    const [start, end] = range.split('-').map(Number);
    return vocabData[key].slice(start - 1, end);
}

// ===== MASTERY LEVEL (SRS) =====

function getMasteryData() {
    try { return JSON.parse(localStorage.getItem('toeic_v2_mastery') || '{}'); } catch(e) { return {}; }
}

function updateWordMastery(word, delta) {
    try {
        const data = getMasteryData();
        const current = data[word] || 0;
        data[word] = Math.max(0, Math.min(3, current + delta));
        localStorage.setItem('toeic_v2_mastery', JSON.stringify(data));
    } catch(e) {}
}

function getWordMastery(word) {
    return getMasteryData()[word] || 0;
}
