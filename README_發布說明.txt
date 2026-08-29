Tower & Swords｜Build & Damage Analysis
GitHub Pages / Discord Release

發布檔案：
- index.html  網站入口（請勿改名）
- .nojekyll    告知 GitHub Pages 直接發布靜態檔案

版本：DebugFix23 / DC Release R1

初始資料規則：
- 此 Release 第一次在某個瀏覽器開啟時，會清除舊的 tower-sword-v1 測試狀態。
- 使用者開始操作後，狀態仍會正常儲存在該瀏覽器 localStorage。
- 重新整理頁面不會反覆重置。

基本安全：
- CSP 限制為本頁、自帶 data/blob 資源，不允許對外 connect。
- Referrer 設為 no-referrer。
- 無伺服器、無帳號、無資料上傳功能；使用者設定只留在自己的瀏覽器。

版權：Copyright © APviEwer. All Rights Reserved.
