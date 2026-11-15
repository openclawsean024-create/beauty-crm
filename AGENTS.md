# AGENTS.md — 美業客戶回訪 CRM（beauty-crm）

## 1. 權威文件與範圍

- 規格：[`PRD/SPEC.md`](./PRD/SPEC.md) v4.0（FR 狀態、合併清單、里程碑）。
- 目前目標：[`GOAL.md`](./GOAL.md)（只含 M1）。
- 驗證指令：[`SOP.md`](./SOP.md)；目前狀態：[`STATUS.md`](./STATUS.md)。
- UI 規格：`PRD/UI-SPEC.md`（舊版，與 v4.0 衝突時以 SPEC v4.0 為準）。
- 商業依據：Notion「可產品化商品」資料庫中的「美業客戶回訪 CRM」（P1）。
- `beauty-crm-concierge` 是待併入的 repo，**只讀**；搬什麼、不搬什麼以 SPEC §10 為準。

## 2. 專案結構

```
src/
├── app/                    # Next.js App Router：layout.tsx、page.tsx（→ Dashboard）、globals.css
├── components/             # 唯一一套工作台：Dashboard.tsx 與分頁（Clients／Retention／Insights／Settings）、
│                           # CustomerMemoryPanel、AddTreatmentSheet、CustomerSheet、Funnel、SessionSwitcher…
└── lib/                    # 純函式 domain（皆有測試）：customers、treatments、reminders、followups、tiers、
                            # analytics、broadcast、persistence、export、i18n；M1 新增 packages、appointments、
                            # effects、accounts、service-catalog、calendar、dates、crm-store、local-store、
                            # permissions、sensitive、recall-settings、recall-queue、kpi、line-reminder、seed
tests/                      # Vitest（26 檔）；tests/e2e 為 Playwright；tests/helpers、tests/fixtures
PRD/                        # SPEC.md、UI-SPEC.md、CHANGELOG.md
*.html（根目錄）            # 靜態設計原型，不參與 build
rpb-*.log（根目錄）         # 舊的建置／測試紀錄，已被 .gitignore 規則涵蓋但仍在版控
```

## 3. 技術棧

| 項目 | 版本／說明 |
|---|---|
| 框架 | Next.js 16.2.10（固定版本，App Router + Turbopack） |
| UI | React 19，自有 CSS token（`src/app/globals.css`），無 UI 套件 |
| 語言 | TypeScript 5.6 strict，路徑別名 `@/* → src/*` |
| 測試 | Vitest 2.1（`environment: node`，`tests/**/*.test.ts`）；Playwright 1.65.1（`tests/e2e`） |
| Lint | ESLint 9 flat config + `eslint-config-next` |
| 資料 | 無後端、無 DB；示範資料在 `src/lib/seed.ts`；全部資料存 localStorage（S 級欄位另存並 Base64 編碼） |
| Node | `.nvmrc` = 20；`engines.node >= 20` |
| 部署 | `vercel.json`（`npm ci` + `npm run build`）；CI 只能手動觸發 production 部署 |

## 4. 開發規則

1. **只用假資料**：seed、測試、fixture、文件範例只能用明顯假資料（姓名加「示範」／「測試」前綴、手機 `09000000xx`、Email `@example.com`）。不得放入真實客戶、試用店家或真人照片。發現疑似真實個資時，不要複製或擴散，回報檔案路徑。
2. **不得提交憑證**：不得把 token、API key、LINE channel secret／access token、金流金鑰、`.env*` 提交進 repo；憑證只透過部署平台或本機環境變數提供。M1 不得讀取任何 LINE 或金流憑證。
3. **測試不可為了通過而刪改斷言**：不得刪除、跳過（`.skip`／`.only`）、放寬既有斷言或改期望值來讓測試通過；行為變更需在 PR 說明原因並對應 FR／AC。
4. **不自動發送**：任何對客訊息都必須經設計師核准；M1 的 LINE 只能是 dry-run，不得呼叫網路。
5. **敏感個資**：過敏、皮膚狀況、健康備註、Before/After 屬 S 級（SPEC §6），需敏感個資同意、預設遮罩、可刪除。
6. **不擴大 scope**：預約排程、POS、AI 推薦、會員自助入口不在 M1；新增需求先改 SPEC 並經 Sean 同意。
7. **依賴**：不引入第二套樣式系統（Tailwind、Framer Motion 等）；新增依賴需在 PR 說明理由並固定版本。
8. **Git**：從 `main` 開分支、以 PR 合併；不直接 push `main`、不 force push、不改 repo 設定；不得在未經 Sean 同意下部署 production、封存或刪除 repo。
9. **Commit 格式**：`<type>(scope): <說明或 FR/AC 編號>`，例如 `feat(line): AC-004 dry-run adapter`。

## 5. 驗證

指令與目前可用狀態見 [`SOP.md`](./SOP.md)。尚未配置的指令（format）不得宣稱已通過。
