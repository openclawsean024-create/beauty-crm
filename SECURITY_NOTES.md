# Security Notes — beauty-crm（M1）

> 本檔記錄 M1（分支 `feat/m1`）實際行為。架構變動（後端、登入、加密）後必須更新。

## 威脅模型

- **資料敏感度**：客戶姓名、手機、Email（P 級）；過敏、皮膚狀況、健康備註、Before/After 效果紀錄（S 級，見 SPEC §6）。
- **攻擊面**：純前端（Next.js）。沒有 API route、沒有後端、沒有資料庫、沒有任何對外網路呼叫。
- **信任邊界**：完全信任瀏覽器與使用這台裝置的人。**M1 只允許假資料**，不可部署給真實店家使用。

## 持久化（實際行為）

M1 **有**持久化，全部存在瀏覽器 localStorage：

| key | 內容 | 保護方式 |
|---|---|---|
| `beauty-crm:m1:data` | 一般資料（客戶 P 級欄位、療程、套票、預約、草稿、聯絡／LINE dry-run／同意紀錄、設定） | 明文 JSON；S 級欄位在寫入前已抽離 |
| `beauty-crm:m1:sensitive` | 過敏、皮膚狀況、健康備註、效果紀錄與膚況指標 | **Base64 編碼，不是加密**：只避免明文出現在開發者工具或截圖中，任何能讀 localStorage 的人都能還原 |
| `ritual-beauty-crm-v3` | 語言、主題、舊版 visitLog | 明文 |

真正的欄位級加密、金鑰管理與 server-side 儲存屬於 M2。

## ✅ M1 已落實

| 項目 | 實作位置 | 驗證 |
|---|---|---|
| 敏感個資同意與行銷同意分開；未同意不可儲存 S 級欄位 | `src/lib/sensitive.ts`、`crm-store.ts` | `tests/sensitive-consent.test.ts` |
| 撤回敏感個資同意時立即清除 S 級資料與效果紀錄 | `crm-store.setSensitiveConsent` | 同上、`tests/e2e/consent-mask.spec.ts` |
| 同意紀錄（時間、操作者） | `ConsentRecord` | `tests/sensitive-consent.test.ts` |
| S 級欄位 UI 預設遮罩，需明確點擊顯示；換客戶後重新遮罩 | `CustomerMemoryPanel.tsx` | `tests/e2e/consent-mask.spec.ts` |
| 本機資料或 S 級保管箱讀不出來時不覆寫，只有店主明確清除或重新載入示範資料才覆寫 | `local-store.readCrmState`、`useCrmStore.ts` | `tests/customer-store.test.ts`、`tests/e2e/consent-mask.spec.ts` |
| 店主可刪除單一客戶（連同全部相關資料）、清除本機全部資料 | `crm-store.deleteCustomer`、`local-store.clearLocalData` | `tests/customer-delete.test.ts` |
| 匯出檔標註「含個資」、未加密警告與格式版本 | `src/lib/export.ts` | `tests/sensitive-consent.test.ts`、E2E |
| 權限矩陣：跨店拒絕、S 級只限店主／店長／負責設計師、匯出與刪除只限店主；改負責設計師與變更敏感個資同意也需 S 級寫入權限 | `src/lib/permissions.ts`、`crm-store.ts` | `tests/permissions.test.ts`（59 tests） |
| 無權限者拿到的客戶資料已清空 S 級欄位（不只是畫面隱藏） | `permissions.viewCustomer` | 同上 |
| LINE 只有 dry-run：不讀 LINE 憑證、不連網 | `src/lib/line-reminder.ts` | `tests/line-reminder.test.ts`（mock fetch 呼叫 0 次） |
| 只用明顯假資料；自動掃描非假號碼與非 example.com Email | `tests/fixtures-safety.test.ts` | — |
| Before/After 只用內嵌 SVG 示意圖，不載入任何圖片或遠端資源 | `EffectSummary.tsx` | `tests/e2e/merge-panels.spec.ts` |
| 無 hardcoded secrets | 全 repo | `git grep` secret 掃描無結果 |
| React 自動 escape，無 `dangerouslySetInnerHTML` | `src/components` | — |
| CI 不吞錯；production 部署只能手動觸發 | `.github/workflows/ci.yml` | `tests/quality-gate.test.ts` |

## ⚠️ M1 限制

1. **沒有真實登入**：身分切換是本機示範帳號，任何人都能切成店主。權限只在前端檢查，不是安全邊界。
2. **沒有加密**：S 級欄位只是 Base64 編碼。
3. **單一裝置**：沒有同步、沒有備份；清除瀏覽器資料即遺失。
4. **稽核紀錄不完整**：只有同意變更紀錄；匯出、刪除未記錄（FR-023，M2）。

## 🔒 M2 必須做

- [ ] 後端 + 真實登入 + server-side 權限檢查
- [ ] S 級欄位欄位級加密，金鑰不入 repo
- [ ] 稽核紀錄（同意、匯出、刪除）
- [ ] 隱私權政策與同意書文案（個資法第 8 條告知事項）
- [ ] CSP header、依賴漏洞掃描

## 報告問題

發現資安問題請直接聯絡維護者。
