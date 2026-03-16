// ===== STUDY SCREEN =====

function renderStudyScreen() {
    // Only reset activeList if not a "review missed words" override
    if (!state._reviewOverride) state.card.activeList = getSubList(state.range);
    state._reviewOverride = false;
    const num = state.dayKey.replace('Day ', '');
    document.getElementById('study-day-label').textContent = `DAY ${num}`;

    renderRangePills('study-range-pills', state.range, 'setRange');
    switchStudySubTab(state.studySubTab);
    initCardSwipes();

    updateStreak();
    saveProgress(state.dayKey, { studiedAt: new Date().toISOString().slice(0, 10) });
}

function switchStudySubTab(subTab) {
    state.studySubTab = subTab;
    const cardsView = document.getElementById('study-cards-view');
    const listView  = document.getElementById('study-list-view');
    const tabCards  = document.getElementById('study-tab-cards');
    const tabList   = document.getElementById('study-tab-list');
    
    // Remove existing animation class to restart it
    cardsView.classList.remove('study-view-fade', 'hidden');
    listView.classList.remove('study-view-fade', 'hidden');

    if (subTab === 'cards') {
        listView.classList.add('hidden');
        cardsView.classList.add('study-view-fade');
        tabCards.classList.add('seg-btn-active');
        tabList.classList.remove('seg-btn-active');
        updateCard();
    } else {
        cardsView.classList.add('hidden');
        listView.classList.add('study-view-fade');
        tabList.classList.add('seg-btn-active');
        tabCards.classList.remove('seg-btn-active');
        initTable();
    }
}

// ===== FLASHCARD =====

let touchStartX = 0;
let touchStartY = 0;
let isSwipeAction = false;
let swipeContainer = null;
let lastSwipeTime = 0;

function initCardSwipes() {
    const card = document.getElementById('flashcard-inner');
    swipeContainer = document.querySelector('.card-flip');
    if (!card || card._swipeInit) return;

    const startSwipe = (x, y) => {
        touchStartX = x;
        touchStartY = y;
        isSwipeAction = false;
        if (swipeContainer) swipeContainer.style.transition = 'none';
    };

    const moveSwipe = (x, y) => {
        const dx = x - touchStartX;
        const dy = y - touchStartY;
        if (Math.abs(dx) > 10) isSwipeAction = true;
        
        if (isSwipeAction && swipeContainer) {
            const rotate = dx * 0.05;
            swipeContainer.style.transform = `translateX(${dx}px) rotate(${rotate}deg)`;
            
            // Visual feedback overlay
            if (dx > 0) {
                card.style.boxShadow = `0 10px 40px rgba(34, 197, 94, ${Math.min(0.4, dx/200)})`;
            } else {
                card.style.boxShadow = `0 10px 40px rgba(239, 68, 68, ${Math.min(0.4, Math.abs(dx)/200)})`;
            }
        }
    };

    const endSwipe = (x, y) => {
        const dx = x - touchStartX;
        const dy = y - touchStartY;
        
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
            lastSwipeTime = Date.now(); // Record the time of an actual swipe/drag to prevent click
        }

        if (swipeContainer) swipeContainer.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
        card.style.boxShadow = ''; 
        
        if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy)) {
            isSwipeAction = true;
            if (dx > 0) {
                swipeContainer.style.transform = `translateX(${window.innerWidth}px) rotate(30deg)`;
                markCardMastery(1);
            } else {
                swipeContainer.style.transform = `translateX(-${window.innerWidth}px) rotate(-30deg)`;
                markCardMastery(-1);
            }
        } else if (swipeContainer) {
            swipeContainer.style.transform = '';
            setTimeout(() => { isSwipeAction = false; }, 50);
        }
    };

    // Touch Events
    card.addEventListener('touchstart', e => startSwipe(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    card.addEventListener('touchmove', e => moveSwipe(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    card.addEventListener('touchend', e => endSwipe(e.changedTouches[0].clientX, e.changedTouches[0].clientY), { passive: true });
    
    card._swipeInit = true;
}

function markCardMastery(delta) {
    const cardObj = state.card.activeList[state.card.idx];
    if (cardObj && typeof updateWordMastery === 'function') {
        updateWordMastery(cardObj.w, delta);
    }
    
    setTimeout(() => {
        if (swipeContainer) {
            swipeContainer.style.transition = 'none';
            swipeContainer.style.transform = '';
        }
        isSwipeAction = false; // Reset swipe state
        nextCard(true); // pass true to skip the fade-out animation
    }, 280);
}

function handleCardClick(e) {
    // If a swipe or drag occurred recently, ignore the click to prevent accidental flips
    if (Date.now() - lastSwipeTime < 500) {
        return;
    }
    
    if (isSwipeAction) {
        isSwipeAction = false;
        return;
    }
    if (!e.target.closest('button')) {
        document.getElementById('flashcard-inner').classList.toggle('flipped');
    }
}

function renderMasteryDots(masteryLevel) {
    const dotsContainer = document.getElementById('card-mastery-dots');
    if (!dotsContainer) return;
    
    let html = '';
    for (let i = 0; i < 3; i++) {
        if (i < masteryLevel) {
            html += `<div class="w-2.5 h-2.5 rounded-full bg-green-400 dark:bg-green-500 shadow-[0_0_8px_rgba(74,222,128,0.6)]"></div>`;
        } else {
            html += `<div class="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700"></div>`;
        }
    }
    dotsContainer.innerHTML = html;
}

function updateCard(animationClass, skipOutAnim) {
    const card = state.card.activeList[state.card.idx];
    if (!card) return;
    const inner = document.getElementById('flashcard-inner');
    
    const applyInAnim = () => {
        inner.classList.remove('flipped');
        document.getElementById('card-word').textContent = card.w;
        document.getElementById('card-info').textContent = `(${card.p}) ${card.ph}`;
        document.getElementById('card-meaning').innerHTML = card.m.replace(/[，,]/g, '').replace(/[；;]/g, '<br>');
        document.getElementById('card-progress').textContent = `${state.card.idx + 1} / ${state.card.activeList.length}`;
        
        if (typeof getWordMastery === 'function') {
            renderMasteryDots(getWordMastery(card.w));
        }

        if (animationClass && typeof animationClass === 'string') {
            inner.classList.add(animationClass + '-in');
            setTimeout(() => inner.classList.remove(animationClass + '-in'), 250);
        }
    };

    if (animationClass && typeof animationClass === 'string' && !skipOutAnim) {
        inner.classList.add(animationClass + '-out');
        setTimeout(() => {
            inner.classList.remove(animationClass + '-out');
            applyInAnim();
        }, 250);
    } else {
        applyInAnim();
    }
    
    saveProgress(state.dayKey, { cardIdx: state.card.idx });
}

function nextCard(skipOutAnim = false) {
    state.card.idx = (state.card.idx + 1) % state.card.activeList.length;
    updateCard('slide-left', skipOutAnim);
}

function prevCard(skipOutAnim = false) {
    state.card.idx = (state.card.idx - 1 + state.card.activeList.length) % state.card.activeList.length;
    updateCard('slide-right', skipOutAnim);
}

// ===== WORD LIST =====

function initTable() {
    const container = document.getElementById('vocab-list-container');
    const displayList = getSubList(state.range);
    const startIdx = state.range === 'all' ? 0 : parseInt(state.range.split('-')[0]) - 1;
    
    container.innerHTML = displayList.map((item, idx) => `
        <div class="vocab-list-item bg-white dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-all" style="--idx: ${idx}">
            <div class="w-8 h-8 flex items-center justify-center bg-slate-50 dark:bg-slate-700 rounded-full text-[10px] font-bold text-slate-400 dark:text-slate-500 shrink-0">
                ${startIdx + idx + 1}
            </div>
            <div class="flex-[1.5] min-w-0">
                <div class="font-bold text-slate-800 dark:text-indigo-400 text-lg leading-tight mb-2 whitespace-nowrap truncate">${item.w}</div>
                <div class="flex items-center gap-2 whitespace-nowrap">
                    <span class="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-500 dark:text-indigo-300 italic font-bold text-[10px] rounded-md shrink-0">
                        ${item.p.replace(/[()]/g, '')}
                    </span>
                    <span class="text-slate-400 dark:text-slate-500 font-mono text-[11px] tracking-tight truncate">
                        [ ${item.ph.replace(/[\/\[\]]/g, '')} ]
                    </span>
                </div>
            </div>
            <div class="flex-1 text-right min-w-0 px-1">
                <div class="text-[13px] text-slate-700 dark:text-slate-200 font-bold leading-snug">${item.m.replace(/[，,]/g, '').replace(/[；;]/g, '<br>')}</div>
            </div>
            <button onclick="playAudio('${item.w.replace(/'/g, "\\'")}', this, event)" class="w-10 h-10 flex items-center justify-center bg-indigo-50 dark:bg-indigo-900/40 text-indigo-500 dark:text-indigo-300 rounded-full shrink-0 active:scale-90 transition-all border border-indigo-100/50 dark:border-indigo-800/50">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
            </button>
        </div>
    `).join('');
}
