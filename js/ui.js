// ===== SW UPDATE TOAST =====

function showUpdateToast(waitingSW) {
    if (document.getElementById('sw-update-toast')) return;
    Debug.ui('showUpdateToast');
    const toast = document.createElement('div');
    toast.id = 'sw-update-toast';
    toast.className = 'sw-toast';
    toast.innerHTML = `<span>🆕 新版本已就緒</span><button onclick="applyUpdate()">立即更新</button>`;
    document.body.appendChild(toast);
    window._pendingSW = waitingSW;
}

function applyUpdate() {
    window._pendingSW?.postMessage({ type: 'SKIP_WAITING' });
    document.getElementById('sw-update-toast')?.remove();
}

// ===== NAVIGATION =====

const SCREENS = ['home', 'study', 'quiz', 'stats'];
const SCREEN_ORDER = { home: 0, study: 1, quiz: 2, stats: 3 };
const SCREEN_RENDERERS = { home: renderHomeScreen, study: renderStudyScreen, quiz: renderQuizSetup, stats: renderStatsScreen };

function switchScreen(name) {
    const prev = state.activeScreen;
    Debug.ui('switchScreen', prev, '→', name);

    SCREENS.forEach(s => {
        document.getElementById('screen-' + s).classList.add('hidden');
        document.getElementById('screen-' + s).classList.remove('screen-enter', 'screen-enter-left');
        document.getElementById('tab-' + s)?.classList.remove('tab-btn-active');
    });

    const el = document.getElementById('screen-' + name);
    el.classList.remove('hidden');
    el.classList.add(SCREEN_ORDER[name] < SCREEN_ORDER[prev] ? 'screen-enter-left' : 'screen-enter');
    setTimeout(() => el.classList.remove('screen-enter', 'screen-enter-left'), 300);

    document.getElementById('tab-' + name)?.classList.add('tab-btn-active');
    state.activeScreen = name;
    SCREEN_RENDERERS[name]?.();
    savePrefs();
}

function goStudy() { switchScreen('study'); }
function goQuiz()  { switchScreen('quiz'); }

// ===== DARK MODE =====

const DARK_BTN_IDS = ['dark-mode-btn', 'dark-mode-btn-study', 'dark-mode-btn-quiz', 'dark-mode-btn-stats'];

function syncDarkBtns(isDark) {
    DARK_BTN_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = isDark ? '☀️' : '🌙';
    });
    document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.remove());
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = isDark ? '#0a0a0f' : '#f0f4ff';
    document.head.appendChild(meta);
}

function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    Debug.ui('darkMode', isDark);
    syncDarkBtns(isDark);
    savePrefs();
}

// ===== RANGE =====

function setRange(range) {
    Debug.ui('setRange', range);
    state.range = range;
    state.card.activeList = getSubList(range);
    state.card.idx = 0;
    renderRangePills('study-range-pills', range, 'setRange');
    renderRangePills('quiz-range-pills', range, 'setRange');
    if (state.activeScreen === 'study') {
        state.studySubTab === 'cards' ? updateCard() : initTable();
    }
    savePrefs();
}

function renderRangePills(containerId, activeRange, callbackName) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const count = (vocabData[state.dayKey] || []).length;

    let html = `<button onclick="${callbackName}('all')" class="range-pill ${activeRange === 'all' ? 'range-pill-active' : ''}">全部</button>`;
    for (let i = 0; i < count; i += 10) {
        const r = `${i + 1}-${Math.min(i + 10, count)}`;
        html += `<button onclick="${callbackName}('${r}')" class="range-pill ${activeRange === r ? 'range-pill-active' : ''}">${r}</button>`;
    }
    container.innerHTML = html;
}
