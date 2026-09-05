# Changelog

## v0.3.0 — 2026-09-05 (round 2: 補 audit gap, part 2)

對應 commits `62b15a1` ~ `fd5055d`（見 git log）。
範圍：依 `docs/AUDIT_v1.md` §6 拆法的 Commit 2 + 3，修 §5 高優先 + 中優先區段中：
- FR-009 / AC-010（本地加密匯出 + 刪除 + 裝置警告）— 從 FAIL 修到 PASS
- FR-010 / AC-002-UI / AC-003 / AC-004（手機新增表單 + 單手 UI + 過敏醒目確認）— 從 FAIL / PARTIAL 修到 PASS

### Added
- `src/lib/export.ts`：Web Crypto (PBKDF2 SHA-256 200k iter + AES-GCM 256) 加密工具（FR-009 / AC-010）
  - `encryptToExport(payload, passphrase, opts?)` 回傳 `EncryptedExport` 物件（magic + schemaVersion + kdf + base64 iv/salt/ciphertext）
  - `exportEncrypted(payload, passphrase, opts?)` 將 `EncryptedExport` 包成 Blob（給瀏覽器下載 / localStorage 寫入用）
  - `decryptEncrypted(blobOrObj, passphrase, opts?)` 還原；passphrase 錯誤或檔案被竄改 throw `InvalidPassphraseError`，格式錯誤 throw `ExportFormatError`
  - 純函式 `generateSalt()` / `generateIv()`（random 16 / 12 bytes）
  - 常數 `EXPORT_MAGIC = 'BEAUTY-CRM-EXPORT-V1'`、`EXPORT_SCHEMA_VERSION = 1`、`EXPORT_FILE_EXTENSION = '.beauty-crm.json'`、`EXPORT_KDF_ITERATIONS = 200_000`
- `src/lib/delete.ts`：資料刪除 + tombstone（FR-009 / AC-010）
  - `purgeAllData({ resetFn, scopes?, reason? }, now?)` 執行 reset + dispatch `beauty-crm:purge` 事件 + 回傳 `PurgeResult { wipedAt, tombstoneId, wipedScopes }`
  - `confirmPurgeWithGracePeriod(hours = 24, now?)` 計算未來排程時間（給 round 3 管理員強制路徑）
  - `generateTombstoneId(now?)` 純函式產生 `tomb-<ISO>-<random>` 字串
  - `dispatchTombstone(event)` 廣播 CustomEvent（瀏覽器 / SSR safe）
  - `setDispatchTarget(target)` 測試注入：替換 EventTarget（不依賴 window 在 node env）
- `src/lib/responsive.ts`：RWD 斷點工具
  - `getLayoutMode(width, bp?)` → `'bottom-sheet' | 'centered-modal'`
  - `isSingleHandUi(width, bp?)` → `< mobile = true`
  - `getSheetMaxWidth(mode, viewportWidth)` → `'100%' | 固定 560px`
  - `DEFAULT_BREAKPOINTS` 對齊 SPEC DoD-6（mobile 480 / tablet 900）
- `src/components/AddTreatmentSheet.tsx`：手機單手快速新增 modal（FR-010 / AC-002-UI / AC-004）
  - mobile-first：< 480px bottom sheet（單手可達，CTA 置底放大）+ >= 900px centered modal
  - `useReducer` 管理 draft（`AddTreatmentDraft`），reducer `addTreatmentReducer` 純函式可獨立測
  - 5 大類別 preset 快捷鈕（manicure / eyelash / skincare / hair）套預設服務名 + 價格 + 時長
  - 客戶欄位 autofocus + datalist 搜尋
  - 過敏醒目確認（AC-004）：submit 前 `hasAllergyConflict` 偵測 → 紅色 alert (role=alert) 列衝突成分 + 需勾「已知風險，繼續」
  - 必填驗證：customerId / serviceName / price>0 / durationMin>0，缺漏 submit disabled
  - a11y：role=dialog aria-modal=true aria-labelledby + aria-required + aria-label
  - `data-viewport-mode` / `data-single-hand` 屬性供測試 hook
- `src/components/Dashboard.tsx`：
  - 總覽 tab：「⚠ 裝置共用警告」橫幅（localStorage `device.shared` flag 控制，預設顯示）
  - 總覽 tab：「📦 資料管理」卡片（📤 加密匯出 / 📥 還原備份 / 🗑 刪除所有資料 三鈕，雙重 confirm 防誤觸）
  - 總覽 tab：「快速操作」卡片：＋ 新增服務紀錄按鈕
  - 監聽 `beauty-crm:purge` 事件，更新 `lastPurge` 狀態顯示 tombstone
  - 替換 Round 1 hardcode `Dashboard.tsx:121-125`：`'2026-08-15T00:00:00.000Z'` → 客戶 lastTreatment.performedAt + suggestRecallDays(category) 計算；`'designer-local'` → lastSubmission.designerId
- `tests/export.test.ts`（11 個 AC：round-trip / 錯誤 passphrase / 空資料 / 缺 passphrase / 竄改 ciphertext / 壞 magic / 壞 schema / 純函式隨機性 / 同 data 兩次加密差異 / 副檔名常數）
- `tests/delete.test.ts`（8 個 AC：purgeAllData 回傳 / 預設 4 scopes / dispatch 事件監聽 / 24h grace / 自訂小時 / 負數 throw / tombstoneId 格式 / SSR-safe no-op）
- `tests/addTreatment.test.tsx`（14 個 AC：reducer 5 + SSR markup 8 + recordTreatment 串接 1，用 react-dom/server 不依賴 RTL/jsdom）
- `tests/responsive.test.ts`（10 個 AC：getLayoutMode 三段 / isSingleHandUi / getSheetMaxWidth 兩種 / DEFAULT_BREAKPOINTS 對齊 SPEC DoD-6）

### Changed
- `vitest.config.ts`：`include` 從 `tests/**/*.test.ts` 擴充為 `tests/**/*.test.{ts,tsx}`（讓 `.tsx` 測試被 vitest 抓取）
- `src/components/Dashboard.tsx`：SEED_CUSTOMERS / SEED_TREATMENTS 改用 `useState`（讓 purgeAllData 可清空）
- `src/components/Dashboard.tsx`：「覆寫回訪日」按鈕 hardcode 改為資料驅動計算（見 Added 段說明）

### Deferred (out of round 2，留給 round 3)
- FR-008 / AC：回流漏斗手動標記（ContactLog / AppointmentLog + markContacted/markBooked）
- FR-006 / AC-009：VIP 觸發原因顯示（`tierReason` util + Dashboard reason 文字）
- Gate-1：Privacy / Terms / Contact 頁面
- Gate-2：監控告警 + rollback RUNBOOK
- DoD-3 / DoD-10 / Gate-4 / Gate-5：owner 動作（pilot 啟動、文件簽署，非技術）

### Verified
- `npm test` → 115 passed (was 72, +43 — 11 export + 8 delete + 14 addTreatment + 10 responsive)
- `npm run build` → exit 0
- `npm run lint` → 0 errors（1 warning 在 `eslint.config.mjs` 自身，非 user code）
- `git diff fix/v0.3.0-round1..fix/v0.3.0-round2 -- PRD/` → 0 lines（SPEC §1-§9 未動 ✓）
- `git diff fix/v0.3.0-round1..fix/v0.3.0-round2 -- package.json package-lock.json` → 0 lines（無新 dep ✓）

---

## v0.3.0 — 2026-09-05 (round 1: 補 audit gap)

對應 commits `f371156` ~ `9ee8c1d`（見 git log）。
範圍：依 `docs/AUDIT_v1.md` §6 拆法的 Commit 1、5、6，修 §5 高優先區段中：
- FR-007 / AC-005（照片壓縮 + 同意紀錄）— 從 FAIL 修到 PASS
- FR-005 / AC-007（草稿核准狀態機）— 從 FAIL 修到 PASS
- FR-003（可調週期）、FR-004（手動覆寫）、AC-002 — 從 PARTIAL 修到 PASS

### Added
- `src/lib/photos.ts`：純瀏覽器 Canvas 壓縮 util（FR-007 / AC-005）
  - `compressPhoto(file, opts?)`：迭代 quality（0.92→0.52）直到 < maxSizeKB
  - 環境不可用（node / jsdom 無 polyfill）時 throw `PhotoCompressionError`
    含 'HTMLCanvasElement' / 'node / jsdom' 明確訊息
  - 保留原檔 reference 在 `result.originalBlob`（純前端，不送後端）
  - 支援 `createExporter` / `loadImage` 注入便於 vitest 模擬
- `src/lib/customers.ts`：
  - `PhotoConsent` type（`grantedAt` + `scope: 'before-after' | 'marketing' | 'all'` + `revokedAt?`）
  - `Customer.photoConsent?: PhotoConsent` 欄位
  - `setPhotoConsent(customer, consent)` pure function（傳 consent = 設定；傳 null = 撤回）
- `src/lib/treatments.ts`：
  - `CompressedPhotoRef` type 從 photos.ts 引用
  - `Treatment.photos: CompressedPhotoRef[]` 欄位（`recordTreatment` 初始化 `[]`）
  - `addPhoto(treatment, photo)` pure function（spread 新陣列）
- `src/lib/broadcast.ts`：
  - `BroadcastTarget` 加 `status: 'draft' | 'approved' | 'sent' | 'cancelled'`
  - 加 `approvedBy?` / `approvedAt?` / `sentAt?` 欄位
  - `approve(target, designerId)`：僅 draft 可核准；不可變；必填 designerId
  - `markSent(target, sentAt?)`：必須 approved，否則 throw；不可變
  - `buildBroadcast` 預設 `status: 'draft'`
- `src/lib/reminders.ts`：
  - `Reminder` 加 `overrideAt?` / `overriddenBy?` / `overrideReason?` 欄位
  - `OverrideOptions` type
  - `setOverride(reminder, opts)` pure function
  - `computeReminder` 第 5 / 6 個 optional 參數：`customRules` + `override`
  - 邏輯：override 在未來時間 → 取代 baseRecallDate 重算 daysUntilRecall / status
- `src/components/Dashboard.tsx`：
  - 推播 tab：「✓ 核准草稿」按鈕，呼叫 `approve` 後顯示「✓ 已核准 by ...」
  - 客戶回訪 tab：「覆寫回訪日」按鈕，按下 demo 寫入 `OverrideOptions`
- `tests/photos.test.ts`（8 個 AC）
- `tests/broadcast.test.ts` 新增 describe 'FR-005/AC-007 草稿核准狀態機'（8 個 AC）
- `tests/treatments.test.ts` 新增 2 個 AC（自訂週期）
- `tests/reminders.test.ts` 新增 describe 'FR-003/FR-004/AC-002 可調週期 + 手動覆寫'（6 個 AC）

### Changed
- `src/lib/broadcast.ts`：`recheckConsentBeforeSend` 行為從回傳 boolean 改為 throw
  - 對應 audit §5 「approved 草稿被 revoke consent 時必須 throw」
  - 既有 test AC-008 已更新為 `expect(...).toThrow(/consent/)` + `not.toThrow()` 守 granted 路徑
- `src/lib/treatments.ts`：`suggestRecallDays` 加 optional `customRules` 參數（向後相容）
- `src/lib/treatments.ts`：`DEFAULT_RECALL_DAYS` 改為 `export const`（讓 test 與其他 module 引用）

### Deferred (out of round 1)
- FR-009 / AC-010：本地加密匯出、刪除、裝置警告 → 留給 round 2
- FR-010 / AC-002-UI / AC-003 / AC-004：手機新增表單 + 單手 UI + 過敏醒目確認 → 留給 round 2/3
- FR-008：回流漏斗手動標記 → 留給 round 2
- FR-006 / AC-009：VIP 觸發原因顯示 + 上線閘門文件（Privacy / Terms / Contact）→ 留給 round 3

### Verified
- `npm test` → 72 passed (was 47, +25 — 8 photos + 9 broadcast + 2 treatments + 6 reminders)
- `npm run build` → exit 0
- `npm run lint` → 0 errors（1 warning 在 `eslint.config.mjs` 自身，非 user code）
- `git diff main..fix/v0.3.0-round1 -- PRD/` → 0 changes（SPEC §1-§9 未動）

---

## v0.2.0 — 2026-07-19 (production-ready push)

對應 commits `d782c95` ~ `rpb-2-devops`（見 git log）。

### Changed
- `src/lib/broadcast.ts`: `selectOverdue` 移除硬編碼 28/21/30/45，改呼叫 `suggestRecallDays()`（DRY）
- `src/lib/reminders.ts`: `toDateOnly` 改用本地時區（`getFullYear` / `getMonth` / `getDate`），避免 UTC 跨日 off-by-one
- `package.json`: `lint` script 從 `next lint` 改為 `eslint .`（Next.js 16 已 deprecate `next lint`）

### Added
- `.github/workflows/ci.yml`: push/PR to `main` 觸發，跑 `lint` + `test` + `build`
- `.nvmrc`: 鎖定 Node 20（對齊 `package.json` 的 `engines.node`）
- `README.md`: 專案說明 / Quick Start / 結構 / 腳本
- `SECURITY_NOTES.md`: 安全相關備註
- `tests/broadcast.test.ts`: `selectOverdue` ↔ `listOverdue` 一致性測試（守護 DRY 重構）
- `tests/reminders.test.ts`: 時區正確性測試（Asia/Taipei stubEnv）
- `PLAN.md`: orchestrator 排定的 4-milestone 計畫

### Verified
- `npm test` → 47 passed (was 45, +2)
- `npm run build` → exit 0
- `npm run lint` → exit 0 (1 warning, 0 errors — warning 在 `eslint.config.mjs` 自身，非 user code)
- YAML 結構（`ci.yml`）→ valid

---

## v0.1.0 — 2026-07-18 (initial prototype)

首版 commit `761abda`：Next.js 16 + React 19 + TypeScript + Vitest scaffold，6 大 domain (customers / treatments / reminders / tiers / analytics / broadcast) + Dashboard UI + 7 個 test file (45 AC)。
