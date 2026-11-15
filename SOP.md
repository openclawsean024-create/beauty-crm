# 美業客戶回訪 CRM — 開發與驗證 SOP

## 規格對齊狀態（2026-11-16）

- ✅ `PRD/SPEC.md` v4.0、`GOAL.md` M1。
- ✅ M1 實作於分支 `feat/m1`，八條 AC 皆有通過的測試（見 `STATUS.md`）。
- ✅ `beauty-crm-concierge` 選定模組已併入 `src/lib`（concierge repo 未封存）。
- ⚠️ open PR #1 與分支 `fix/v0.3.0-round3`、`fix/v0.4.0-ui-redesign` 不在 M1 範圍，去留待 Sean 決定。

## 環境

```bash
nvm use          # 讀 .nvmrc（Node 20）
npm ci           # 使用 package-lock.json（vercel.json 與 CI 也用 npm）
```

只使用 npm（`package-lock.json`）；pnpm lockfile 已移除。第一次跑 E2E 前執行 `npx playwright install chromium`。

## 驗證指令（依 `package.json` scripts 查證）

| 類型 | 指令 | 2026-11-16 本機結果（`feat/m1`） |
|---|---|---|
| Install | `npm ci` | 成功 |
| Lint | `npm run lint` | exit 0；0 problems |
| Typecheck | `npm run typecheck`（`tsc --noEmit`） | exit 0 |
| Unit + integration | `npm test`（`vitest run`） | exit 0；26 檔、241 tests |
| 單一測試檔 | `npm test -- tests/<檔名>.test.ts` | — |
| Watch | `npm run test:watch` | 未執行 |
| Build | `npm run build` | exit 0；Next.js 16.2.10 |
| Dev server | `npm run dev`（http://localhost:3000） | 未執行 |
| Start | `npm start` | 啟動後 `GET /` 回 200 |
| E2E | `npm run e2e`（Playwright；自動 build 並 `next start`，固定 `Asia/Taipei`，每個測試清空 localStorage） | exit 0；4 spec、24 tests |
| 單一 E2E | `npm run e2e -- tests/e2e/<檔名>.spec.ts` | — |
| Format | — | 尚未配置 |
| Secret 掃描 | `git grep -nIE "(sk-[A-Za-z0-9]{10,}\|AKIA[0-9A-Z]{12,}\|ghp_[A-Za-z0-9]{20,}\|-----BEGIN)" -- src tests .github` | 無結果 |

本機驗證環境：Node v26.13.1（`.nvmrc` 為 20；CI 用 20）。

M1 完成條件，下列指令須全部 exit 0：

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run e2e
```

### AC 驗證指令對照

| AC | 指令 |
|---|---|
| AC-001 | `npm test -- tests/packages.test.ts tests/appointments.test.ts tests/effects.test.ts tests/service-catalog.test.ts tests/accounts.test.ts tests/calendar.test.ts` |
| AC-002 | `npm run e2e -- tests/e2e/merge-panels.spec.ts` |
| AC-003 | `npm test -- tests/customer-store.test.ts tests/recall-settings.test.ts`；`npm run e2e -- tests/e2e/add-visit.spec.ts` |
| AC-004 | `npm test -- tests/line-reminder.test.ts` |
| AC-005 | `npm test -- tests/permissions.test.ts`；`npm run e2e -- tests/e2e/role-switch.spec.ts` |
| AC-006 | `npm test -- tests/sensitive-consent.test.ts tests/customer-delete.test.ts`；`npm run e2e -- tests/e2e/consent-mask.spec.ts` |
| AC-007 | `npm test -- tests/fixtures-safety.test.ts` |
| AC-008 | `npm test -- tests/quality-gate.test.ts` 與上面五項指令 |

## CI 現況（`.github/workflows/ci.yml`）

- lint、typecheck、test、build、e2e 五個 job，任一失敗即失敗；沒有 `continue-on-error` 或 `|| echo`。
- Production 部署只能透過 `workflow_dispatch` 手動勾選 `deploy_production`，且需五個 job 全部通過；push 不會部署。

## M1 開發流程

1. 讀 `AGENTS.md`、`GOAL.md`、`PRD/SPEC.md` 對應章節。
2. 每個 AC 開一個分支與 PR，PR 標題含 AC 編號。
3. 先寫測試，再實作；只用假資料。
4. 跑上表指令並把 exit code 記到 `STATUS.md`。
5. 不 push `main`、不部署 production；合併由 Sean 決定。

## 故意不做（M1）

- ❌ 真實 LINE 發送、LINE token。
- ❌ 計費、金流金鑰、發票。
- ❌ 真實客戶或試用店家資料、真人照片。
- ❌ 後端、資料庫、真實登入、production 部署設定變更。
