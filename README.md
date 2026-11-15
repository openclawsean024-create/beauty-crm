# Beauty CRM — 美業客戶回訪 CRM

> 記得客戶做過什麼、多久該回來、如何在不打擾下追蹤

台灣小型美業店家（美甲／美睫／皮膚管理／髮型）用的回訪工作台。規格見 [`PRD/SPEC.md`](./PRD/SPEC.md) v4.0，目前里程碑見 [`GOAL.md`](./GOAL.md)（M1）。

> ⚠️ **M1 是本機示範版**：沒有後端、沒有真實登入、沒有欄位加密。資料只存在瀏覽器的 localStorage，**只能使用假資料**。LINE 提醒只有 dry-run，不會發送任何訊息。

---

## Stack

- **Next.js 16.2.10**（固定版本，App Router + Turbopack）
- **React 19**、**TypeScript 5.6**（strict）
- **Vitest 2.1**（單元／整合測試）、**Playwright 1.65.1**（E2E）
- **ESLint 9**（flat config + `next/typescript`）
- 自有 CSS token（`src/app/globals.css`），不使用 UI 套件

---

## Quick Start

```bash
nvm use        # 讀 .nvmrc（Node 20）
npm ci         # 只使用 package-lock.json
npm run dev    # http://localhost:3000
```

第一次開啟會載入示範資料（全部虛構：姓名有「示範」前綴、手機 `09000000xx`）。設定分頁可「清除本機全部資料」或「重新載入示範資料」（店主）。

## 指令

| 指令 | 用途 |
|---|---|
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest：26 個測試檔、241 個測試 |
| `npm run build` | Next.js production build |
| `npm start` | 啟動 build 後的版本 |
| `npm run e2e` | Playwright：4 個 spec、24 個測試（自動 build 並啟動；固定 `Asia/Taipei`、每個測試清空 localStorage） |

第一次跑 E2E 前需要安裝瀏覽器：`npx playwright install chromium`。

CI（[`.github/workflows/ci.yml`](./.github/workflows/ci.yml)）在 PR 與 push 時跑 lint、typecheck、test、build、e2e，任一失敗即失敗。Production 部署**不會**自動觸發，只能手動執行 workflow 並勾選 `deploy_production`，且需全部檢查通過。

---

## 功能（M1）

- **今日工作台**：回訪佇列（依逾期天數排序）、客戶記憶面板、KPI、回流漏斗（應回訪 → 已聯絡 → 已預約）、回流節奏。所有數字都由資料計算。
- **客戶記憶面板**：同意狀態（行銷／敏感個資分開）、敏感資料（預設遮罩）、套票剩餘堂數、下次預約、Before/After 效果摘要（本機示意圖，非照片）、回訪草稿。
- **新增客戶／服務**：服務寫入療程資料並立即重算回訪日；可扣套票；與過敏紀錄衝突時需確認才可儲存。
- **回訪草稿與 LINE dry-run**：草稿編輯會保存；設計師核准後才可產生 LINE push payload，寫入本機「發送紀錄」，狀態為 `dry-run`，不連網。
- **多店與權限**：可切換示範帳號（店主／店長／設計師）與店別，畫面依 `can(account, action, resource)` 隱藏資料與動作。
- **設定**：4 類回訪天數、服務品項、團隊與設計師檔案、匯出（含個資警告）、清除本機資料。

## 專案結構

```
src/
├── app/                 # layout、page（→ Dashboard）、globals.css
├── components/          # 唯一一套工作台：Dashboard 與各分頁、面板、表單
└── lib/                 # 純函式 domain（皆有測試）
    ├── customers / treatments / reminders / followups / tiers / analytics / broadcast
    ├── packages / appointments / effects / accounts / service-catalog / calendar / dates   # 併自 concierge
    ├── crm-store        # 資料寫入（含權限與同意檢查）
    ├── local-store      # localStorage 儲存（S 級欄位另存並 Base64 編碼）
    ├── permissions / sensitive / recall-settings / recall-queue / kpi / line-reminder
    ├── seed             # 示範資料（全部虛構）
    └── persistence / export / i18n
tests/                   # Vitest；tests/e2e 為 Playwright；tests/helpers、tests/fixtures
PRD/                     # SPEC.md v4.0、UI-SPEC.md（舊）
*.html（根目錄）         # 靜態設計原型，不參與 build
```

## 資料儲存

| localStorage key | 內容 |
|---|---|
| `beauty-crm:m1:data` | 客戶一般資料、療程、套票、預約、草稿、聯絡／發送／同意紀錄、設定（JSON，**不含** S 級欄位） |
| `beauty-crm:m1:sensitive` | 過敏、皮膚狀況、健康備註、效果紀錄（Base64 **編碼，不是加密**） |
| `ritual-beauty-crm-v3` | 語言、主題（與舊版來訪紀錄） |

安全限制見 [`SECURITY_NOTES.md`](./SECURITY_NOTES.md)。

## License

未指定（內部原型）。
