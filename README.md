# NOCAP Open Frequency

使用 Node.js 22 或更新版本。執行 `npm ci` 安裝套件，再執行 `npm run dev` 開啟本機頁面。

將 `.env.example` 複製為 `.env`，填入 `NUXT_PUBLIC_LIFF_ID`。部署時也要設定同名環境變數，並在 LINE Developers Console 將 LIFF Endpoint URL 設為部署後的 HTTPS 首頁。沒有設定 LIFF ID 時仍可在一般瀏覽器預覽。

`npm run build` 建置後可用 `node .output/server/index.mjs` 啟動。兌換目前延用測試版，在前端抽取並使用測試密碼 `1121`，正式活動需另接後端核銷。

首頁 `/` 是 LIFF 個人資料測試頁。請在 LIFF 設定勾選 `profile` 權限。登入後畫面只顯示 LINE 使用者 ID 和大頭照。原活動頁可從 `/poster` 開啟。
