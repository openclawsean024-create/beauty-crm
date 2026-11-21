# Changelog

## v0.3.1 — 2026-11-22（M1 審查修正，分支 `fix/m1-review`）

### Fixed
- 權限：改負責設計師、變更敏感個資同意都需要 S 級寫入權限（店主、店長、負責設計師）；UI 同步隱藏或停用
- 新增最新一筆服務時作廢上一輪回訪草稿，避免草稿卡在「已發送」；補登過去日期不影響
- 洞察頁月營收改用本地日期分月，與首頁 KPI 一致
- 本機資料或 S 級保管箱讀不出來時，不再用示範資料覆寫；顯示警告，變更不保存，店主可下載原始資料備份
- 寫入失敗時提示，不再顯示成功；頁面跨過午夜會更新「今天」
- 新增服務的套票選單依服務日期篩選

## v0.3.0 — 2026-11-16（M1，分支 `feat/m1`）

依 `GOAL.md` M1 與 `PRD/SPEC.md` v4.0。

### Added
- concierge 資料模型與邏輯：套票、預約、Before/After 效果與膚況改善、顧問（設計師檔案）、服務品項目錄、月曆格（AC-001）
- 資料寫入 store、localStorage 持久化、回訪天數設定、由資料計算的 KPI 與回流漏斗（AC-002、AC-003）
- LINE 回訪提醒 dry-run adapter（AC-004）
- 多店與帳號權限矩陣、示範帳號切換（AC-005）
- 敏感個資同意、同意紀錄、遮罩、刪除客戶、清除本機資料、匯出個資警告（AC-006）
- 假資料掃描測試（AC-007）；Playwright E2E、typecheck script（AC-008）

### Changed
- 所有 seed、測試、原型改為明顯假資料
- `next` 固定為 16.2.10；移除 pnpm lockfile；移除 `output: 'standalone'`
- CI 不再吞錯，新增 typecheck、e2e；production 部署改為手動觸發

### Removed
- 未被引用的 `src/components/workbench/*`（舊 seed 移到 `tests/fixtures/`）、`WorkspaceSwitcher.tsx`

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
