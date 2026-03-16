// ===== MAIN INIT =====

window.onload = () => {
    Debug.ui('init');

    // Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => {
                Debug.sw('registered');
                const check = () => { if (reg.waiting) showUpdateToast(reg.waiting); };
                check();
                reg.addEventListener('updatefound', () => {
                    reg.installing.addEventListener('statechange', function () {
                        if (this.state === 'installed') check();
                    });
                });
            })
            .catch(err => Debug.sw('registration failed', err));

        navigator.serviceWorker.addEventListener('controllerchange', () => location.reload());
    }

    loadPrefs();
    state.card.activeList = getSubList(state.range);
    renderHomeScreen();
    Debug.ui('ready');
};
