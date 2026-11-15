# 美業客戶回訪 CRM — 開發與驗證 SOP

## 規格對齊狀態（2026-11-16）

- ✅ `PRD/SPEC.md` v4.0 已依實際程式重建；`GOAL.md` 定義 M1。
- ⚠️ 本次只重建文件，尚未依 v4.0 開發。
- ⚠️ `beauty-crm-concierge` 尚未併入（M1 AC-001／AC-002）。
- ⚠️ open PR #1 與分支 `fix/v0.3.0-round3`、`fix/v0.4.0-ui-redesign` 未合併，去留待 Sean 決定。

## 環境

```bash
nvm use          # 讀 .nvmrc（Node 20）
npm ci           # 使用 package-lock.json（vercel.json 與 CI 也用 npm）
```

repo 同時有 `package-lock.json` 與 `pnpm-lock.yaml`；以 npm 為準。`pnpm-workspace.yaml` 內 `allowBuilds` 的值仍是未填的佔位文字，不要用 pnpm 安裝。

## 驗證指令（依 `package.json` scripts 查證）

| 類型 | 指令 | 狀態 | 2026-11-16 本機結果 |
|---|---|---|---|
| Install | `npm ci` | 可用 | 成功 |
| Lint | `npm run lint` | 可用（`eslint .`） | exit 0；1 個 warning（`eslint.config.mjs` anonymous default export） |
| Typecheck | `npm run typecheck` | **尚未配置** | 沒有此 script。直接跑 `npx tsc --noEmit` 目前 exit 2：`tests/persistence.test.ts:154` 型別轉換錯誤（AC-008 處理） |
| Unit + integration | `npm test` | 可用（`vitest run`） | exit 0；12 檔、77 tests 通過（`tests/integration.test.ts` 含在內） |
| 單一測試檔 | `npm test -- tests/<檔名>.test.ts` | 可用 | — |
| Watch | `npm run test:watch` | 可用 | 未執行 |
| Build | `npm run build` | 可用（`next build`） | exit 0；Next.js 16.2.10，路由 `/`、`/_not-found` |
| Dev server | `npm run dev` | 可用（`next dev`，http://localhost:3000） | 未執行 |
| Start | `npm start` | script 存在（`next start`） | **未驗證**；`next.config.mjs` 設 `output: 'standalone'`，正式啟動方式待確認 |
| E2E | `npm run e2e` | **尚未配置** | 無 Playwright 設定（AC-008 新增） |
| Format | — | **尚未配置** | 無 formatter |
| Secret 掃描 | `git grep -nIE "(sk-[A-Za-z0-9]{10,}\|AKIA[0-9A-Z]{12,}\|ghp_[A-Za-z0-9]{20,}\|-----BEGIN)" -- src tests .github` | 可用（git 指令） | 無結果 |

本機驗證環境：Node v26.13.1（高於 `.nvmrc` 的 20；CI 用 20）。

尚未配置的指令不得當成通過。M1 完成時，下列指令須全部 exit 0：

```bash
npm run lint
npm run typecheck   # M1 新增
npm test
npm run build
npm run e2e         # M1 新增
```

## CI 現況（`.github/workflows/ci.yml`）

- lint job 設 `continue-on-error: true`；test job 為 `npm test -- --run 2>&1 || echo "no test script"`，**測試失敗也不會讓 CI 失敗**。
- build 後上傳 `dist/`，但 Next 不產生 `dist/`（`if-no-files-found: ignore`）。
- main push 會用 `VERCEL_TOKEN` 等 secrets 部署 Vercel production。
- 以上在 M1 AC-008 修正；本次文件 PR 不改 CI。

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
