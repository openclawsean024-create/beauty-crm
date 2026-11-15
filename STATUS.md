# Status — beauty-crm（美業客戶回訪 CRM）

- 產品：美業客戶回訪 CRM
- 主 repo：`openclawsean024-create/beauty-crm`（`main` @ `8e0d06c`）
- 實作分支：`feat/m1`（從 `chore/prd-rebuild` 開出）
- 併入來源：`openclawsean024-create/beauty-crm-concierge`（`main` @ `4921a19`，只讀，未封存）
- 規格：`PRD/SPEC.md` v4.0；目標：`GOAL.md`（M1）
- 狀態：🟢 **M1 八條 AC 全部有通過的測試**（2026-11-16，本機）；待 PR 上 GitHub Actions 結果與 Sean 覆審

## M1 進度（分支 `feat/m1`）

| AC | 內容 | 狀態 | 測試／證據 |
|---|---|---|---|
| AC-001 | 併入 concierge 資料模型與邏輯 | ✅ | `tests/packages`（7）、`appointments`（7）、`effects`（9）、`service-catalog`（7）、`accounts`（5）、`calendar`（7）；`package.json` 未新增 Tailwind／Framer Motion／lucide；`git grep unsplash -- src` 無結果 |
| AC-002 | 單一 UI 入口與回流漏斗 | ✅ | `tests/e2e/merge-panels.spec.ts`（4）；`src/components/workbench` 已移除；`npm run lint` 0 problems |
| AC-003 | 新增客戶／服務寫入、回訪清單即時更新、KPI 由資料計算 | ✅ | `tests/customer-store.test.ts`（18）、`recall-settings.test.ts`（5）；`tests/e2e/add-visit.spec.ts`（7） |
| AC-004 | LINE 提醒 dry-run adapter | ✅ | `tests/line-reminder.test.ts`（9，mock fetch 呼叫 0 次、錯誤碼、payload 快照）；E2E 2 tests；`git grep LINE_CHANNEL\|CHANNEL_ACCESS_TOKEN -- src` 無結果 |
| AC-005 | 多店與帳號權限（含顧問） | ✅ | `tests/permissions.test.ts`（57，權限矩陣逐格）；`tests/e2e/role-switch.spec.ts`（4） |
| AC-006 | 敏感個資同意、遮罩、刪除 | ✅ | `tests/sensitive-consent.test.ts`（11）、`customer-delete.test.ts`（6）；`tests/e2e/consent-mask.spec.ts`（7 AC-006） |
| AC-007 | 只用明顯假資料 | ✅ | `tests/fixtures-safety.test.ts`（8）；secret 掃描無結果 |
| AC-008 | 品質閘門 | ✅ | `tests/quality-gate.test.ts`（8）；下表五項指令 exit 0 |

## Deterministic checks（2026-11-16，本機 Node v26.13.1；CI 用 Node 20）

| 指令 | Exit | 結果 |
|---|---:|---|
| `npm ci` | 0 | 只有 `package-lock.json` |
| `npm run lint` | 0 | 0 problems |
| `npm run typecheck` | 0 | — |
| `npm test` | 0 | 26 檔、241 tests 通過（原有 12 檔 77 tests 全部保留；另於 `TZ=UTC`、`America/Los_Angeles` 也通過） |
| `npm run build` | 0 | Next.js 16.2.10；路由 `/`、`/_not-found` |
| `npm run e2e` | 0 | Playwright 4 spec、24 tests 通過（約 16 秒） |
| `npm start` | — | 啟動後 `GET /` 回 200 |
| secret 掃描（SOP） | 1（無結果） | — |

## 原有 77 個測試

全部保留、沒有 `.skip`、沒有刪除斷言。為符合 AC-007，`customers`、`export`、`persistence`、`broadcast`、`integration`、`reminders`、`followups` 測試中的姓名與手機只換成假資料，對應的期望字串同步替換（斷言數量與強度不變）。`workbench-seed.test.ts` 改引用 `tests/fixtures/workbench-seed.ts`。

## 與 Notion 商品資料庫的對應

| Notion「可產品化商品」欄位 | 值 | 本 repo 對應 |
|---|---|---|
| 產品名稱 | 美業客戶回訪 CRM | 本 repo |
| 優先順序 | P1 | — |
| 開發順位 | 第 1 個 | — |
| 獲利模式 | SaaS 訂閱（潛力：高） | SPEC §1.4、FR-015 |
| 現況完成度 | 60（Notion 記載） | 程式盤點見下；是否調整待 Sean 決定 |
| 上市前要補：兩個 repo 合併 | — | GOAL AC-001、AC-002（M1） |
| 上市前要補：LINE 提醒整合 | — | GOAL AC-004（M1 dry-run）、M2 測試頻道 |
| 上市前要補：多店與帳號權限 | — | GOAL AC-005（M1 模型）、M2 真實登入 |
| 上市前要補：計費 | — | FR-015（M2 測試模式、M3 正式） |
| 上市前要補：找 2–3 家店試用 | — | M2 |
| 主要風險：敏感個資 | — | GOAL AC-006、AC-007；SPEC §6、§7 |

## 目前狀態摘要（`feat/m1`）

- 純前端 Next.js，單一入口「今日工作台」，五個分頁都有內容；資料存 localStorage（只允許假資料）。
- 新增／編輯客戶、新增服務（寫入療程、扣套票、過敏衝突確認）會立即重算回訪清單、KPI 與漏斗。
- 回訪草稿可編輯並保存；核准後可產生 LINE dry-run 紀錄（不發送）。
- 示範帳號切換（店主／店長／設計師、兩家店），畫面依權限隱藏資料與動作。
- 敏感個資同意、遮罩、撤回清除、刪除客戶、清除本機資料；S 級欄位在 localStorage 以 Base64 另存（非加密）。

## FR 對照（以 `feat/m1` 為準）

| FR | 需求 | 優先 | 狀態 | 備註 |
|---|---|---|---|---|
| FR-001 | 客戶檔案 | P0 | 已實作（M1） | 新增、編輯、搜尋 |
| FR-002 | 療程紀錄 | P0 | 已實作（M1） | 服務寫入療程資料 |
| FR-003 | 服務週期模板 | P0 | 已實作（M1） | 4 類可調整 |
| FR-004 | 回訪日與待聯絡清單 | P0 | 已實作 | |
| FR-005 | 設計師核准草稿 | P0 | 已實作（M1） | 編輯保存、標記已聯絡 |
| FR-006 | 會員等級／VIP | P1 | 部分 | VIP 改用 tiers 計算；完整 UI 待 M2 |
| FR-007 | Before/After 效果紀錄 | P1 | 部分 | 模型、比對、示意圖完成；照片上傳 M2 |
| FR-008 | 回流漏斗 | P0 | 已實作（M1） | |
| FR-009 | 匯出與刪除 | P0 | 已實作（M1） | 匯出未加密（M2） |
| FR-010 | 手機快速新增 | P0 | 已實作（M1） | 375px E2E |
| FR-011 | 行銷同意與送出前再驗 | P0 | 已實作 | |
| FR-012 | 敏感個資同意與遮罩 | P0 | 已實作（M1） | 加密 M2 |
| FR-013 | LINE 回訪提醒 | P0 | 部分 | dry-run（M1）；測試頻道 M2 |
| FR-014 | 多店與帳號權限 | P0 | 部分 | 模型與前端檢查（M1）；真實登入 M2 |
| FR-015 | 計費與方案限制 | P0 | 未實作 | M2 |
| FR-016 | 套票剩餘堂數 | P1 | 已實作（M1） | |
| FR-017 | 下次預約紀錄 | P1 | 已實作（M1） | 只記錄，不排程 |
| FR-018 | 設計師／顧問檔案 | P1 | 已實作（M1） | 併入帳號模型 |
| FR-019 | 營運分析 | P1 | 部分 | KPI 由資料計算；進階分析 M2 |
| FR-020 | 中英雙語、深淺色 | P2 | 已實作 | |
| FR-021 | 試用店家匯入 | P1 | 未實作 | M2 |
| FR-022 | 會員自助入口 | P2 | 未搬 | concierge 會員端頁面不在 M1 |
| FR-023 | 稽核紀錄 | P1 | 部分 | 只有同意紀錄 |

## 已知風險與待辦

- localStorage 的 S 級欄位只是 Base64 編碼，不是加密；權限只在前端檢查。M1 只能用假資料。
- 根目錄 `rpb-*.log` 仍在版控中（未在本次處理）。
- `PRD/UI-SPEC.md` 為舊版，未隨 M1 更新。
- concierge repo 未封存，由 Sean 決定。
- SPEC §13 待決事項仍待 Sean 決定；之後才進 M2。
