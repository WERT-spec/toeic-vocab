// ===== QUIZ =====

const QUIZ_PANELS = ['quiz-setup', 'quiz-active', 'quiz-results'];
let quizTimerId = null;
let quizStartTime = 0;
const QUIZ_TIME_LIMIT = 8000; // 8 seconds

function showQuizPanel(panel) {
    QUIZ_PANELS.forEach(id => {
        const el = $(id);
        if (id === panel) {
            el.classList.remove('hidden');
            if (id === 'quiz-results') el.style.display = 'flex';
        } else {
            el.classList.add('hidden');
            if (id === 'quiz-results') el.style.display = '';
        }
    });
}

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// ===== SETUP =====

function renderQuizSetup() {
    showQuizPanel('quiz-setup');
    state.quiz.phase = 'setup';
    Debug.quiz('setup', state.dayKey);

    let label = `DAY ${state.dayKey.replace('Day ', '')}`;
    if (state.range === 'favorites') label = '重點測驗 (星號)';
    if (state.range === 'weak') label = '易錯測驗';
    $('quiz-setup-day-label').textContent = label;
    renderRangePills('quiz-range-pills', state.range, 'setRange');
    selectQuizMode(state.quiz.mode);

    const prog = loadProgress()[state.dayKey] || {};
    const el = $('quiz-last-score');
    if (prog.quizBestScore) {
        el.textContent = `上次最佳：${prog.quizBestScore} 分（共 ${prog.quizAttempts} 次測驗）`;
        el.classList.remove('hidden');
    } else {
        el.classList.add('hidden');
    }
}

function selectQuizMode(mode) {
    state.quiz.mode = mode;
    Debug.quiz('mode', mode);
    document.querySelectorAll('.quiz-mode-card').forEach(c => c.classList.remove('quiz-mode-card-selected'));
    $('mode-card-' + mode)?.classList.add('quiz-mode-card-selected');
}

function startQuizFromSetup() {
    showQuizPanel('quiz-active');
    state.quiz.phase = 'active';
    resetQuiz();
}

function abandonQuiz() {
    clearInterval(quizTimerId);
    if (state.quiz.currentIdx === 0 && !state.quiz.isAnswered) { renderQuizSetup(); return; }
    showResults();
}

// ===== QUIZ LOGIC =====

function resetQuiz(customList) {
    clearTimeout(quizTimerId);
    Object.assign(state.quiz, { score: 0, currentIdx: 0, log: [] });
    const subList = customList ? shuffle([...customList]) : shuffle(getSubList(state.range));
    Object.assign(state.quiz, {
        activeList: subList,
        total: subList.length,
        allMeanings: vocabData[state.dayKey].map(x => x.m),
    });
    Debug.quiz('reset', subList.length, 'words');
    startQuiz();
}

function startQuiz() {
    const { quiz } = state;
    if (quiz.currentIdx >= quiz.total) { showResults(); return; }

    quiz.isAnswered = false;
    quiz.targetWord = quiz.activeList[quiz.currentIdx];
    Debug.quiz('question', quiz.currentIdx + 1, quiz.targetWord.w);

    $('next-quiz-btn').classList.add('hidden');
    $('quiz-feedback').classList.add('hidden');

    const pct = (quiz.currentIdx / quiz.total) * 100;
    $('quiz-progress-fill').style.width = pct + '%';
    $('quiz-progress-text').textContent = `第 ${quiz.currentIdx + 1} / ${quiz.total} 題`;
    $('quiz-score-display').textContent = `${Math.round(quiz.score)} 分`;

    quiz.mode === 'zh-en-type' ? setupTyping() : setupMCQ();
    startQuizTimer();
}

function startQuizTimer() {
    const timerFill = $('quiz-timer-fill');
    if (!timerFill) return;
    
    timerFill.style.transition = 'none';
    timerFill.style.width = '100%';
    timerFill.className = 'h-full bg-blue-500 transition-all duration-100 ease-linear';
    
    quizStartTime = Date.now();
    
    quizTimerId = setInterval(() => {
        if (state.quiz.isAnswered) { clearInterval(quizTimerId); return; }
        
        const elapsed = Date.now() - quizStartTime;
        const remaining = Math.max(0, QUIZ_TIME_LIMIT - elapsed);
        const p = (remaining / QUIZ_TIME_LIMIT) * 100;
        
        timerFill.style.width = `${p}%`;
        
        if (p < 30) {
            timerFill.classList.replace('bg-blue-500', 'bg-rose-500');
        }
        
        if (remaining <= 0) {
            clearInterval(quizTimerId);
            handleTimeout();
        }
    }, 50);
}

function handleTimeout() {
    if (state.quiz.mode === 'zh-en-type') checkTypingAnswer(true);
    else checkMCQAnswer(null, true);
}

function setupMCQ() {
    $('quiz-options').classList.remove('hidden');
    $('quiz-typing').classList.add('hidden');
    
    if (state.quiz.mode === 'listen-mcq') {
        $('quiz-question').innerHTML = '';
        $('quiz-listen-only').classList.remove('hidden');
        $('quiz-audio-btn').classList.add('hidden');
    } else {
        $('quiz-listen-only').classList.add('hidden');
        $('quiz-audio-btn').classList.remove('hidden');
        $('quiz-question').innerHTML = `<span class="text-blue-600 dark:text-blue-400 text-3xl font-black tracking-tight w-full text-center block">${escapeHTML(state.quiz.targetWord.w)}</span>`;
    }
    setTimeout(() => playVocabAudio('quiz'), 200);

    const correct = state.quiz.targetWord.m;
    const options = [correct];
    const uniqueMeanings = [...new Set(state.quiz.allMeanings)].filter(m => m !== correct);

    while (options.length < 4 && uniqueMeanings.length > 0) {
        const randomIndex = Math.floor(Math.random() * uniqueMeanings.length);
        options.push(uniqueMeanings.splice(randomIndex, 1)[0]);
    }
    shuffle(options);

    $('quiz-options').innerHTML = options.map(opt => `
        <button data-answer="${escapeHTML(opt).replace(/"/g, '&quot;')}" onclick="checkMCQAnswer(this)"
            class="mcq-btn w-full text-left p-5 rounded-xl border-2 border-slate-100 dark:border-slate-700 hover:border-blue-300 hover:bg-blue-50 transition-all font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 shadow-sm active:scale-[0.98]">${escapeHTML(opt)}</button>
    `).join('');
}

function setupTyping() {
    $('quiz-options').classList.add('hidden');
    $('quiz-typing').classList.remove('hidden');
    $('quiz-audio-btn').classList.add('hidden');
    $('quiz-listen-only').classList.add('hidden');

    const { targetWord } = state.quiz;
    $('quiz-question').innerHTML = `<div><p class="text-4xl font-black text-slate-800 dark:text-slate-100 leading-tight mb-1">${escapeHTML(targetWord.m)}</p><p class="text-sm text-slate-500 font-medium">${escapeHTML(targetWord.p)}</p></div>`;

    state.quiz.revealedPositions = [];
    state.quiz.hintPenalty = 0;

    const input = $('typing-input');
    input.value = ''; input.disabled = false; input.focus();
    input.oninput = () => renderTiles(input.value, false);
    input.onkeydown = e => { if (e.key === 'Enter') checkTypingAnswer(); };

    const hintBtn = $('hint-btn');
    hintBtn.disabled = false;
    hintBtn.classList.remove('opacity-40', 'pointer-events-none');

    renderTiles('', false);
}

function renderTiles(typed, submitted) {
    $('typing-tiles').innerHTML = state.quiz.targetWord.w.split('').map((char, i) => {
        if (char === ' ') return `<div class="letter-tile tile-space"></div>`;
        const tc = typed[i] || '';
        const isHinted = state.quiz.revealedPositions.includes(i);

        let cls = 'letter-tile', display = '';
        if (submitted) {
            cls += normalize(tc) === normalize(char) ? ' tile-correct' : ' tile-wrong';
            display = tc ? tc.toUpperCase() : '?';
        } else if (isHinted) {
            cls += ' tile-hint'; display = char.toUpperCase();
        } else if (tc) {
            cls += ' tile-filled'; display = tc.toUpperCase();
        }
        return `<div class="${cls}" style="animation-delay:${submitted ? i * 60 : 0}ms">${display}</div>`;
    }).join('');
}

function giveHint() {
    const word = state.quiz.targetWord.w;
    const unrevealed = [...word].reduce((acc, c, i) => {
        if (c !== ' ' && !state.quiz.revealedPositions.includes(i)) acc.push(i);
        return acc;
    }, []);
    if (!unrevealed.length) return;

    state.quiz.revealedPositions.push(unrevealed[0]);
    state.quiz.hintPenalty += 5;
    Debug.quiz('hint', unrevealed.length - 1, 'remaining');
    renderTiles($('typing-input').value, false);

    if (unrevealed.length <= 1) {
        const btn = $('hint-btn');
        btn.disabled = true;
        btn.classList.add('opacity-40', 'pointer-events-none');
    }
}

// ===== ANSWER CHECKING =====

function checkMCQAnswer(btn, isTimeout = false) {
    if (state.quiz.isAnswered) return;
    state.quiz.isAnswered = true;
    clearInterval(quizTimerId);

    const selected = btn ? btn.dataset.answer : null;
    const correct = state.quiz.targetWord.m;
    const isCorrect = selected === correct;
    
    const timeElapsed = Date.now() - quizStartTime;
    const fastBonus = isCorrect && timeElapsed < 3000 ? 5 : 0;

    const basePts = isCorrect ? (100 / state.quiz.total) : 0;
    const points = basePts + (isCorrect ? fastBonus : 0);

    Debug.quiz('mcq', isCorrect ? '✓' : '✗', state.quiz.targetWord.w);

    document.querySelectorAll('.mcq-btn').forEach(b => b.disabled = true);

    if (btn && isCorrect) {
        btn.classList.replace('border-slate-100', 'border-emerald-500');
        btn.classList.add('bg-emerald-50', 'text-emerald-700', 'animate-pop');
        state.quiz.score += points;
    } else if (btn) {
        btn.classList.replace('border-slate-100', 'border-rose-500');
        btn.classList.add('bg-rose-50', 'text-rose-700', 'animate-shake');
    }
    
    if (!isCorrect) {
        document.querySelectorAll('.mcq-btn').forEach(b => {
            if (b.dataset.answer === correct) {
                b.classList.replace('border-slate-100', 'border-emerald-500');
                b.classList.add('bg-emerald-50');
            }
        });
    }

    state.quiz.log.push({ word: state.quiz.targetWord, isCorrect, userAnswer: isTimeout ? 'TIMEOUT' : selected, pointsEarned: points });
    finishQuestion();
}

function checkTypingAnswer(isTimeout = false) {
    if (state.quiz.isAnswered) return;
    const input = $('typing-input');
    const userAnswer = input.value.trim();
    if (!isTimeout && !userAnswer) return;

    state.quiz.isAnswered = true;
    clearInterval(quizTimerId);
    input.disabled = true;
    renderTiles(userAnswer, true);

    const isCorrect = normalize(userAnswer) === normalize(state.quiz.targetWord.w);
    
    const timeElapsed = Date.now() - quizStartTime;
    const fastBonus = isCorrect && timeElapsed < 4000 ? 5 : 0;

    const basePts = (100 / state.quiz.total);
    const earned = isCorrect ? Math.max(0, basePts + fastBonus - state.quiz.hintPenalty) : 0;
    if (isCorrect) state.quiz.score += earned;

    Debug.quiz('typing', isCorrect ? '✓' : '✗', state.quiz.targetWord.w, 'pts', earned);

    state.quiz.log.push({ word: state.quiz.targetWord, isCorrect, userAnswer: isTimeout ? 'TIMEOUT' : userAnswer, pointsEarned: earned });
    showTypingFeedback(isCorrect, state.quiz.targetWord);
    finishQuestion();
}

function showTypingFeedback(isCorrect, word) {
    const fb = $('quiz-feedback');
    fb.classList.remove('hidden');
    const info = `<span class="text-xs text-slate-500 italic mt-1 inline-block">(${escapeHTML(word.p)}) ${escapeHTML(word.ph)}</span>`;
    if (isCorrect) {
        fb.innerHTML = `✅ 答對了！<br>單字：<span class="font-bold text-lg">${escapeHTML(word.w)}</span><br>${info}`;
        fb.className = 'mt-4 p-5 rounded-xl text-base font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-2 border-emerald-200 dark:border-emerald-800 shadow-sm';
    } else {
        fb.innerHTML = `❌ 答錯了！<br>正確答案：<span class="font-bold text-lg text-rose-700 dark:text-rose-400">${escapeHTML(word.w)}</span><br>${info}`;
        fb.className = 'mt-4 p-5 rounded-xl text-base font-bold bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border-2 border-rose-200 dark:border-rose-800 shadow-sm';
    }
}

function finishQuestion() {
    state.quiz.currentIdx++;
    $('quiz-score-display').textContent = `${Math.round(state.quiz.score)} 分`;
    const btn = $('next-quiz-btn');
    btn.classList.remove('hidden');
    btn.textContent = state.quiz.currentIdx >= state.quiz.total ? '查看結果 ✨' : '下一題 ➔';
}

function advanceQuiz() { startQuiz(); }

// ===== RESULTS =====

function triggerConfetti(score) {
    if (typeof confetti !== 'function') return;

    if (score === 100) {
        const end = Date.now() + 3000;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };
        const rand = (a, b) => Math.random() * (b - a) + a;
        const iv = setInterval(() => {
            const t = end - Date.now();
            if (t <= 0) return clearInterval(iv);
            const n = 50 * (t / 3000);
            confetti({ ...defaults, particleCount: n, origin: { x: rand(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount: n, origin: { x: rand(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);
    } else if (score >= 80) {
        const end = Date.now() + 2000;
        const colors = ['#4f46e5', '#818cf8', '#ffffff'];
        (function frame() {
            confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors, zIndex: 100 });
            confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors, zIndex: 100 });
            if (Date.now() < end) requestAnimationFrame(frame);
        })();
    } else if (score >= 60) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, zIndex: 100 });
    }
}

function showResults() {
    clearInterval(quizTimerId);
    showQuizPanel('quiz-results');
    state.quiz.phase = 'results';

    const score = Math.round(state.quiz.score);
    const correct = state.quiz.log.filter(e => e.isCorrect).length;
    const wrong = state.quiz.log.filter(e => !e.isCorrect);
    const total = state.quiz.log.length;

    Debug.quiz('results', score, 'pts,', correct, '/', total, 'correct');
    triggerConfetti(score);

    const num = state.dayKey.replace('Day ', '');
    $('results-day-label').textContent = `DAY ${num} — ${state.quiz.mode === 'en-zh' ? '選擇題' : '拼字填空'}`;
    $('results-score').textContent = score;
    $('results-stars').textContent = score >= 90 ? '⭐⭐⭐⭐⭐' : score >= 80 ? '⭐⭐⭐⭐' : score >= 70 ? '⭐⭐⭐' : score >= 60 ? '⭐⭐' : '⭐';
    $('results-summary').textContent = `答對 ${correct} / ${total} 題`;

    const missedSection = $('missed-section');
    const reviewBtn = $('review-missed-btn');

    if (wrong.length) {
        $('missed-title').textContent = `答錯的單字（${wrong.length} 個）`;
        missedSection.classList.remove('hidden');
        reviewBtn.classList.remove('hidden');
        $('missed-list').innerHTML = wrong.map(e => `
            <div class="missed-word-row p-4 flex items-center justify-between gap-3">
                <div class="flex-1">
                    <div class="font-bold text-slate-800 dark:text-slate-100">${escapeHTML(e.word.w)}</div>
                    <div class="text-xs text-slate-500 dark:text-slate-400">(${escapeHTML(e.word.p)}) ${escapeHTML(e.word.m).replace(/[，,]/g, '').replace(/[；;]/g, '<br>')}</div>
                    ${e.userAnswer && e.userAnswer !== e.word.m ? `<div class="text-xs text-rose-400 mt-0.5">你的答案：${escapeHTML(e.userAnswer)}</div>` : ''}
                </div>
                <button onclick="playAudio('${e.word.w.replace(/'/g, "\\'")}', this, event)" class="p-2 text-slate-400 hover:text-blue-500 active:scale-90 transition-all flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
                </button>
            </div>
        `).join('');
    } else {
        missedSection.classList.add('hidden');
        reviewBtn.classList.add('hidden');
    }

    saveHistory({ dayKey: state.dayKey, range: state.range, mode: state.quiz.mode, score, total, timestamp: Date.now(), log: state.quiz.log });
    const prev = loadProgress()[state.dayKey] || {};
    saveProgress(state.dayKey, {
        quizBestScore: Math.max(score, prev.quizBestScore || 0),
        quizAttempts: (prev.quizAttempts || 0) + 1,
    });
    updateWeakWords(state.quiz.log);
    updateStreak();
}

function toggleMissedWords() {
    const list = $('missed-list');
    const chevron = $('missed-chevron');
    list.classList.toggle('hidden');
    chevron.style.transform = list.classList.contains('hidden') ? '' : 'rotate(180deg)';
}

function retryQuiz() { renderQuizSetup(); }

function reviewMissedWords() {
    const wrong = state.quiz.log.filter(e => !e.isCorrect).map(e => e.word);
    if (!wrong.length) return;
    state.card.activeList = wrong;
    state.card.idx = 0;
    state.studySubTab = 'cards';
    state._reviewOverride = true;
    switchScreen('study');
}
