// ===== QUIZ SETUP =====

function renderQuizSetup() {
    document.getElementById('quiz-setup').classList.remove('hidden');
    document.getElementById('quiz-active').classList.add('hidden');
    document.getElementById('quiz-results').classList.add('hidden');
    state.quiz.phase = 'setup';

    const num = state.dayKey.replace('Day ', '');
    document.getElementById('quiz-setup-day-label').textContent = `DAY ${num}`;

    renderRangePills('quiz-range-pills', state.range, 'setRange');
    selectQuizMode(state.quiz.mode);

    // Show last score
    const progress = loadProgress();
    const prog = progress[state.dayKey] || {};
    const lastScoreEl = document.getElementById('quiz-last-score');
    if (prog.quizBestScore) {
        lastScoreEl.textContent = `上次最佳：${prog.quizBestScore} 分（共 ${prog.quizAttempts} 次測驗）`;
        lastScoreEl.classList.remove('hidden');
    } else {
        lastScoreEl.classList.add('hidden');
    }
}

function selectQuizMode(mode) {
    state.quiz.mode = mode;
    ['en-zh', 'zh-en-type'].forEach(m => {
        const card = document.getElementById('mode-card-' + m);
        if (!card) return;
        card.classList.remove('quiz-mode-card-selected');
    });
    const selected = document.getElementById('mode-card-' + mode);
    if (selected) {
        selected.classList.add('quiz-mode-card-selected');
    }
}

function startQuizFromSetup() {
    document.getElementById('quiz-setup').classList.add('hidden');
    document.getElementById('quiz-active').classList.remove('hidden');
    document.getElementById('quiz-results').classList.add('hidden');
    state.quiz.phase = 'active';
    resetQuiz();
}

function abandonQuiz() {
    if (state.quiz.currentIdx === 0 && !state.quiz.isAnswered) {
        renderQuizSetup(); return;
    }
    showResults();
}

// ===== QUIZ LOGIC =====

function resetQuiz() {
    state.quiz.score      = 0;
    state.quiz.currentIdx = 0;
    state.quiz.log        = [];

    const subList = getSubList(state.range);
    for (let i = subList.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [subList[i], subList[j]] = [subList[j], subList[i]];
    }
    state.quiz.activeList  = subList;
    state.quiz.total       = subList.length;
    state.quiz.allMeanings = vocabData[state.dayKey].map(x => x.m);

    startQuiz();
}

function startQuiz() {
    if (state.quiz.currentIdx >= state.quiz.total) { showResults(); return; }
    state.quiz.isAnswered = false;
    state.quiz.targetWord = state.quiz.activeList[state.quiz.currentIdx];

    document.getElementById('next-quiz-btn').classList.add('hidden');
    document.getElementById('quiz-feedback').classList.add('hidden');

    const progress = (state.quiz.currentIdx / state.quiz.total) * 100;
    document.getElementById('quiz-progress-fill').style.width = progress + '%';
    document.getElementById('quiz-progress-text').textContent = `第 ${state.quiz.currentIdx + 1} / ${state.quiz.total} 題`;
    document.getElementById('quiz-score-display').textContent = `${Math.round(state.quiz.score)} 分`;

    if (state.quiz.mode === 'en-zh') setupMCQ();
    else setupTyping();
}

function setupMCQ() {
    document.getElementById('quiz-options').classList.remove('hidden');
    document.getElementById('quiz-typing').classList.add('hidden');
    document.getElementById('quiz-audio-btn').classList.remove('hidden');
    document.getElementById('quiz-question').innerHTML = `<span class="text-indigo-600 dark:text-indigo-400 text-3xl font-black tracking-tight w-full text-center block">${state.quiz.targetWord.w}</span>`;

    let options = [state.quiz.targetWord.m];
    const allMeanings = state.quiz.allMeanings;
    while (options.length < 4) {
        const rand = allMeanings[Math.floor(Math.random() * allMeanings.length)];
        if (!options.includes(rand)) options.push(rand);
    }
    options.sort(() => Math.random() - 0.5);

    document.getElementById('quiz-options').innerHTML = options.map(opt => `
        <button data-answer="${opt.replace(/"/g, '&quot;')}" onclick="checkMCQAnswer(this)"
            class="mcq-btn w-full text-left p-5 rounded-xl border-2 border-slate-100 dark:border-slate-700 hover:border-indigo-300 hover:bg-indigo-50 transition-all font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 shadow-sm active:scale-[0.98]">${opt}</button>
    `).join('');
}

function setupTyping() {
    document.getElementById('quiz-options').classList.add('hidden');
    document.getElementById('quiz-typing').classList.remove('hidden');
    document.getElementById('quiz-audio-btn').classList.add('hidden');
    document.getElementById('quiz-question').innerHTML = `<div><p class="text-4xl font-black text-slate-800 dark:text-slate-100 leading-tight mb-1">${state.quiz.targetWord.m}</p><p class="text-sm text-slate-500 font-medium">${state.quiz.targetWord.p}</p></div>`;

    state.quiz.revealedPositions = [];
    state.quiz.hintPenalty = 0;

    const input = document.getElementById('typing-input');
    input.value = ''; input.disabled = false; input.focus();
    input.oninput  = () => renderTiles(input.value, false);
    input.onkeydown = (e) => { if (e.key === 'Enter') checkTypingAnswer(); };

    const hintBtn = document.getElementById('hint-btn');
    hintBtn.disabled = false;
    hintBtn.classList.remove('opacity-40', 'pointer-events-none');

    renderTiles('', false);
}

function renderTiles(typed, submitted) {
    const word  = state.quiz.targetWord.w;
    const tiles = document.getElementById('typing-tiles');
    tiles.innerHTML = word.split('').map((char, i) => {
        if (char === ' ') return `<div class="letter-tile tile-space"></div>`;
        const typedChar = typed[i] || '';
        const isHinted  = state.quiz.revealedPositions.includes(i);
        let cls = 'letter-tile', display = '';
        if (submitted) {
            const ok = normalize(typedChar) === normalize(char);
            cls += ok ? ' tile-correct' : ' tile-wrong';
            display = typedChar ? typedChar.toUpperCase() : '?';
        } else if (isHinted) {
            cls += ' tile-hint';
            display = char.toUpperCase();
        } else if (typedChar) {
            cls += ' tile-filled';
            display = typedChar.toUpperCase();
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
    if (unrevealed.length === 0) return;
    state.quiz.revealedPositions.push(unrevealed[0]);
    state.quiz.hintPenalty += 5;
    renderTiles(document.getElementById('typing-input').value, false);
    if (unrevealed.length <= 1) {
        const btn = document.getElementById('hint-btn');
        btn.disabled = true;
        btn.classList.add('opacity-40', 'pointer-events-none');
    }
}

function checkMCQAnswer(btn) {
    if (state.quiz.isAnswered) return;
    state.quiz.isAnswered = true;
    const selected = btn.dataset.answer;
    const correct  = state.quiz.targetWord.m;
    const isCorrect = selected === correct;
    document.querySelectorAll('.mcq-btn').forEach(b => b.disabled = true);
    if (isCorrect) {
        btn.classList.replace('border-slate-100', 'border-green-500');
        btn.classList.add('bg-green-50', 'text-green-700', 'animate-pop');
        state.quiz.score += (100 / state.quiz.total);
    } else {
        btn.classList.replace('border-slate-100', 'border-red-500');
        btn.classList.add('bg-red-50', 'text-red-700', 'animate-shake');
        document.querySelectorAll('.mcq-btn').forEach(b => {
            if (b.dataset.answer === correct) {
                b.classList.replace('border-slate-100', 'border-green-500');
                b.classList.add('bg-green-50');
            }
        });
    }
    state.quiz.log.push({ word: state.quiz.targetWord, isCorrect, userAnswer: selected, pointsEarned: isCorrect ? (100 / state.quiz.total) : 0 });
    finishQuestion();
}

function showTypingFeedback(isCorrect, word) {
    const feedback = document.getElementById('quiz-feedback');
    feedback.classList.remove('hidden');
    const info = `<span class="text-xs text-slate-500 italic mt-1 inline-block">(${word.p}) ${word.ph}</span>`;
    if (isCorrect) {
        feedback.innerHTML = `✅ 答對了！<br>單字：<span class="font-bold text-lg">${word.w}</span><br>${info}`;
        feedback.className = "mt-4 p-5 rounded-xl text-base font-bold bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-2 border-green-200 dark:border-green-800 shadow-sm";
    } else {
        feedback.innerHTML = `❌ 答錯了！<br>正確答案：<span class="font-bold text-lg text-red-700 dark:text-red-400">${word.w}</span><br>${info}`;
        feedback.className = "mt-4 p-5 rounded-xl text-base font-bold bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-2 border-red-200 dark:border-red-800 shadow-sm";
    }
}

function checkTypingAnswer() {
    if (state.quiz.isAnswered) return;
    const input = document.getElementById('typing-input');
    const userAnswer = input.value.trim();
    if (!userAnswer) return;
    state.quiz.isAnswered = true;
    input.disabled = true;
    renderTiles(userAnswer, true);
    const isCorrect = normalize(userAnswer) === normalize(state.quiz.targetWord.w);
    const basePoints = 100 / state.quiz.total;
    const earned = isCorrect ? Math.max(0, basePoints - state.quiz.hintPenalty) : 0;
    if (isCorrect) state.quiz.score += earned;
    state.quiz.log.push({ word: state.quiz.targetWord, isCorrect, userAnswer, pointsEarned: earned });
    showTypingFeedback(isCorrect, state.quiz.targetWord);
    finishQuestion();
}

function finishQuestion() {
    state.quiz.currentIdx++;
    document.getElementById('quiz-score-display').textContent = `${Math.round(state.quiz.score)} 分`;
    const nextBtn = document.getElementById('next-quiz-btn');
    nextBtn.classList.remove('hidden');
    nextBtn.textContent = state.quiz.currentIdx >= state.quiz.total ? '查看結果 ✨' : '下一題 ➔';
}

function advanceQuiz() {
    startQuiz();
}

// ===== QUIZ RESULTS =====

function triggerConfetti(score) {
    if (typeof confetti !== 'function') return;
    
    if (score === 100) {
        // Perfect score: Fireworks
        var duration = 3 * 1000;
        var animationEnd = Date.now() + duration;
        var defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

        function randomInRange(min, max) { return Math.random() * (max - min) + min; }
        var interval = setInterval(function() {
            var timeLeft = animationEnd - Date.now();
            if (timeLeft <= 0) { return clearInterval(interval); }
            var particleCount = 50 * (timeLeft / duration);
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
        }, 250);
    } else if (score >= 80) {
        // Great score: School Pride (side cannons)
        var end = Date.now() + (2 * 1000);
        var colors = ['#4f46e5', '#818cf8', '#ffffff'];
        (function frame() {
            confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors: colors, zIndex: 100 });
            confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors: colors, zIndex: 100 });
            if (Date.now() < end) { requestAnimationFrame(frame); }
        }());
    } else if (score >= 60) {
        // Good score: Basic blast
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, zIndex: 100 });
    }
}

function showResults() {
    document.getElementById('quiz-setup').classList.add('hidden');
    document.getElementById('quiz-active').classList.add('hidden');
    document.getElementById('quiz-results').classList.remove('hidden');
    state.quiz.phase = 'results';

    const score = Math.round(state.quiz.score);
    const total = state.quiz.log.length;
    const correct = state.quiz.log.filter(e => e.isCorrect).length;
    const wrong = state.quiz.log.filter(e => !e.isCorrect);

    // Trigger confetti based on score
    triggerConfetti(score);

    // Header
    const num = state.dayKey.replace('Day ', '');
    document.getElementById('results-day-label').textContent = `DAY ${num} — ${state.quiz.mode === 'en-zh' ? '選擇題' : '拼字填空'}`;
    document.getElementById('results-score').textContent = score;
    const stars = score >= 90 ? '⭐⭐⭐⭐⭐' : score >= 80 ? '⭐⭐⭐⭐' : score >= 70 ? '⭐⭐⭐' : score >= 60 ? '⭐⭐' : '⭐';
    document.getElementById('results-stars').textContent = stars;
    document.getElementById('results-summary').textContent = `答對 ${correct} / ${total} 題`;

    // Missed words
    const missedSection = document.getElementById('missed-section');
    const reviewBtn = document.getElementById('review-missed-btn');
    if (wrong.length > 0) {
        document.getElementById('missed-title').textContent = `答錯的單字（${wrong.length} 個）`;
        missedSection.classList.remove('hidden');
        reviewBtn.classList.remove('hidden');

        const missedList = document.getElementById('missed-list');
        missedList.innerHTML = wrong.map(e => `
            <div class="missed-word-row p-4 flex items-center justify-between gap-3">
                <div class="flex-1">
                    <div class="font-bold text-slate-800 dark:text-slate-100">${e.word.w}</div>
                    <div class="text-xs text-slate-500 dark:text-slate-400">(${e.word.p}) ${e.word.m.replace(/[，,]/g, '').replace(/[；;]/g, '<br>')}</div>
                    ${e.userAnswer && e.userAnswer !== e.word.m ? `<div class="text-xs text-red-400 mt-0.5">你的答案：${e.userAnswer}</div>` : ''}
                </div>
                <button onclick="playAudio('${e.word.w.replace(/'/g, "\\'")}', this, event)" class="p-2 text-slate-400 hover:text-indigo-500 active:scale-90 transition-all flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
                </button>
            </div>
        `).join('');
    } else {
        missedSection.classList.add('hidden');
        reviewBtn.classList.add('hidden');
    }

    // Save
    saveHistory({ dayKey: state.dayKey, range: state.range, mode: state.quiz.mode, score, total, timestamp: Date.now(), log: state.quiz.log });
    const progress = loadProgress();
    const prev = progress[state.dayKey] || {};
    saveProgress(state.dayKey, {
        quizBestScore: Math.max(score, prev.quizBestScore || 0),
        quizAttempts: (prev.quizAttempts || 0) + 1,
    });
    updateWeakWords(state.quiz.log);
    updateStreak();
}

function toggleMissedWords() {
    const list = document.getElementById('missed-list');
    const chevron = document.getElementById('missed-chevron');
    list.classList.toggle('hidden');
    chevron.style.transform = list.classList.contains('hidden') ? '' : 'rotate(180deg)';
}

function retryQuiz() {
    renderQuizSetup();
}

function reviewMissedWords() {
    const wrong = state.quiz.log.filter(e => !e.isCorrect).map(e => e.word);
    if (wrong.length === 0) return;
    state.card.activeList = wrong;
    state.card.idx = 0;
    state.studySubTab = 'cards';
    state._reviewOverride = true;
    switchScreen('study');
}
