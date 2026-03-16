// ===== AUDIO =====

let currentUtterance = null;

function playVocabAudio(type, btnElement, event) {
    if (event) event.stopPropagation();
    try {
        let text = '';
        if (type === 'card') text = state.card.activeList[state.card.idx].w;
        else if (type === 'quiz') text = state.quiz.targetWord.w;
        else if (typeof type === 'string' && type.length > 3) text = type; // direct word
        if (text) playAudio(text, btnElement, event);
    } catch(e) { console.error('Audio error:', e); }
}

function normalize(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function playAudio(text, btnElement, event) {
    if (event) event.stopPropagation();
    if (!window.speechSynthesis) return;
    window.speechSynthesis.resume();
    window.speechSynthesis.cancel();
    if (btnElement) {
        btnElement.classList.add('is-speaking');
        setTimeout(() => btnElement.classList.remove('is-speaking'), 3000);
    }
    const normalizedText = text.normalize('NFD').replace(/[̀-ͯ]/g, '');
    currentUtterance = new SpeechSynthesisUtterance(normalizedText);
    currentUtterance.lang = 'en-US';
    currentUtterance.rate = 0.9;
    currentUtterance.volume = 1.0;
    currentUtterance.onend = () => { if (btnElement) btnElement.classList.remove('is-speaking'); };
    currentUtterance.onerror = () => { if (btnElement) btnElement.classList.remove('is-speaking'); };
    setTimeout(() => window.speechSynthesis.speak(currentUtterance), 50);
}
