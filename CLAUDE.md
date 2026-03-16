# CLAUDE.md

本檔案為 Claude Code（claude.ai/code）在此專案中操作時提供指引。

## 執行方式

無需建置步驟。直接用瀏覽器開啟 `index.html` 即可。本專案不使用 npm、建置工具或套件管理器。

## 架構

這是一個純 Vanilla JavaScript 的單頁應用程式（SPA），用於 TOEIC 單字學習。無框架、無打包工具，直接載入 HTML、CSS 與 JS。

**核心檔案：**
- [index.html](index.html) — 完整應用殼層；透過 CDN 引入 Tailwind CSS，包含分頁結構與天次選擇器
- [js/vocab.js](js/vocab.js) — 單字資料；目前已填入第 01–06 天
- [js/store.js](js/store.js) — 全域狀態與 LocalStorage 邏輯
- [js/audio.js](js/audio.js) — Web Speech API 語音播放邏輯
- [js/ui.js](js/ui.js) — 共用導覽、深色模式與基礎 UI 組件邏輯
- [js/main.js](js/main.js) — 應用程式進入點與初始化
- [js/views/](js/views/) — 按功能劃分的視圖邏輯 (home, study, quiz, stats)
- [css/style.css](css/style.css) — 3D 翻卡動畫、深色模式配色、漸層等自訂樣式

**三種學習模式（分頁）：**
1. **列表** — 以表格顯示所有單字，每個單字附有發音按鈕
2. **單字卡** — 3D CSS 翻轉動畫；可用範圍選擇器篩選單字
3. **測驗** — 選擇題（英→中）與拼字填空（中→英）；自動洗牌並計分

**狀態管理：** `store.js` 中的 `state` 物件管理全域狀態。

**深色模式：** Tailwind `class` 策略；透過 localStorage 切換，套用於 `<html>` 元素

**音訊：** 使用瀏覽器內建 Web Speech Synthesis API（無預錄音檔）；語速設為 0.9

## 使用環境

使用者透過 Safari 瀏覽器開啟，並使用「加入主畫面」功能將 App 安裝為 PWA，在桌面像一般 App 一樣使用。`manifest.json` 與三個 icon 檔案（icon-180.png、icon-192.png、icon-512.png）為必要檔案，請勿刪除。

**PWA 開發注意事項（iOS / Safari）：**
- 必須保留 `<meta name="apple-mobile-web-app-capable" content="yes">` 與 `apple-mobile-web-app-status-bar-style` 為 `black-translucent`，這樣 iOS PWA 才會讓 Webview 延伸到頂部狀態列下方，讓應用程式的自訂背景色（如 `.app-nav-bar`）能正確顯示。
- 如果使用者反映更新 PWA 後佈局跑掉或頂部出現黑色區塊，這是因為 iOS 會死記住初次「加入主畫面」時的狀態。唯一的解法是**刪除桌面舊的 PWA，然後重新打開 Safari 再次「加入主畫面」**。

## 新增單字資料

若要新增天次，請依照現有格式擴充 [js/vocab.js](js/vocab.js) 中的匯出物件：
```js
"day07": [
  { w: "word", p: "n.", ph: "/wɜːrd/", m: "中文意思" },
  ...
]
```
第 07–30 天在 UI 中皆可選取，若無資料則顯示空白。

## 開發與版本控制

任何對此專案的修改完成後，**必須**自動將更動同步（Commit & Push）到 GitHub 儲存庫 `https://github.com/WERT-spec/toeic-vocab.git`，以保持遠端版本為最新狀態。

本地與遠端均使用 `main` 分支。
