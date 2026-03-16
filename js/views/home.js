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

    updateDashboard();

    const streakText = $('streak-text');
    if (streakText) streakText.textContent = `連續 ${Math.max(meta.streakDays || 0, 1)} 天`;

    $('day-grid').innerHTML = Array.from({ length: 30 }, (_, i) => {
        const n = i + 1;
        const dayKey = `Day ${String(n).padStart(2, '0')}`;
        const hasData = !!vocabData[dayKey];
        const isSelected = dayKey === state.dayKey;

        if (!hasData) {
            return `<div class="day-cell flex flex-col items-center justify-center py-4 rounded-2xl border border-slate-100 bg-slate-50 opacity-40">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mb-1.5 text-slate-400"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <span class="text-[10px] font-bold text-slate-400">D${n}</span>
            </div>`;
        }

        const bestScore = (progress[dayKey] || {}).quizBestScore || 0;
        const dotFill = bestScore > 0 ? (bestScore >= 80 ? '#25a97e' : '#7b6ef6') : '';
        const centerSvg = isSelected
            ? `<circle cx="14" cy="14" r="4.5" class="day-dot-sel"/>`
            : (dotFill ? `<circle cx="14" cy="14" r="4" fill="${dotFill}" opacity="0.65"/>` : '');

        return `<button onclick="selectDay('${dayKey}')" class="day-cell has-data relative flex flex-col items-center justify-center py-4 rounded-2xl border ${isSelected ? 'is-selected border-blue-500 bg-blue-50/60' : 'border-slate-100 bg-white'} transition-all hover:scale-105 active:scale-95 shadow-sm">
            <svg width="28" height="28" viewBox="0 0 28 28" class="mb-1.5">
                <circle cx="14" cy="14" r="11" stroke-width="2" class="${isSelected ? 'day-ring-sel' : 'day-ring'}"/>
                ${centerSvg}
            </svg>
            <span class="text-[11px] font-black ${isSelected ? 'text-blue-600 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'}">D${n}</span>
        </button>`;
    }).join('');
}

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
