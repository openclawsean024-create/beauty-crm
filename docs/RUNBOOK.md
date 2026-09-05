# Beauty CRM v0.3.0 — Runbook

> 對齊 `PRD/SPEC.md` §6.2 上線閘門 Gate-2（監控告警 + rollback）。
> 本檔為 v1 純前端應用的故障 / 降級處理手冊。
> 對應 Error Code 字典見 `PRD/SPEC.md §10.4`。

---

## 1. 「匯出失敗」（EXPORT_FAILED）

### 症狀
- Dashboard「📤 加密匯出」按下後，UI 顯示「匯出失敗：{錯誤訊息}」且無 .beauty-crm.json 檔下載。

### 可能原因
- `passphrase.length < 8`：密碼太短（已由 Dashboard 預檢）
- 瀏覽器不支援 `crypto.subtle.deriveKey`（舊版 Safari < 11）
- 磁碟空間不足（會 throw DOMException）

### 處置
1. 確認輸入密碼 ≥ 8 字元
2. 確認瀏覽器版本（推薦 Chrome ≥ 90、Firefox ≥ 88、Safari ≥ 14）
3. 若仍失敗，請把以下資訊 email 給 owner（見 /contact）：
   - 錯誤訊息全文
   - 瀏覽器 / OS 版本
   - 預期匯出的客戶數 / 療程數
4. **資料不會遺失** — in-memory store 仍存在，可稍後重試

### 對應程式碼
- `src/lib/export.ts:144-146`（passphrase 太短 throw）
- `src/components/Dashboard.tsx:97-100`（UI 顯示錯誤訊息）

---

## 2. 「刪除卡住」

### 症狀
- Dashboard「🗑 刪除所有資料」按下後，UI 無反應或 double confirm 卡住。

### 可能原因
- `window.confirm` 被瀏覽器阻擋（罕見，僅發生在某些 popup-blocker 啟用時）
- `purgeAllData` 的 `resetFn` throw（reset function 內部錯誤）

### 處置
1. 確認瀏覽器 popup-blocker 設定
2. 強制重新整理頁面（Cmd+R / Ctrl+R）— 純前端 in-memory 應用，重新整理會清空資料
3. 若 tombstone 事件未 dispatch（lastPurge 仍顯示舊值），檢查 console：
   ```js
   window.dispatchEvent(new CustomEvent('beauty-crm:purge', { detail: { ... } }));
   ```
4. **資料在重新整理後即清空**，若需保留請先匯出備份

### 對應程式碼
- `src/lib/delete.ts:88-115`（purgeAllData 流程）
- `src/components/Dashboard.tsx:125-144`（handlePurge 雙重 confirm）

---

## 3. 「provider 失敗」降級

### 背景
- v0.3.0 純前端 in-memory，**沒有外部 LLM / API 呼叫**。
- 但 SPEC §5.3 提到「保留輸入 + 給下一步」的降級原則 — 對應到 v0.3.0 的內部操作。

### 對應到 v0.3.0 的「降級場景」

| Error Code | 場景 | v0.3.0 降級行為 |
|---|---|---|
| `EXPORT_FAILED` | 加密匯出失敗 | 保留原資料，UI 顯示錯誤，可重試 |
| `DELETE_FAILED` | 刪除 dispatch 失敗 | 保留原資料，UI 顯示「刪除未完成」狀態 |
| `CONSENT_REQUIRED` | 客戶同意未 granted | `recheckConsentBeforeSend` throw，阻擋 send |
| `LOW_CONFIDENCE` | 過敏成分衝突 | `AddTreatmentSheet` 紅色 alert + 需勾「已知風險，繼續」 |

### 未來 v2 對接外部 LLM 時
- `PROVIDER_TIMEOUT` / `PROVIDER_FAILED` → 保留草稿 + 顯示「稍後重試」按鈕
- 不得 silent fail — 所有降級需有 UI 訊息與 audit log 紀錄

---

## 4. 「CI 紅燈」處理

### 症狀
- `.github/workflows/ci.yml` 任一步驟失敗（lint / test / build）

### 處置
1. 點進 GitHub Actions 失敗的 workflow run，看是哪一步：
   - **lint**：`npm run lint`，本地修完後 push
   - **test**：`npm test`，看是哪個 AC 紅了；若是預期內的 breaking change，更新對應 test
   - **build**：`npm run build`，看 TypeScript 錯誤訊息
2. 若是 `PRD/SPEC.md` 變更導致，請確認：
   - 是否在 `git diff main..HEAD -- PRD/` 內（v0.3.0 規範禁止）
   - 若必要更新 SPEC，請開 PR 並通知 owner
3. 若是 v0.3.0 範圍外的 code（如其他 repo 依賴），請開 issue 標記 owner

### 對應程式碼
- `.github/workflows/ci.yml:31-38`（CI 跑 lint + test + build）

---

## 5. Audit log 查詢（DoD-8）

### 場景
- 客戶反映「我從沒同意過行銷，為什麼收到 LINE？」
- 設計師想看「我上次什麼時候核准了哪則推播？」

### 處置
- v1 沒有持久化 audit log（純前端，關瀏覽器即清空）
- 生產環境前請把 `src/lib/audit.ts` 的 console.debug 串接到 Sentry / OpenTelemetry
- 短期處置：請客戶在場時 demo 操作一次，並把 console 紀錄給 owner 留存

### 對應程式碼
- `src/lib/audit.ts`（in-memory event log）

---

## 6. 已知限制（v1）

| 限制 | 影響 | 何時解 |
|---|---|---|
| 純 in-memory，關瀏覽器即清空 | 需定期匯出備份 | v2 加 IndexedDB |
| 沒有 audit log 持久化 | 跨 session 查不到 | v2 加 Sentry / OTel |
| 沒有真實 LLM / API 呼叫 | 無法生成個人化訊息 | v2+ 評估 |
| 沒有真實 5 pilot 驗證 | sweet spot 仍假設 | owner 啟動 §11 SOP |

---

對應 Gate-2 / DoD-5 / DoD-8；production 環境上線前需擴充（接 Sentry / OTel / 真實 monitoring）。
