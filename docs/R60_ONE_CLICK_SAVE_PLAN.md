# R60｜一鍵授權儲存（測試分支規格）

**狀態：授權與部署尚未完成；不可在正式站宣稱已能一鍵儲存。**

## 使用者流程
1. 使用者直接編輯詞條／特性（或未來其他表格）並預覽；不產生個人草稿或額外匯入匯出 UI。
2. 點「儲存修改」。
3. 管理員首次使用時透過 GitHub 正規 OAuth／GitHub App 授權；授權期間直接送交修改。
4. 後端驗證 GitHub 身分 **APviEwer**、授權操作及提交內容，驗證成功後寫入測試分支，結果為成功才顯示「儲存成功」。
5. GitHub Actions 針對表格數值與結構驗證；正式版發布須另行驗收、核准。

## 安全邊界
- GitHub Pages 不儲存 GitHub App private key、client secret、installation token 或 PAT。
- 網頁不嵌入長期存取權杖；GitHub 身分驗證與授權寫入由小型服務處理。
- 後端必須驗證 GitHub API 回傳的 *user id/login* 以及指定 repo / branch；僅由瀏覽器送來的 login/name 不可信。
- 只允許提交到白名單資料檔案（起步：`data/traits.json`），不接受任意 path、workflow、HTML 或腳本寫入。
- 資料校驗：`schema=1`、`kind=traits`、max 20 行／12 欄、trait 19 行／14 欄；行內容欄位完整、尺寸限制、版本衝突需拒絕。
- 防跨站請求偽造：帶狀態碼的 OAuth / PKCE、CSRF 防護、限流、明確同源政策及短期會話。
- 不使用 GitHub API token 作為公開網頁永久憑證。
- 即使一般玩家能在本機修改預覽，也不可提交正式共用資料。

## 待完成
- 選定並部署可支援 GitHub App OAuth 與安全憑證的最小授權服務；網站目前只有 GitHub Pages，無法直接安全處理 OAuth secret。
- GitHub App 最小權限設定（Contents: Read and write，僅限指定儲存庫），Owner 初始化；私鑰只能設定在服務 secrets。
- 受權限保護的 API / schema validation / conflict detection / 回滾。
- R54/R59 表格與 API 正式整合及端到端瀏覽器測試。
- 合併至 main 及正式版前，再經使用者審核。

**不會自動動到 production main。**
