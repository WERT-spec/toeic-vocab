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
