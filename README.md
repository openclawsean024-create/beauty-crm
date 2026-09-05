# Beauty CRM — 美業客戶長期管理

> 記得客戶做過什麼、多久該回來、如何在不打擾下追蹤

台灣美業（美甲 / 美睫 / 皮膚管理 / 髮型）店家用的輕量 CRM 工作台。聚焦兩個最痛的問題：

1. **療程回流**：哪些客戶該回訪了？回訪什麼療程？什麼時候追蹤才不打擾？
2. **客戶記憶**：客戶的偏好 / 過敏 / 同意狀態 / VIP 等級，跨設計師交接不流失。

完整規格見 [`PRD/SPEC.md`](./PRD/SPEC.md)（v3.0，sweet spot 7.6/10、商業化 83.2/100，建議動作 **GO with strict pilot gate**）。
v0.4.0 design 規格見 [`docs/DESIGN_v0.4.0.md`](./docs/DESIGN_v0.4.0.md)。

---

## Stack

- **Next.js 16**（App Router + Turbopack）
- **React 19**
- **TypeScript 5.6**（strict mode）
- **Vitest 2.1**（unit + integration 測試）
- **ESLint 9**（flat config + `next/typescript` rules）

純前端 in-memory 架構（v1 不含 DB / API），v0.4.0 加 localStorage 持久化（client-side，無密碼保護 — 對齊 SPEC ADR-003）。

---

## Quick Start

```bash
# 需要 Node 20+
nvm use        # 讀 .nvmrc

npm ci         # 安裝依賴（用 lockfile）
npm run dev    # http://localhost:3000

# 其他常用指令
npm test           # vitest 跑所有測試
npm run build      # Next.js production build
npm run lint       # ESLint

# 跑 Lighthouse a11y（DoD-7，需先 build + start）
bash scripts/lighthouse.sh http://localhost:3000
```

CI 跑同樣三件事（lint + test + build），見 [`.github/workflows/ci.yml`](./.github/workflows/ci.yml)。

---

## Deploy to Vercel

v0.4.0 新增 `vercel.json`（Next.js 框架預設），可一鍵部署。

1. 登入 [vercel.com](https://vercel.com)
2. 「Add New Project」→ Import `openclawsean024-create/beauty-crm`
3. **Root Directory** 設為 `beauty-crm-app`（此 repo 是 monorepo，子目錄為 app）
4. Framework Preset: **Next.js**（自動偵測）
5. 點 **Deploy**
6. 部署完成後到「Settings → Environment Variables」— **不需設任何 env**（純前端，無 DB / API key）
7. Custom domain 在「Settings → Domains」設定

部署後網址：`https://beauty-crm-<hash>.vercel.app`
預期路由：`/`（landing）、`/pricing`、`/dashboard`、`/customers`、`/reminders`、`/analytics`、`/broadcast`、`/funnel`、`/settings`、`/privacy`、`/terms`、`/contact`

---

## 專案結構

```
src/
├── app/                     # Next.js App Router
│   ├── layout.tsx          # 根 layout (zh-TW lang) + Noto Sans TC
│   ├── globals.css         # 設計系統 token (DESIGN §1)
│   ├── page.tsx            # / = 公開 landing (DESIGN §7.1)
│   ├── pricing/page.tsx    # /pricing = 公開定價 (DESIGN §7.2)
│   ├── privacy/page.tsx
│   ├── terms/page.tsx
│   ├── contact/page.tsx
│   └── (admin)/             # 7 個 admin page route group
│       ├── layout.tsx      # 包 AppShell + AdminDataProvider
│       ├── dashboard/      # /dashboard
│       ├── customers/      # /customers
│       ├── reminders/      # /reminders
│       ├── analytics/      # /analytics
│       ├── broadcast/      # /broadcast
│       ├── funnel/         # /funnel
│       └── settings/       # /settings
├── components/
│   ├── ui/                 # 11+ 個 design system 元件 (Card / Button / ...)
│   ├── AppShell.tsx        # 桌面 sidebar + mobile bottom nav
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   ├── MobileBottomNav.tsx
│   ├── MobileDrawer.tsx
│   ├── AddTreatmentSheet.tsx
│   └── admin/
│       ├── AdminDataProvider.tsx  # 集中 state + localStorage
│       └── useAdminHandlers.ts
├── lib/                     # 8 個 pure-function domain
│   ├── storage.ts          # v0.4.0 localStorage typed wrapper
│   ├── customers.ts
│   ├── treatments.ts
│   ├── reminders.ts
│   ├── tiers.ts
│   ├── analytics.ts
│   ├── broadcast.ts
│   ├── funnel.ts
│   ├── audit.ts
│   ├── export.ts
│   ├── delete.ts
│   ├── photos.ts
│   └── responsive.ts
tests/
├── *.test.ts               # domain unit test
├── pages.test.tsx          # Privacy / Terms / Contact SSR
├── components/             # 11+ 個 UI 元件 test
└── storage.test.ts         # v0.4.0 storage 測試
PRD/SPEC.md
docs/DESIGN_v0.4.0.md
.github/workflows/ci.yml
.nvmrc
vercel.json                 # v0.4.0 Vercel 設定
CHANGELOG.md
SECURITY_NOTES.md
```

---

## Domain Logic 速覽

| 模組 | 關鍵 API | 用途 |
|---|---|---|
| `customers` | `createCustomer` / `toggleConsent` / `searchCustomers` / `hasAllergyConflict` | 客戶檔案 CRUD + 行銷同意 + 過敏衝突偵測 |
| `treatments` | `recordTreatment` / `treatmentsByCustomer` / `suggestRecallDays` | 療程紀錄 + 4 大類別回訪週期 |
| `reminders` | `computeReminder` / `listOverdue` / `listDueSoon` / `setOverride` | 每位客戶下次回訪日 + 過期清單 + 手動覆寫 |
| `tiers` | `tierForSpend` / `nextTier` / `progressToNextTier` / `applyDiscount` / `tierReason` | 4 級會員 + 折扣 + 觸發原因字串 |
| `analytics` | `computeRevenueByMonth` / `computeCustomerLTV` / `topSpenders` | 月營收 / LTV / Top N |
| `broadcast` | `buildBroadcast` / `selectOverdue` / `selectHighSpenders` / `recheckConsentBeforeSend` / `approve` / `markSent` | 推播模板 + 客戶篩選 + 草稿核准狀態機 |
| `funnel` | `markContacted` / `markBooked` / `getFunnelStage` | 回流漏斗三階段 |
| `export` | `exportEncrypted` / `decryptEncrypted` | Web Crypto AES-GCM + PBKDF2 加密匯出 |
| `delete` | `purgeAllData` | 刪除 + tombstone event |
| `storage` | `load` / `save` / `clear` / `clearAll` | v0.4.0 localStorage typed wrapper |

所有 domain 邏輯都是 **pure function**，沒有副作用，方便測試與未來接 DB。

---

## 測試

```bash
npm test                  # 250+ 個 AC（v0.4.0 加 75 個 component + 14 個 storage）
npm run test:watch        # watch mode
```

涵蓋範圍：
- 8 大 domain 各 1 個 unit test file
- `integration.test.ts` 端到端：新客 → 3 次療程 → 升 silver → 收到回訪推播（撤回同意 → 推播清空）
- 100 客戶批次效能測試（< 2 秒）
- Privacy / Terms / Contact 頁 SSR 測試
- 11 個 UI 元件 + Icon 的 SSR / 結構測試
- `storage` wrapper 的 SSR / 缺值 / 損壞 JSON / quota 測試

---

## 接下來（v2+）

依 SPEC §3.2 / §3.3：

- v2（P1）：密碼保護 localStorage / 多店 / 預約衝突
- v3（P2）：第三方登入 / 簡訊 / LINE OA 整合
- 市場驗證（§11）：5 訪談 → 5 pilot → landing smoke → build sprint

這些都不在 v0.4.0 scope。要擴充請見 SPEC。

---

## License

未指定（v0.4.0 為 internal prototype）。
