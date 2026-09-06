# Beauty CRM — Changelog

> 本檔記錄 beauty-crm 規格書與工程交付物版本歷史。
> SPEC 主文件：`PRD/SPEC.md`（v3.0.2 fleet 補丁，v3.0 sweet-spot 內容完整保留）。
> v3.0.2 完成於 2026-09-06 by Sean 10-repo-fleet。

---

## v3.0.2 — 2026-09-06 (fleet upgrade)

**類型**：fleet-level engineering contract 補丁
**升級執行**：Sean 10-repo-fleet（worker agent，rank #25）
**GitHub**：`https://github.com/openclawsean024-create/beauty-crm`

### 動機

v3.0（2026-07-19 forced upgrade）完成 sweet-spot 體檢（7.6/10）、5 問量表、6 條 ADR、6 條市場驗證，文件強度達標；但 §7 部署契約僅口頭描述，缺可驗收的工程交付物：
- 缺標準化 4-job CI workflow
- 缺 Definition of Done 對齊 fleet 規範
- 缺 PRD/CHANGELOG.md 對齊版本歷史

v3.0.2 補齊這層工程契約，後續 sprint 才有可驗收的 CI 結果。

### Changed

- `PRD/SPEC.md`：頂部加 v3.0.2 banner + 新增 §A v3.0.2 增量章節（升級原因、§1–§15 對齊、工程交付物、Definition of Done、不變更項宣告）
- v3.0 既有 §0–§15 完整保留（sweet=7.6、商業化=83.2 不重做體檢）

### Added

- `PRD/CHANGELOG.md`：本檔（v0.1.0 / v0.2.0 / v3.0 / v3.0.2 四個條目）
- `.github/workflows/ci.yml`：4-job workflow
  - `lint`：`npm run lint`（0 error 容錯）
  - `test`：`npm test -- --run`（47 條 vitest AC）
  - `build`：`npm run build` + artifact upload
  - `deploy`：push to main → Vercel deploy（需 `VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` secrets）

### Verified

- `npm install --legacy-peer-deps` → 344 packages
- `npm run lint` → 0 error（1 warning：`eslint.config.mjs` 自身的 anonymous default export，非 user code）
- `npm test` → **47/47 passed**（7 個 test file：customers / treatments / reminders / tiers / analytics / broadcast / integration）
- `npm run build` → Next.js 16.2.10 + Turbopack，Compiled successfully，3 static routes（`/`、 `/_not-found`）
- 不修改 domain 邏輯（6 個 pure-function lib 維持原樣）
- 不引入 heavyweight dependency

### DoD

- [x] `PRD/SPEC.md` v3.0.2 banner + §A 增量
- [x] `PRD/CHANGELOG.md` 4 條版本
- [x] `.github/workflows/ci.yml` 4 jobs
- [x] lint 0 error
- [x] test 47/47
- [x] build 0 error
- [x] deploy target = Vercel（Next.js 16 預設）

---

## v3.0 — 2026-07-19 (forced upgrade)

**類型**：sweet-spot-driven rewrite
**升級執行**：Sean PRD Rewrite Specialist
**文件 SHA**：`8581a1b7adde774fae03f951dd7bab2813fe9dbd`

### 動機

依 OpenClaw 一人公司 12 SPEC v3.0 升級清單（第 3 件，前 2：pos-multitrade / emed-glp1），本檔 forced v3.0 upgrade。

### Changed

- §0 文件資訊表（版本、SHA、sweet 7.6、商業化 83.2、action=GO with strict pilot gate）
- §15.11 v3.0 統一 Sweet Spot 5 問量表（Q1=8.5 / Q2=7.5 / Q3=6.5 / Q4=8.0 / Q5=7.5，加總 38/50 = sweet 7.6）
- §15.12 ADR 補強（6 條：不做預約/POS、本地優先、人工核准、v3.0 公式、>7 GO gate、不重寫 §1-§14）
- §15.13 市場驗證補強（Fresha / Dolyu / Folio / StyleSeat / Booksy 5 個 peer HTTP 200 OK 驗證 + PTT BeautySalon 板活躍度）

### Verified

- sweet 6 → 7.6（+1.6，Q1/Q4 evidence 補強且扣分項重評）
- 行動 investigate → GO with strict pilot gate
- 商業化 70.5 → 83.2（新公式 `30 + sweet×7`）

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
