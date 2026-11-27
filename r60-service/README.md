# R60 一鍵儲存授權橋接｜尚未上線

這是獨立測試分支的安全授權服務，**尚未部署，也未接到正式 V2.3**。Node.js serverless function 可用 Vercel 類服務承載；GitHub Pages 本身不能運行此服務。

## 路由
- GET /api/r60/start?nonce=<32 hex> 開始 GitHub App user OAuth
- GET /api/r60/callback 檢查 state，驗證 GitHub user id，將限時授權交回原頁
- GET /api/r60/snapshot 讀取資料及 Git SHA（不修改資料）
- POST /api/r60/save 帶限時 Bearer grant，驗證使用者 GitHub ID、資料結構和前一版 SHA 後，僅能更新測試分支 `data/traits.json`

## 必填私有環境變數（不可提交值至 GitHub）
- R60_GITHUB_APP_CLIENT_ID：GitHub App Client ID
- R60_GITHUB_APP_CLIENT_SECRET：GitHub App Client Secret
- R60_CALLBACK_URL：例如 https://<deploy-host>/api/r60/callback
- R60_ALLOWED_ORIGIN：未來正式表格所在網域 Origin（僅 scheme + host，不含 path）
- R60_ENCRYPTION_KEY：32 bytes 隨機值（64 位 hex）
- R60_ADMIN_GITHUB_USER_ID：GitHub API user numeric id（與用戶名不同，經授權後核對）

## 安全限制
- 使用 GitHub App 細粒度 Repository contents: Read & write，僅安裝到指定的儲存庫。
- 僅授權指定 GitHub ID；沒有 GitHub 登入或沒有寫入權限的玩家只能預覽編輯。
- 15 分鐘時效加密授權、OAuth state 簽章和逾時、明確 CORS Origin、Git SHA 衝突檢查。
- 只可寫入測試分支的 `data/traits.json`，資料表行數／欄位不可被修改。
- 部署前尚需接前端的 OAuth popup、提交 API 與 UI 成功／失敗提示；需完成端到端驗證、伺服器端限流與告警，再開正式發布。
- **GitHub token 不得暴露於 HTML/JS；部署者須確保環境變數不會被公開。**

## 接下來
1. 建立並安裝細粒度 GitHub App，完成托管服務／環境變數設定。
2. 將表格直接編輯「儲存修改」連接授權橋接服務，實測無權限、錯誤／過期憑證、版本衝突與成功提交。
3. 測試分支驗證成功且使用者確認後，才評估正式分支發布。
