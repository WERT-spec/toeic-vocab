// ===== AUDIO =====

let currentUtterance = null;

function stripDiacritics(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalize(str) {
    return stripDiacritics(str).toLowerCase();
}

function playVocabAudio(type, btn, e) {
    if (e) e.stopPropagation();
    const text = type === 'card'  ? state.card.activeList[state.card.idx]?.w
               : type === 'quiz'  ? state.quiz.targetWord?.w
               : type.length > 3  ? type : '';
    if (text) playAudio(text, btn, e);
}

function playAudio(text, btn, e) {
    if (e) e.stopPropagation();
    if (!window.speechSynthesis) return;
    Debug.audio('play', text);

    speechSynthesis.resume();
    speechSynthesis.cancel();

    if (btn) {
        btn.classList.add('is-speaking');
        setTimeout(() => btn.classList.remove('is-speaking'), 3000);
    }

    currentUtterance = new SpeechSynthesisUtterance(stripDiacritics(text));
    Object.assign(currentUtterance, { lang: 'en-US', rate: 0.9, volume: 1.0 });
    currentUtterance.onend = currentUtterance.onerror = () => btn?.classList.remove('is-speaking');
    setTimeout(() => speechSynthesis.speak(currentUtterance), 50);
}
