// ===== HOME SCREEN =====

function updateDashboard() {
    let totalWords = 0, masteredWords = 0;
    const masteryData = getMasteryData();

    for (const key in vocabData) {
        const words = vocabData[key];
        totalWords += words.length;
        for (let i = 0; i < words.length; i++) {
            if ((masteryData[words[i].w] || 0) > 0) masteredWords++;
        }
    }

    Debug.home('dashboard', { totalWords, masteredWords });

    const pct = totalWords ? Math.round((masteredWords / totalWords) * 100) : 0;

    const setText = (id, v) => { const el = $(id); if (el) el.textContent = v; };
    setText('dash-total-count', totalWords);
    setText('dash-masterose-count', masteredWords);
    setText('dash-masterose-count2', masteredWords);
    setText('dash-unmasterose-count', totalWords - masteredWords);
    setText('dash-percentage', pct + '%');

    const circle = $('dash-progress-circle');
    if (circle) {
        const c = 2 * Math.PI * 15;
        circle.style.strokeDasharray = c;
        setTimeout(() => { circle.style.strokeDashoffset = c - (pct / 100) * c; }, 50);
    }
}

function renderHomeScreen() {
    Debug.home('render');
    const progress = loadProgress();
    const meta = getMeta();
    const masteryData = getMasteryData();

    updateDashboard();

    const streakText = $('streak-text');
    if (streakText) streakText.textContent = `連續 ${Math.max(meta.streakDays || 0, 1)} 天`;

    $('day-grid').innerHTML = Array.from({ length: 30 }, (_, i) => {
        const n = i + 1;
        const dayKey = `Day ${String(n).padStart(2, '0')}`;
        const hasData = !!vocabData[dayKey];
        const isSelected = dayKey === state.dayKey;

        if (!hasData) {
            return `<div class="day-cell flex flex-col items-center justify-center h-16 rounded-2xl border border-slate-100 bg-slate-50 opacity-40">
                <span class="text-xs font-bold text-slate-400">D${n}</span>
            </div>`;
        }

        const words = vocabData[dayKey] || [];
        let dayMastered = 0;
        for (let j = 0; j < words.length; j++) {
            if ((masteryData[words[j].w] || 0) > 0) dayMastered++;
        }
        const dayPct = words.length ? (dayMastered / words.length) : 0;
        
        const r = 24;
        const c = 2 * Math.PI * r;
        const offset = c - (dayPct * c);

        return `<button onclick="selectDay('${dayKey}')" class="day-cell has-data relative flex flex-col items-center justify-center h-16 rounded-2xl border ${isSelected ? 'is-selected border-blue-500 bg-blue-50/60' : 'border-slate-100 bg-white'} transition-all hover:scale-105 active:scale-95 shadow-sm overflow-hidden group">
            <svg class="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="${r}" fill="none" class="stroke-slate-100 dark:stroke-white/5 transition-colors" stroke-width="3.5"></circle>
                <circle cx="32" cy="32" r="${r}" fill="none" class="stroke-blue-500 dark:stroke-indigo-400 transition-all duration-700 ease-out opacity-70 group-hover:opacity-100" stroke-width="3.5" stroke-dasharray="${c}" stroke-dashoffset="${offset}" stroke-linecap="round"></circle>
            </svg>
            <span class="text-base font-black tracking-tight z-10 ${isSelected ? 'text-blue-600 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'}">D${n}</span>
        </button>`;
    }).join('');
}

window.openFavorites = function() {
    state.range = 'favorites';
    state._reviewOverride = true;
    switchScreen('study');
};

function selectDay(dayKey) {
    if (!vocabData[dayKey]) return;
    Debug.home('selectDay', dayKey);
    state.dayKey = dayKey;
    state.range = 'all';
    state.card.idx = 0;
    state.card.activeList = getSubList('all');
    renderHomeScreen();
    savePrefs();
}
