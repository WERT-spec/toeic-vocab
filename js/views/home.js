// ===== HOME SCREEN =====

function updateDashboard() {
    let totalWords = 0;
    let masteredWords = 0;
    
    // Calculate totals
    for (const key in vocabData) {
        if (vocabData.hasOwnProperty(key)) {
            const words = vocabData[key];
            totalWords += words.length;
            words.forEach(w => {
                if (typeof getWordMastery === 'function' && getWordMastery(w.w) > 0) {
                    masteredWords++;
                }
            });
        }
    }
    
    const dashTotal = document.getElementById('dash-total-count');
    const dashMastered = document.getElementById('dash-mastered-count');
    const dashPct = document.getElementById('dash-percentage');
    
    if (dashTotal) dashTotal.textContent = totalWords;
    if (dashMastered) dashMastered.textContent = masteredWords;
    const dashMastered2 = document.getElementById('dash-mastered-count2');
    if (dashMastered2) dashMastered2.textContent = masteredWords;
    const dashUnmastered = document.getElementById('dash-unmastered-count');
    if (dashUnmastered) dashUnmastered.textContent = totalWords - masteredWords;

    const percentage = totalWords === 0 ? 0 : Math.round((masteredWords / totalWords) * 100);
    if (dashPct) dashPct.textContent = percentage + '%';

    const circle = document.getElementById('dash-progress-circle');
    if (circle) {
        const circumference = 2 * Math.PI * 15; // r=15
        circle.style.strokeDasharray = circumference;
        setTimeout(() => {
            circle.style.strokeDashoffset = circumference - (percentage / 100) * circumference;
        }, 50);
    }
}

function renderHomeScreen() {
    const progress = loadProgress();
    const meta = getMeta();
    const grid = document.getElementById('day-grid');
    
    updateDashboard();

    // Streak
    const streakText = document.getElementById('streak-text');
    const days = meta.streakDays > 0 ? meta.streakDays : 1;
    if (streakText) streakText.textContent = `連續 ${days} 天`;

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
            <button onclick="selectDay('${dayKey}')" style="--i: ${i}" class="day-cell has-data relative flex flex-col items-center justify-center py-4 rounded-2xl border ${isSelected ? 'is-selected border-violet-500 bg-violet-50' : 'border-slate-200 bg-white'} transition-all hover:scale-105 active:scale-95 shadow-sm">
                <svg width="28" height="28" viewBox="0 0 28 28" class="mb-1.5">
                    <circle cx="14" cy="14" r="11" stroke-width="2" class="${isSelected ? 'day-ring-sel' : 'day-ring'}"/>
                    ${isSelected
                        ? `<circle cx="14" cy="14" r="4.5" class="day-dot-sel"/>`
                        : (bestScore > 0 ? `<circle cx="14" cy="14" r="4" fill="${isHigh ? '#22c55e' : '#818cf8'}" opacity="0.6"/>` : '')}
                </svg>
                <span class="text-[11px] font-black ${isSelected ? 'text-violet-600 dark:text-violet-300' : 'text-slate-500 dark:text-slate-400'}">D${i}</span>
            </button>`;
        } else {
            html += `<div class="day-cell flex flex-col items-center justify-center py-4 rounded-2xl border border-slate-100 bg-slate-50 opacity-40" style="--i: ${i}">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mb-1.5 text-slate-400"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <span class="text-[10px] font-bold text-slate-400">D${i}</span>
            </div>`;
        }
    }
    grid.innerHTML = html;
}

function selectDay(dayKey) {
    if (!vocabData[dayKey]) return;
    state.dayKey = dayKey;
    state.range = 'all';
    state.card.idx = 0;
    state.card.activeList = getSubList('all');
    renderHomeScreen();
    savePrefs();
}
