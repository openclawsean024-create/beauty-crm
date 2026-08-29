# Changelog

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
