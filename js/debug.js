// ===== STRUCTURED DEBUG =====
// 使用方式：在 Console 輸入 Debug.on() 開啟，Debug.off() 關閉

const Debug = (() => {
    const isOn = () => {
        try { return !!JSON.parse(localStorage.getItem('toeic_debug')); }
        catch { return false; }
    };

    const log = (ns, color) => (...args) => {
        if (!isOn()) return;
        console.log(`%c[${ns}]`, `color:${color};font-weight:bold`, ...args);
    };

    return {
        store: log('Store', '#5856d6'),
        audio: log('Audio', '#e67e22'),
        ui:    log('UI',    '#2ecc71'),
        home:  log('Home',  '#3498db'),
        study: log('Study', '#9b59b6'),
        quiz:  log('Quiz',  '#e74c3c'),
        stats: log('Stats', '#1abc9c'),
        sw:    log('SW',    '#f39c12'),
        on()  { localStorage.setItem('toeic_debug', '1'); console.log('%c[Debug] ON — reload to see all logs', 'color:#2ecc71;font-weight:bold'); },
        off() { localStorage.setItem('toeic_debug', '0'); console.log('%c[Debug] OFF', 'color:#e74c3c;font-weight:bold'); },
    };
})();
