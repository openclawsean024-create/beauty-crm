# Status — beauty-crm（美業客戶回訪 CRM）

- 產品：美業客戶回訪 CRM
- 主 repo：`openclawsean024-create/beauty-crm`（`main` @ `8e0d06c`）
- 待併入：`openclawsean024-create/beauty-crm-concierge`（`main` @ `4921a19`，只讀）
- 規格：`PRD/SPEC.md` v4.0；目標：`GOAL.md`（M1）
- 狀態：🟡 **M1 開發中**（分支 `feat/m1`，2026-11-16）

## M1 進度（分支 `feat/m1`）

| AC | 內容 | 狀態 | 測試／證據 |
|---|---|---|---|
| AC-001 | 併入 concierge 資料模型與邏輯 | ⏳ 未開始 | — |
| AC-002 | 單一 UI 入口與回流漏斗 | ⏳ 未開始 | — |
| AC-003 | 新增客戶／服務寫入、KPI 由資料計算 | ⏳ 未開始 | — |
| AC-004 | LINE 提醒 dry-run adapter | ⏳ 未開始 | — |
| AC-005 | 多店與帳號權限 | ⏳ 未開始 | — |
| AC-006 | 敏感個資同意、遮罩、刪除 | ⏳ 未開始 | — |
| AC-007 | 只用明顯假資料 | ✅ 完成 | `tests/fixtures-safety.test.ts`（8 tests）通過；seed、測試、根目錄 HTML 原型的姓名改為「示範／測試」前綴，手機改為 `09000000xx`；secret 掃描無結果 |
| AC-008 | 品質閘門 | 🟡 閘門已建立，e2e spec 隨後續 AC 補上 | `tests/quality-gate.test.ts`（8 tests）；`npm run typecheck` exit 0 |

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

## 目前狀態摘要

- 純前端 Next.js 原型，單一入口「今日工作台」，資料為元件內 seed，無後端。
- domain 純函式（客戶、療程、回訪、草稿核准、會員等級、分析、推播篩選、匯出）完整且有測試。
- 不能新增客戶；「新增來訪」只寫 localStorage `visitLog`，不會更新回訪清單；KPI 為寫死數字。
- 無 LINE、無多店權限、無計費、無敏感個資同意、無加密。

## FR 對照（以 `main` 程式為準）

| FR | 需求 | 優先 | 狀態 | 所在 repo |
|---|---|---|---|---|
| FR-001 | 客戶檔案 | P0 | 部分 | beauty-crm |
| FR-002 | 療程紀錄 | P0 | 部分 | beauty-crm |
| FR-003 | 服務週期模板 | P0 | 部分 | beauty-crm |
| FR-004 | 回訪日與待聯絡清單 | P0 | 已實作 | beauty-crm |
| FR-005 | 設計師核准草稿 | P0 | 部分 | beauty-crm |
| FR-006 | 會員等級／VIP | P1 | 部分 | beauty-crm |
| FR-007 | Before/After 效果紀錄 | P1 | 部分 | beauty-crm-concierge |
| FR-008 | 回流漏斗 | P0 | 部分（元件未接線） | beauty-crm |
| FR-009 | 匯出與刪除 | P0 | 部分（只有匯出） | beauty-crm |
| FR-010 | 手機快速新增 | P0 | 部分 | beauty-crm |
| FR-011 | 行銷同意與送出前再驗 | P0 | 已實作 | beauty-crm |
| FR-012 | 敏感個資同意與遮罩 | P0 | 未實作 | — |
| FR-013 | LINE 回訪提醒 | P0 | 未實作 | — |
| FR-014 | 多店與帳號權限 | P0 | 未實作 | — |
| FR-015 | 計費與方案限制 | P0 | 未實作 | — |
| FR-016 | 套票剩餘堂數 | P1 | 部分 | beauty-crm-concierge |
| FR-017 | 下次預約紀錄 | P1 | 部分 | beauty-crm-concierge |
| FR-018 | 設計師／顧問檔案 | P1 | 部分 | beauty-crm-concierge |
| FR-019 | 營運分析 | P1 | 部分（UI 寫死） | beauty-crm |
| FR-020 | 中英雙語、深淺色 | P2 | 已實作 | beauty-crm |
| FR-021 | 試用店家匯入 | P1 | 未實作 | — |
| FR-022 | 會員自助入口 | P2 | 部分 | beauty-crm-concierge |
| FR-023 | 稽核紀錄 | P1 | 未實作 | — |

小計：已實作 3、部分 14、未實作 6。

## Deterministic checks（2026-11-16，本機 Node v26.13.1）

| 指令 | Exit | 結果 |
|---|---:|---|
| `npm ci` | 0 | 安裝完成 |
| `npm run lint` | 0 | 1 warning |
| `npx tsc --noEmit`（無 typecheck script） | 2 | `tests/persistence.test.ts:154` 型別錯誤 |
| `npm test` | 0 | 12 檔、77 tests 通過 |
| `npm run build` | 0 | Next.js 16.2.10 |
| concierge `npm install --no-package-lock && npm run build` | 0 | Next 14.2.15，9 個靜態路由（含 /_not-found）；安裝時警告 Next 14.2.15 有安全漏洞；無測試 |

## 已知風險與問題

- `src/components/Dashboard.tsx` 的 `SEED_CUSTOMERS` 使用完整中文姓名搭配不規則手機號（`tests/export.test.ts` 也引用其中一個號碼）；無法確認是否為真實號碼，M1 AC-007 全部改為明顯假資料。
- concierge `data/mock.ts` 使用看似真實的姓名與 Unsplash 真人照片作為 Before/After，不搬入。
- CI 的 test 與 lint 失敗不會擋合併；main push 會直接部署 Vercel production。
- `package.json` 的 `next: latest` 使建置版本漂移。
- 根目錄 `rpb-*.log` 在版控中（`.gitignore` 有 `*.log` 但檔案早已被追蹤）。
- README、`SECURITY_NOTES.md` 與程式不一致之處見 SPEC §12。

## 本次變更

- 重寫 `PRD/SPEC.md`（v4.0），新增 `GOAL.md`、`AGENTS.md`、`SOP.md`、`STATUS.md`。未修改任何程式碼、設定或測試。

## 下一步

1. Sean 決定 SPEC §13 待決事項（PR #1、兩套工作台、計費是否進 M1 等）。
2. 依 `GOAL.md` AC-008 先建立品質閘門，再進行 AC-001～AC-007。
