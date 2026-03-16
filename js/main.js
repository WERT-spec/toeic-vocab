// ===== MAIN INIT =====

window.onload = () => {
    // 0. Register Service Worker for PWA Offline Support
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker registered', reg))
            .catch(err => console.error('Service Worker registration failed', err));
    }

    // 1. Load preferences and saved state
    loadPrefs();
    
    // 2. Initialize the study list based on saved state
    state.card.activeList = getSubList(state.range);
    
    // 3. Render initial screen
    renderHomeScreen();
};
