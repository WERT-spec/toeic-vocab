// ===== STUDY SCREEN =====

function renderStudyScreen() {
    state.card.activeList = getSubList(state.range);
    Debug.study('render', state.dayKey, 'range:', state.range);

    if (state.range === 'favorites' || state.range === 'weak') {
        if (state.card.activeList.length === 0) {
            const msg = state.range === 'favorites' 
                ? '您目前還沒有星號收藏任何單字喔！\n請先點選卡片左上角的星星來收藏。'
                : '太棒了！您目前沒有任何測驗答錯的易錯單字紀錄！';
            alert(msg);
            setRange('all');
            return;
        }
        $('study-day-label').textContent = state.range === 'favorites' ? '重點複習 (星號)' : '易錯複習';
    } else {
        $('study-day-label').textContent = `DAY ${state.dayKey.replace('Day ', '')}`;
        saveProgress(state.dayKey, { studiedAt: new Date().toISOString().slice(0, 10) });
    }

    renderRangePills('study-range-pills', state.range, 'setRange');

    switchStudySubTab(state.studySubTab);
    initCardSwipes();
    updateStreak();
}

function switchStudySubTab(subTab) {
    state.studySubTab = subTab;
    Debug.study('subTab', subTab);
    const isCards = subTab === 'cards';

    const cardsView = $('study-cards-view');
    const listView = $('study-list-view');
    [cardsView, listView].forEach(v => v.classList.remove('study-view-fade', 'hidden'));

    (isCards ? listView : cardsView).classList.add('hidden');
    (isCards ? cardsView : listView).classList.add('study-view-fade');

    $('study-tab-cards').classList.toggle('seg-btn-active', isCards);
    $('study-tab-list').classList.toggle('seg-btn-active', !isCards);

    isCards ? updateCard() : initTable();
}

// ===== FLASHCARD =====

let touchStartX = 0, touchStartY = 0, isSwipeAction = false, isScrolling = false, swipeContainer = null, lastSwipeTime = 0;

function initCardSwipes() {
    const card = $('flashcard-inner');
    swipeContainer = document.querySelector('.card-flip');
    if (!card || card._swipeInit) return;

    const onStart = (x, y) => {
        // Prevent edge swipe interference (system back/forward)
        if (x < 30 || x > window.innerWidth - 30) return;
        
        touchStartX = x; touchStartY = y; 
        isSwipeAction = false; isScrolling = false;
        if (swipeContainer) swipeContainer.style.transition = 'none';
    };

    const onMove = (x, y) => {
        if (isScrolling || touchStartX === 0) return; // Already determined as scroll or invalid start

        const dx = x - touchStartX;
        const dy = y - touchStartY;
        
        // Determine primary direction if not yet decided
        if (!isSwipeAction && !isScrolling) {
            if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
                isScrolling = true;
                return;
            } else if (Math.abs(dx) > 15) {
                isSwipeAction = true;
            }
        }

        if (isSwipeAction && swipeContainer) {
            swipeContainer.style.transform = `translateX(${dx}px) rotate(${dx * 0.05}deg)`;
            const color = dx > 0 ? '34, 197, 94' : '239, 68, 68';
            card.style.boxShadow = `0 10px 40px rgba(${color}, ${Math.min(0.4, Math.abs(dx) / 200)})`;
        }
    };

    const onEnd = (x) => {
        if (touchStartX === 0 || isScrolling) {
            touchStartX = 0;
            return;
        }
        
        const dx = x - touchStartX;
        touchStartX = 0; // reset
        
        if (Math.abs(dx) > 15) lastSwipeTime = Date.now();

        if (swipeContainer) swipeContainer.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
        card.style.boxShadow = '';

        if (Math.abs(dx) > 80 && isSwipeAction) {
            isSwipeAction = true;
            const dir = dx > 0 ? 1 : -1;
            swipeContainer.style.transform = `translateX(${dir * window.innerWidth}px) rotate(${dir * 30}deg)`;
            markCardMastery(dir);
        } else if (swipeContainer) {
            swipeContainer.style.transform = '';
            setTimeout(() => { isSwipeAction = false; }, 50);
        }
    };

    card.addEventListener('touchstart', e => onStart(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    card.addEventListener('touchmove', e => onMove(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    card.addEventListener('touchend', e => onEnd(e.changedTouches[0].clientX), { passive: true });
    card._swipeInit = true;
}

function markCardMastery(delta) {
    const word = state.card.activeList[state.card.idx];
    if (word) {
        updateWordMastery(word.w, delta);
        Debug.study('mastery', word.w, delta > 0 ? '+1' : '-1');
    }
    setTimeout(() => {
        if (swipeContainer) { swipeContainer.style.transition = 'none'; swipeContainer.style.transform = ''; }
        isSwipeAction = false;
        nextCard(true);
    }, 280);
}

function handleCardClick(e) {
    if (Date.now() - lastSwipeTime < 500 || isSwipeAction) { isSwipeAction = false; return; }
    if (!e.target.closest('button')) $('flashcard-inner').classList.toggle('flipped');
}

function renderMasteryDots(level) {
    const el = $('card-mastery-dots');
    if (!el) return;
    el.innerHTML = Array.from({ length: 3 }, (_, i) =>
        `<div class="w-2.5 h-2.5 rounded-full ${i < level ? 'bg-emerald-400 dark:bg-emerald-500 shadow-[0_0_8px_rgba(74,222,128,0.6)]' : 'bg-slate-200 dark:bg-slate-700'}"></div>`
    ).join('');
}

function updateCard(anim, skipOut) {
    const card = state.card.activeList[state.card.idx];
    if (!card) return;
    Debug.study('updateCard', card.w, state.card.idx);

    const inner = $('flashcard-inner');

    const apply = () => {
        inner.classList.remove('flipped');
        $('card-word').textContent = card.w;
        $('card-info').textContent = `(${card.p}) ${card.ph}`;
        $('card-meaning').innerHTML = escapeHTML(card.m).replace(/[，,]/g, '').replace(/[；;]/g, '<br>');
        $('card-progress').textContent = `${state.card.idx + 1} / ${state.card.activeList.length}`;
        renderMasteryDots(getWordMastery(card.w));
        
        const favBtn = $('card-favorite-btn');
        if (favBtn) {
            const isFav = isFavorite(card.w);
            favBtn.innerHTML = isFav 
                ? `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-amber-500 drop-shadow-md drop-shadow-[0_2px_8px_rgba(245,158,11,0.5)] fill-amber-400" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>`
                : `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>`;
        }

        if (anim && typeof anim === 'string') {
            inner.classList.add(anim + '-in');
            setTimeout(() => inner.classList.remove(anim + '-in'), 250);
        }
    };

    if (anim && typeof anim === 'string' && !skipOut) {
        inner.classList.add(anim + '-out');
        setTimeout(() => { inner.classList.remove(anim + '-out'); apply(); }, 250);
    } else {
        apply();
    }
    saveProgress(state.dayKey, { cardIdx: state.card.idx });
}

function nextCard(skipOut) {
    state.card.idx = (state.card.idx + 1) % state.card.activeList.length;
    updateCard('slide-left', skipOut);
}

function prevCard(skipOut) {
    state.card.idx = (state.card.idx - 1 + state.card.activeList.length) % state.card.activeList.length;
    updateCard('slide-right', skipOut);
}

window.handleFavoriteClick = function(e) {
    e.stopPropagation();
    const card = state.card.activeList[state.card.idx];
    if (!card) return;
    
    toggleFavorite(card.w);
    updateCard(null, true);
    
    const btn = $('card-favorite-btn');
    if (btn) {
        btn.style.transform = 'scale(1.4) rotate(-10deg)';
        setTimeout(() => btn.style.transform = '', 200);
    }
}

// ===== WORD LIST =====

function initTable() {
    const list = getSubList(state.range);
    const startIdx = state.range === 'all' ? 0 : parseInt(state.range.split('-')[0]) - 1;
    Debug.study('initTable', list.length, 'words');

    $('vocab-list-container').innerHTML = list.map((item, idx) => `
        <div class="vocab-list-item bg-transparent p-4 rounded-2xl border border-slate-300 dark:border-white shadow-sm flex items-center gap-4 active:scale-[0.98] transition-all duration-300 hover:shadow-md">
            <div class="w-8 h-8 flex items-center justify-center bg-transparent border border-slate-300 dark:border-white rounded-full text-[10px] font-bold text-slate-700 dark:text-white shrink-0">${startIdx + idx + 1}</div>
            <div class="flex-[1.5] min-w-0">
                <div class="font-bold text-slate-800 dark:text-white text-lg leading-tight mb-2 whitespace-nowrap truncate">${escapeHTML(item.w)}</div>
                <div class="flex items-center gap-2 whitespace-nowrap">
                    <span class="px-1.5 py-0.5 bg-transparent border border-blue-200 dark:border-blue-300 text-blue-700 dark:text-blue-200 italic font-bold text-[10px] rounded-md shrink-0">${escapeHTML(item.p).replace(/[()]/g, '')}</span>
                    <span class="text-slate-500 dark:text-slate-400 font-mono text-[11px] tracking-tight truncate">[ ${escapeHTML(item.ph).replace(/[\/\[\]]/g, '')} ]</span>
                </div>
            </div>
            <div class="flex-1 text-right min-w-0 px-1">
                <div class="text-[13px] text-slate-800 dark:text-white font-bold leading-snug">${escapeHTML(item.m).replace(/[，,]/g, '').replace(/[；;]/g, '<br>')}</div>
            </div>
            <button onclick="playAudio('${item.w.replace(/'/g, "\\'")}', this, event)" class="w-10 h-10 flex items-center justify-center bg-transparent border border-blue-200 dark:border-blue-300 text-blue-700 dark:text-blue-200 rounded-full shrink-0 active:scale-90 transition-all hover:bg-blue-50 dark:hover:bg-blue-900/50">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
            </button>
        </div>
    `).join('');
}
