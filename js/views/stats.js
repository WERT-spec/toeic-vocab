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
