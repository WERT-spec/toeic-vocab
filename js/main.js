// ===== MAIN INIT =====

window.onload = () => {
    // 0. Register Service Worker (App Shell PWA)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => {
                // 偵測到新版 SW waiting → 顯示更新提示
                const checkUpdate = (reg) => {
                    if (reg.waiting) showUpdateToast(reg.waiting);
                };
                checkUpdate(reg);
                reg.addEventListener('updatefound', () => {
                    reg.installing.addEventListener('statechange', function() {
                        if (this.state === 'installed') checkUpdate(reg);
                    });
                });
            })
            .catch(err => console.error('SW registration failed', err));

        // SW 控制權轉移後重新載入，套用新殼層
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            window.location.reload();
        });
    }

    // 1. Load preferences and saved state
    loadPrefs();
    
    // 2. Initialize the study list based on saved state
    state.card.activeList = getSubList(state.range);
    
    // 3. Render initial screen
    renderHomeScreen();
};
