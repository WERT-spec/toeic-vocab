// ===== GLOBALS & STATE =====
const $ = id => document.getElementById(id);

const escapeHTML = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[tag]);
};

const state = {
    activeScreen: 'home',
    studySubTab: 'cards',
    dayKey: 'Day 01',
    range: 'all',
    card: { idx: 0, activeList: [] },
    statsTab: 'overview',
    quiz: {
        phase: 'setup',
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
        log: [],
    },
};

// ===== LOCALSTORAGE HELPERS =====

const LS = {
    get(key, fallback) {
        try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
        catch { return fallback; }
    },
    set(key, val) {
        try { localStorage.setItem(key, JSON.stringify(val)); }
        catch {}
    },
};

const KEYS = {
    prefs:   'toeic_v2_prefs',
    progress:'toeic_v2_progress',
    history: 'toeic_v2_history',
    weak:    'toeic_v2_weakwords',
    meta:    'toeic_v2_meta',
    mastery: 'toeic_v2_mastery',
    favorites: 'toeic_v2_favorites',
};

function loadPrefs() {
    const p = LS.get(KEYS.prefs, {});
    if (p.darkMode) { document.documentElement.classList.add('dark'); syncDarkBtns(true); }
    if (p.lastDayKey && vocabData[p.lastDayKey]) state.dayKey = p.lastDayKey;
    if (p.lastRange) state.range = p.lastRange;
    if (p.defaultQuizMode) state.quiz.mode = p.defaultQuizMode;
    Debug.store('loadPrefs', p);
}

function savePrefs() {
    const p = {
        darkMode: document.documentElement.classList.contains('dark'),
        lastDayKey: state.dayKey,
        lastRange: state.range,
        defaultQuizMode: state.quiz.mode,
    };
    LS.set(KEYS.prefs, p);
    Debug.store('savePrefs', p);
}

function loadProgress() { return LS.get(KEYS.progress, {}); }

function saveProgress(dayKey, patch) {
    const all = loadProgress();
    all[dayKey] = { ...all[dayKey], ...patch };
    LS.set(KEYS.progress, all);
    Debug.store('saveProgress', dayKey, patch);
}

function loadHistory() { return LS.get(KEYS.history, []); }

function saveHistory(entry) {
    const h = loadHistory();
    h.unshift(entry);
    LS.set(KEYS.history, h.slice(0, 100));
    Debug.store('saveHistory', entry.dayKey, entry.score);
}

function getWeakWords() { return LS.get(KEYS.weak, []); }

function updateWeakWords(log) {
    const weak = new Set(getWeakWords());
    log.forEach(e => e.isCorrect ? weak.delete(e.word.w) : weak.add(e.word.w));
    LS.set(KEYS.weak, [...weak]);
    Debug.store('updateWeakWords', weak.size);
}

window.removeWeakWord = function(word) {
    const weak = new Set(getWeakWords());
    if (weak.has(word)) {
        weak.delete(word);
        LS.set(KEYS.weak, [...weak]);
        if (state.activeScreen === 'stats') renderStatsScreen();
        if (state.activeScreen === 'study' && state.range === 'weak') {
            state.card.activeList = getSubList('weak');
            renderStudyScreen();
        }
    }
};

function getMeta() { return LS.get(KEYS.meta, {}); }

function updateStreak() {
    const meta = getMeta();
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (meta.lastStreakDate === today) return;
    meta.streakDays = meta.lastStreakDate === yesterday ? (meta.streakDays || 0) + 1 : 1;
    meta.lastStreakDate = today;
    LS.set(KEYS.meta, meta);
    Debug.store('updateStreak', meta.streakDays);
}

// ===== DATA HELPERS =====

function getSubList(range, dayKey) {
    if (range === 'favorites') {
        const favs = getFavorites();
        const allWords = [];
        for (let key in vocabData) {
            allWords.push(...vocabData[key].filter(w => favs.includes(w.w)));
        }
        return allWords;
    }
    if (range === 'weak') {
        const weak = getWeakWords();
        const allWords = [];
        for (let key in vocabData) {
            allWords.push(...vocabData[key].filter(w => weak.includes(w.w)));
        }
        return allWords;
    }
    const key = dayKey || state.dayKey;
    if (!vocabData[key]) return [];
    if (range === 'all') return [...vocabData[key]];
    const [start, end] = range.split('-').map(Number);
    return vocabData[key].slice(start - 1, end);
}

// ===== MASTERY =====

function getMasteryData() { return LS.get(KEYS.mastery, {}); }

function updateWordMastery(word, delta) {
    const data = getMasteryData();
    data[word] = Math.max(0, Math.min(3, (data[word] || 0) + delta));
    LS.set(KEYS.mastery, data);
    Debug.store('mastery', word, data[word]);
}

function getWordMastery(word) {
    return getMasteryData()[word] || 0;
}

// ===== FAVORITES =====

function getFavorites() { return LS.get(KEYS.favorites, []); }

function toggleFavorite(word) {
    let f = getFavorites();
    if (f.includes(word)) f = f.filter(w => w !== word);
    else f.unshift(word);
    LS.set(KEYS.favorites, f);
    return f.includes(word);
}

function isFavorite(word) { return getFavorites().includes(word); }
