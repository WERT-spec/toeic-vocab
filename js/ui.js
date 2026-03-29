// ===== SW UPDATE TOAST =====

function showUpdateToast(waitingSW) {
    if ($('sw-update-toast')) return;
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
    $('sw-update-toast')?.remove();
}

// ===== NAVIGATION =====

const SCREENS = ['home', 'study', 'quiz', 'stats'];
const SCREEN_ORDER = { home: 0, study: 1, quiz: 2, stats: 3 };

function switchScreen(name) {
    const prev = state.activeScreen;
    Debug.ui('switchScreen', prev, '→', name);

    SCREENS.forEach(s => {
        $('screen-' + s).classList.add('hidden');
        $('screen-' + s).classList.remove('screen-enter', 'screen-enter-left');
        $('tab-' + s)?.classList.remove('tab-btn-active');
    });

    const el = $('screen-' + name);
    el.classList.remove('hidden');
    el.classList.add(SCREEN_ORDER[name] < SCREEN_ORDER[prev] ? 'screen-enter-left' : 'screen-enter');
    setTimeout(() => el.classList.remove('screen-enter', 'screen-enter-left'), 300);

    $('tab-' + name)?.classList.add('tab-btn-active');
    state.activeScreen = name;
    if (name === 'home')  renderHomeScreen();
    if (name === 'study') renderStudyScreen();
    if (name === 'quiz')  renderQuizSetup();
    if (name === 'stats') renderStatsScreen();
    savePrefs();
}

function goStudy() { switchScreen('study'); }
function goQuiz()  { switchScreen('quiz'); }

// ===== DARK MODE =====

const DARK_BTN_IDS = ['dark-mode-btn', 'dark-mode-btn-study', 'dark-mode-btn-quiz', 'dark-mode-btn-results', 'dark-mode-btn-stats'];

function syncDarkBtns(isDark) {
    DARK_BTN_IDS.forEach(id => {
        const el = $(id);
        if (el) el.textContent = isDark ? '☀️' : '🌙';
    });
    document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.remove());
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = isDark ? '#09090b' : '#fafafa';
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
    const container = $(containerId);
    if (!container) return;
    const count = (vocabData[state.dayKey] || []).length;

    let html = `<button onclick="${callbackName}('favorites')" class="range-pill ${activeRange === 'favorites' ? 'range-pill-active text-amber-500' : ''}">⭐</button>`;
    html += `<button onclick="${callbackName}('all')" class="range-pill ${activeRange === 'all' ? 'range-pill-active' : ''}">All</button>`;
    for (let i = 0; i < count; i += 10) {
        const r = `${i + 1}-${Math.min(i + 10, count)}`;
        html += `<button onclick="${callbackName}('${r}')" class="range-pill ${activeRange === r ? 'range-pill-active' : ''}">${r}</button>`;
    }
    container.innerHTML = html;
}
