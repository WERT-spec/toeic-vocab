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
    
    const percentage = totalWords === 0 ? 0 : Math.round((masteredWords / totalWords) * 100);
    if (dashPct) dashPct.textContent = percentage + '%';
    
    const circle = document.getElementById('dash-progress-circle');
    if (circle) {
        const circumference = 2 * Math.PI * 16; // r=16
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
    const streakEl = document.getElementById('streak-display');
    if (streakEl && meta.streakDays > 0) {
        streakEl.innerHTML = `<span class="streak-emoji">🔥</span> 連續學習 ${meta.streakDays} 天`;
        streakEl.classList.remove('hidden');
    } else {
        if (streakEl) streakEl.classList.add('hidden');
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
            <button onclick="selectDay('${dayKey}')" style="--i: ${i}" class="day-cell has-data relative flex flex-col items-center py-3 rounded-2xl border ${isSelected ? 'is-selected border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/50'} transition-all hover:scale-105 active:scale-95 shadow-sm">
                <svg width="32" height="32" viewBox="0 0 28 28" class="mb-1">
                    <circle cx="14" cy="14" r="12" fill="none" stroke="${isSelected ? 'rgba(99, 102, 241, 0.2)' : 'rgba(0,0,0,0.05)'}" stroke-width="3"/>
                    ${bestScore > 0 ? `<circle cx="14" cy="14" r="12" fill="none" stroke="${isHigh ? '#22c55e' : '#6366f1'}" stroke-width="3" stroke-dasharray="${circumference}" stroke-dashoffset="${dashOffset}" class="progress-ring-circle" stroke-linecap="round"/>` : ''}
                </svg>
                <span class="text-[11px] font-black ${isSelected ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400'}">D${i}</span>
            </button>`;
        } else {
            html += `<div class="day-cell flex flex-col items-center py-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 opacity-40" style="--i: ${i}"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg><span class="text-[10px] font-bold text-slate-300 mt-1">D${i}</span></div>`;
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
    
    // Update selected state in grid
    document.querySelectorAll('.day-cell.has-data').forEach(el => {
        el.classList.remove('border-indigo-400', 'bg-indigo-50', 'dark:bg-indigo-900/30', 'is-selected');
        el.classList.add('border-slate-200', 'dark:border-slate-700', 'bg-white', 'dark:bg-slate-800');
    });
    
    renderHomeScreen();
    savePrefs();
}
