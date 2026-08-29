# Beauty CRM — 美業客戶長期管理

> 記得客戶做過什麼、多久該回來、如何在不打擾下追蹤

台灣美業（美甲 / 美睫 / 皮膚管理 / 髮型）店家用的輕量 CRM 工作台。聚焦兩個最痛的問題：

1. **療程回流**：哪些客戶該回訪了？回訪什麼療程？什麼時候追蹤才不打�？
2. **客戶記憶**：客戶的偏好 / 過敏 / 同意狀態 / VIP 等級，跨設計師交接不流失。

完整規格見 [`PRD/SPEC.md`](./PRD/SPEC.md)（v3.0，sweet spot 7.6/10、商業化 83.2/100，建議動作 **GO with strict pilot gate**）。

---

## Stack

- **Next.js 16**（App Router + Turbopack）
- **React 19**
- **TypeScript 5.6**（strict mode）
- **Vitest 2.1**（unit + integration 測試）
- **ESLint 9**（flat config + `next/typescript` rules）

純前端 in-memory 架構（v1 不含 DB / API），seed 資料在 [`src/components/Dashboard.tsx`](./src/components/Dashboard.tsx) 的 `SEED_CUSTOMERS` / `SEED_TREATMENTS`。

---

## Quick Start

```bash
# 需要 Node 20+
nvm use        # 讀 .nvmrc

npm install
npm run dev    # http://localhost:3000

# 其他常用指令
npm test           # vitest 跑 47 個測試
npm run build      # Next.js production build
npm run lint       # ESLint
```

CI 跑同樣三件事（lint + test + build），見 [`.github/workflows/ci.yml`](./.github/workflows/ci.yml)。

---

## 專案結構

```
src/
├── app/                     # Next.js App Router
│   ├── layout.tsx          # 根 layout (zh-TW lang)
│   ├── page.tsx            # 首頁 → Dashboard
│   └── globals.css         # 設計系統 token
├── components/
│   └── Dashboard.tsx       # 5 個分頁的單頁工作台（overview / customers / reminders / analytics / broadcast）
└── lib/                     # 6 個 pure-function domain（P0）
    ├── customers.ts        # 客戶檔案 + 同意狀態 + 過敏
    ├── treatments.ts       # 療程紀錄 + 預設回訪天數
    ├── reminders.ts        # 回訪提醒計算 + 過期清單
    ├── tiers.ts            # 4 級會員（standard/silver/gold/black）+ 折扣
    ├── analytics.ts        # 月營收 / LTV / Top spenders
    └── broadcast.ts        # 推播模板 + 同意過濾 + VIP/過期篩選

tests/                       # 7 個測試檔（vitest，47 個 AC）
PRD/SPEC.md                  # 規格計劃書 v3.0（不修改 §1-§9 scope）
.github/workflows/ci.yml     # CI: lint + test + build on push/PR
.nvmrc                       # Node 版本鎖定
CHANGELOG.md                 # 版本與重大變更紀錄
SECURITY_NOTES.md            # 安全相關備註
```

---

## Domain Logic 速覽

| 模組 | 關鍵 API | 用途 |
|---|---|---|
| `customers` | `createCustomer` / `toggleConsent` / `searchCustomers` / `hasAllergyConflict` | 客戶檔案 CRUD + 行銷同意 + 過敏衝突偵測 |
| `treatments` | `recordTreatment` / `treatmentsByCustomer` / `suggestRecallDays` | 療程紀錄 + 4 大類別回訪週期 |
| `reminders` | `computeReminder` / `listOverdue` / `listDueSoon` | 每位客戶下次回訪日 + 過期清單 |
| `tiers` | `tierForSpend` / `nextTier` / `progressToNextTier` / `applyDiscount` | 4 級會員 + 折扣計算 |
| `analytics` | `computeRevenueByMonth` / `computeCustomerLTV` / `topSpenders` | 月營收 / LTV / Top N |
| `broadcast` | `buildBroadcast` / `selectOverdue` / `selectHighSpenders` / `recheckConsentBeforeSend` | 推播模板 + 客戶篩選 + 送出前再驗同意 |

所有 domain 邏輯都是 **pure function**，沒有副作用，方便測試與未來接 DB。

---

## 測試

```bash
npm test                  # 47 個 AC，7 個 test file，~0.3s
npm run test:watch        # watch mode
```

涵蓋範圍：
- 6 大 domain 各 1 個 unit test file
- `integration.test.ts` 端到端：新客 → 3 次療程 → 升 silver → 收到回訪推播（撤回同意 → 推播清空）
- 100 客戶批次效能測試（< 2 秒）

---

## 接下來（v2+）

依 SPEC §3.2 / §3.3：

- v2（P1）：localStorage 持久化 / 多店 / 預約衝突
- v3（P2）：第三方登入 / 簡訊 / LINE OA 整合
- 市場驗證（§11）：5 訪談 → 5 pilot → landing smoke → build sprint

這些都不在 v1 scope。要擴充請見 SPEC。

---

## License

未指定（v0.2.0 為 internal prototype）。
