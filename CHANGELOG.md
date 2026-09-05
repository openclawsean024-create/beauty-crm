# Changelog

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
