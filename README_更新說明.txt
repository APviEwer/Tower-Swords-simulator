Tower & Swords｜GitHub Pages / Discord 發布版 R2

版本：DebugFix23 Release R2
適用遊戲版本：V.2.554

此版本特別針對手機瀏覽器改善：
- 將原本約 15MB 單一 HTML 內嵌的官方 icon 拆成 assets/img 外部檔案。
- index.html 體積大幅下降，iPhone Safari 不需一次解析全部 Base64 圖片。
- 保留操作說明、四頁功能、三語、官方 icon 與既有計算核心。
- 首次進入 R2 時清除舊測試角色狀態一次，之後仍正常保存使用者設定。

GitHub Pages 更新：
1. 將 repository 內舊 index.html 刪除或覆蓋。
2. 上傳本資料夾的 index.html、.nojekyll、assets 資料夾。
3. Commit changes。
4. 等 GitHub Pages 重新部署。

重要：assets 資料夾不可漏傳，否則官方 icon 會顯示失敗。
