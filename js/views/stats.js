// ===== STATS SCREEN =====

window.switchStatsTab = function(tab) {
    state.statsTab = tab;
    ['overview', 'progress', 'weak', 'history'].forEach(t => {
        const btn   = $(`stats-tab-btn-${t}`);
        const panel = $(`stats-tab-${t}`);
        const active = t === tab;
        btn.classList.toggle('seg-btn-active', active);
        btn.setAttribute('aria-selected', active);
        panel.classList.toggle('hidden', !active);
    });
    if (tab === 'overview') renderOverviewTab();
    if (tab === 'progress') renderProgressTab();
    if (tab === 'weak')     renderWeakTab();
    if (tab === 'history')  renderHistoryTab();
};

function renderStatsScreen() {
    Debug.stats('render');
    switchStatsTab(state.statsTab || 'overview');
}

// ----- Tab 1: Overview -----

function renderOverviewTab() {
    const history = loadHistory();
    const meta    = getMeta();
    const mastery = getMasteryData();

    const streak       = meta.streakDays || 0;
    const quizCount    = history.length;
    const avgScore     = quizCount
        ? Math.round(history.reduce((s, e) => s + e.score, 0) / quizCount)
        : 0;
    const masteredCount = Object.values(mastery).filter(v => v >= 2).length;

    // Last 7 scores (oldest → newest) for mini sparkline
    const last7 = history.slice(0, 7).map(e => e.score).reverse();
    let chartHtml = '';
    if (last7.length >= 2) {
        const W = 220, H = 56, PAD = 6;
        const pts = last7.map((s, i) => {
            const x = PAD + (i / (last7.length - 1)) * (W - PAD * 2);
            const y = H - PAD - (s / 100) * (H - PAD * 2);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(' ');
        const dots = last7.map((s, i) => {
            const x = PAD + (i / (last7.length - 1)) * (W - PAD * 2);
            const y = H - PAD - (s / 100) * (H - PAD * 2);
            return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="#a855f7"/>`;
        }).join('');
        chartHtml = `
            <div class="mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
                <div class="text-[10px] font-black text-slate-400 dark:text-white/40 tracking-widest mb-2 uppercase">最近 ${last7.length} 次分數趨勢</div>
                <svg viewBox="0 0 ${W} ${H}" class="w-full h-auto overflow-visible">
                    <defs>
                        <linearGradient id="sparkGrad" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stop-color="#7c3aed"/>
                            <stop offset="100%" stop-color="#a855f7"/>
                        </linearGradient>
                    </defs>
                    <polyline points="${pts}" fill="none" stroke="url(#sparkGrad)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
                    ${dots}
                </svg>
            </div>`;
    } else if (quizCount === 1) {
        chartHtml = `<div class="mt-4 pt-4 border-t border-slate-200 dark:border-white/10 text-[10px] text-slate-400 dark:text-white/40 text-center py-2">再多做幾次測驗，趨勢圖就會出現</div>`;
    }

    const statsCards = [
        { icon: '🔥', value: streak,        unit: '天', label: '連續天數' },
        { icon: '📊', value: avgScore,       unit: '分', label: '平均分數' },
        { icon: '✅', value: masteredCount,  unit: '',   label: '已掌握單字' },
        { icon: '📝', value: quizCount,      unit: '次', label: '測驗次數'  },
    ].map(c => `
        <div class="flex flex-col items-center gap-1.5 p-4 rounded-2xl bg-transparent border-2 border-slate-600 dark:border-white text-center">
            <span class="text-2xl leading-none">${c.icon}</span>
            <div class="text-3xl font-black text-slate-900 dark:text-white leading-none mt-1">
                ${c.value}<span class="text-base font-bold opacity-50">${c.unit}</span>
            </div>
            <div class="text-[10px] font-black text-slate-400 dark:text-white/50 tracking-widest uppercase">${c.label}</div>
        </div>`).join('');

    $('stats-tab-overview').innerHTML = `
        <div class="grid grid-cols-2 gap-3 mb-3">${statsCards}</div>
        ${quizCount === 0
            ? '<p class="text-slate-400 dark:text-white/40 text-center py-8 font-medium text-sm">尚未完成任何測驗，快去挑戰吧！</p>'
            : `<div class="bg-transparent border-2 border-slate-600 dark:border-white rounded-2xl p-4">${chartHtml}</div>`
        }`;
}

// ----- Tab 2: Progress -----

function renderProgressTab() {
    const mastery = getMasteryData();
    const days    = Object.keys(vocabData).sort();

    if (days.length === 0) {
        $('stats-tab-progress').innerHTML = '<p class="text-slate-400 text-center py-8 text-sm">尚無單字資料</p>';
        return;
    }

    const rows = days.map(key => {
        const words    = vocabData[key];
        const total    = words.length;
        const learned  = words.filter(w => (mastery[w.w] || 0) >= 1).length;
        const mastered = words.filter(w => (mastery[w.w] || 0) >= 2).length;
        const pct      = total ? Math.round((learned / total) * 100) : 0;
        const label    = key.replace('Day ', 'DAY ');
        const barColor = pct >= 80 ? '#10b981' : pct >= 40 ? '#8b5cf6' : '#cbd5e1';
        const pctColor = pct >= 80 ? 'text-emerald-500' : 'text-slate-400 dark:text-white/40';

        return `<div class="mb-5 last:mb-0">
            <div class="flex justify-between items-baseline mb-1.5">
                <span class="text-xs font-black text-slate-800 dark:text-white tracking-wider">${label}</span>
                <span class="text-[10px] font-bold text-slate-400 dark:text-white/50">${learned}/${total} · ${mastered} 掌握</span>
            </div>
            <div class="h-2 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                <div class="h-full rounded-full stats-bar-fill" style="width:${pct}%;background:${barColor}"></div>
            </div>
            <div class="text-right mt-0.5">
                <span class="text-[10px] font-black ${pctColor}">${pct}%</span>
            </div>
        </div>`;
    }).join('');

    $('stats-tab-progress').innerHTML = `<div class="bg-transparent border-2 border-slate-600 dark:border-white rounded-2xl p-4">${rows}</div>`;
}

// ----- Tab 3: Weak Words -----

function renderWeakTab() {
    const weak = getWeakWords();
    $('stats-tab-weak').innerHTML = `
        <div class="bg-transparent border-2 border-slate-600 dark:border-white rounded-2xl p-4">
            <h2 class="section-label">需要加強的單字</h2>
            <div id="weak-words-list" aria-live="polite">${
                weak.length
                    ? weak.slice(0, 20).map(w => `<button onclick="removeWeakWord('${escapeHTML(w)}')" class="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-lg text-sm font-bold mr-2 mb-2 hover:opacity-80 active:scale-95 transition-all shadow-sm border border-rose-100 dark:border-rose-800/30">
                        <span>${escapeHTML(w)}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3.5 h-3.5 opacity-60"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
                    </button>`).join('')
                    : '<p class="text-slate-400 text-center py-2 font-medium">太棒了！目前沒有需要加強的單字</p>'
            }</div>
        </div>`;
}

// ----- Tab 4: History -----

function renderHistoryTab() {
    const history = loadHistory();
    $('stats-tab-history').innerHTML = history.length
        ? history.map((entry, idx) => {
            const date = new Date(entry.timestamp).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

            let title = '所有範圍';
            if (entry.range !== 'all' && entry.range !== 'favorites' && entry.range !== 'weak') {
                title = `範圍 ${entry.range}`;
            } else if (entry.range === 'favorites') {
                title = '⭐ 星號';
            } else if (entry.range === 'weak') {
                title = '⚠️ 易錯';
            } else if (entry.dayKey) {
                title = entry.dayKey.replace('Day ', 'DAY ');
            }

            let modeStr = '未知';
            if (entry.mode === 'en-zh')       modeStr = '選擇題';
            if (entry.mode === 'en-spell')     modeStr = '拼字填空';
            if (entry.mode === 'zh-en-type')   modeStr = '拼字填空';
            if (entry.mode === 'listen-mcq')   modeStr = '聽力測驗';

            const wrongWords    = (entry.log || []).filter(lg => !lg.isCorrect);
            const wrongWordsHtml = wrongWords.length > 0
                ? wrongWords.map(lg => `<div class="flex justify-between items-center text-sm py-1 border-b border-slate-100 dark:border-white/10 last:border-0">
                    <span class="font-bold text-slate-700 dark:text-slate-200">${escapeHTML(lg.word.w)}</span>
                    <span class="text-xs text-slate-500 dark:text-slate-400 truncate ml-2 max-w-[60%]">${escapeHTML(lg.word.m).split(/[,，;；]/)[0]}</span>
                  </div>`).join('')
                : '<div class="text-sm text-emerald-600 dark:text-emerald-400 py-1 font-bold text-center">全對滿分！完美過關 🎉</div>';

            const scoreColor = entry.score >= 80
                ? 'text-emerald-400 border-emerald-700'
                : entry.score >= 60
                    ? 'text-amber-400 border-amber-700'
                    : 'text-rose-400 border-rose-700';

            return `<div class="history-entry flex flex-col p-3 rounded-xl bg-transparent mb-3 border-2 border-slate-600 dark:border-white">
                <div class="flex items-center justify-between cursor-pointer active:opacity-70 transition-opacity" onclick="toggleHistoryDetail(${idx})">
                    <div>
                        <span class="font-bold text-slate-800 dark:text-white text-sm">${title}</span>
                        <span class="mx-1 text-slate-500">·</span>
                        <span class="text-xs text-slate-400 font-bold">${modeStr}</span>
                        <div class="text-[10px] text-slate-500 dark:text-white/40 mt-0.5">${date}</div>
                    </div>
                    <span class="px-3 py-1 rounded-full text-sm font-black border-2 ${scoreColor}">${entry.score}</span>
                </div>
                <div id="history-detail-${idx}" class="hidden mt-3 pt-3 border-t border-slate-600 dark:border-white">
                    <div class="mb-3">
                        <div class="text-[10px] font-black text-rose-500/80 mb-1 tracking-widest">WRONG WORDS</div>
                        ${wrongWordsHtml}
                    </div>
                    <button onclick="retakeQuiz(${idx})" class="w-full py-2 bg-transparent text-blue-400 rounded-lg text-sm font-bold active:scale-95 transition-transform flex justify-center items-center gap-1 border-2 border-blue-400">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l3.158 3.158a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39l.152-.847Z" clip-rule="evenodd" /><path fill-rule="evenodd" d="M4.688 8.576a5.5 5.5 0 0 1 9.201-2.466l.312.311H11.77a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .75-.75V2.924a.75.75 0 0 0-1.5 0v2.43l-3.158-3.158a7 7 0 0 0-11.712 3.138.75.75 0 0 0 1.449.39l-.152.847Z" clip-rule="evenodd" /></svg>
                        重新測驗錯的單字
                    </button>
                </div>
            </div>`;
        }).join('')
        : '<p class="text-slate-400 dark:text-white/40 text-center py-8 font-medium">尚無測驗記錄，趕快去挑戰吧！</p>';
}

// ----- Global Handlers -----

window.toggleHistoryDetail = function(idx) {
    const el = $(`history-detail-${idx}`);
    if (el) el.classList.toggle('hidden');
};

window.retakeQuiz = function(idx) {
    const history = loadHistory();
    const entry   = history[idx];
    if (!entry) return;

    const wrongWords = (entry.log || []).filter(lg => !lg.isCorrect).map(lg => lg.word);
    if (wrongWords.length === 0) return;

    state.dayKey     = entry.dayKey || state.dayKey;
    state.quiz.mode  = entry.mode;

    switchScreen('quiz');
    showQuizPanel('quiz-active');
    state.quiz.phase = 'active';
    resetQuiz(wrongWords);
};
