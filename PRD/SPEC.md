# 美業客戶回訪 CRM（Beauty CRM）— 產品需求規格 v4.0

> 版本：v4.0（PRD 重建）｜更新日期：2026-11-16｜狀態：文件重建，尚未依本版開發
> 主 repo：`openclawsean024-create/beauty-crm`（預設分支 `main`，重建基準 commit `8e0d06c`）
> 併入 repo：`openclawsean024-create/beauty-crm-concierge`（`main`，commit `4921a19`，只讀）
> 商業依據：Notion「可產品化商品」資料庫（唯一商業依據，見 §1.5）
> 取代：v3.0 / v3.0.2（2026-07-19 / 2026-09-06）。舊版的「sweet spot 7.6 / 商業化 83.2」為內部打分，非市場事實，本版不再引用為依據；舊版仍可由 git 歷史查閱。

本文件所有「已實作／部分／未實作」皆以 2026-11-16 實際閱讀程式碼與執行 `npm test`／`npm run build` 的結果為準，不以 README 推論。README 與程式不一致之處列於 §12。

---

## 1. 產品概述

### 1.1 問題

台灣小型美業店家（美甲、美睫、皮膚管理、髮型）的回頭客高度依賴設計師個人記憶與 LINE 聊天紀錄：

1. **不知道誰該回來了**：每類服務有自然回流週期（例如美睫補睫、美甲卸甲重做），但沒有人系統化追蹤「上次做什麼、多久該回來」。
2. **客戶記憶散落**：偏好、過敏／禁忌、指定設計師等資訊只存在設計師腦中或手機，換人或多店時就流失。
3. **追蹤怕打擾、怕違法**：行銷訊息需要同意；過敏、健康相關資料屬敏感個資，小店缺乏同意與保管流程。

### 1.2 目標客群

| 類型 | 描述 | 備註 |
|---|---|---|
| Primary | 台灣 1–5 人的美甲、美睫、皮膚管理、髮型工作室；已用 LINE／IG 接預約，但沒有可靠服務紀錄 | 客戶數規模、付費意願待訪談確認 |
| Secondary | 2–3 間分店的小型連鎖（需多店與帳號權限） | Notion「上市前要補：多店與帳號權限」 |
| 不服務 | 醫美診所、醫療機構 | 涉及醫療法與醫療廣告，見 §7 |

### 1.3 價值主張

不和預約／POS 系統正面競爭，專注「服務完成後 3–90 天」：記住客戶做過什麼與禁忌、算出何時該回訪、由設計師核准後再用 LINE 提醒，並守住同意與敏感個資規則。

### 1.4 獲利模式

- **SaaS 訂閱**（Notion：獲利模式 SaaS 訂閱、獲利潛力「高」）。
- 方案分層草案（沿用 v3.0 SPEC 的**內部假設**，未經市場驗證，價格待試用店家訪談後確認）：

| 方案（草案） | 價格（待確認） | 主要限制（草案） |
|---|---|---|
| 免費 | NT$0 | 1 店、1 帳號、客戶數上限 |
| 設計師 | NT$299／月（假設） | 1 店、較高客戶上限、LINE 提醒 |
| 工作室 | NT$799／月（假設） | 多帳號、權限、LINE 提醒 |
| 多店 | 待確認 | 多店、跨店報表 |

### 1.5 與 Notion 商品資料庫的對應

| Notion 欄位 | 值 |
|---|---|
| 產品名稱 | 美業客戶回訪 CRM |
| 優先順序 | P1 |
| 開發順位 | 第 1 個 |
| 獲利潛力／模式 | 高／SaaS 訂閱 |
| 目標客群 | 台灣美甲、美睫、皮膚管理、髮型等小型美業店家 |
| 現況完成度（Notion 記載） | 60 |
| 上市前要補 | 兩個 repo 合併、LINE 提醒整合、多店與帳號權限、計費、找 2–3 家店試用 |
| 主要風險 | 客戶健康與過敏資料屬敏感個資，需加密與同意流程；已有美業 App 競品 |

> 註：Notion 記載完成度 60。依本次程式盤點，主 repo 是「純前端、單店、假資料、無後端」原型；domain 邏輯完成度高，但上市必要項目（LINE、權限、計費、加密、真實資料流）皆未實作。完成度數字是否要下修，待 Sean 決定（§13）。

### 1.6 Non-Goals（明確不做）

- 不做完整預約排程系統、POS、庫存、員工薪資。
- 不做醫療診斷、醫美療效宣稱、AI 自動判斷膚況。
- 不自動發送訊息：所有對客訊息須設計師核准。
- 不在 M1 處理真實個資、真實金流、真實 LINE 發送。

---

## 2. 競品與差異

競品名單取自 v3.0 SPEC 既有記錄；其功能範圍、台灣市佔、價格**均未在本次重新查證，標「待確認」**，不得當作事實引用。

| 競品 | 類型（待確認） | 本產品差異假設 |
|---|---|---|
| Dolyu | 美業預約／管理 | 不做預約，專注回訪與客戶記憶 |
| Folio | 美業預約／管理 | 同上 |
| Fresha | 國際預約／POS 平台 | 同上；在地化 LINE 與台灣個資法 |
| JustBook | 預約工具 | 同上 |
| StyleSeat、Booksy | 國際預約平台 | 台灣小店是否使用待確認 |
| 一般 LINE 官方帳號 + 試算表 | 現況替代方案 | 自動算回訪日、過敏提醒、同意閘門 |

差異化（待試用驗證）：

1. 回訪週期與「待聯絡」清單是首頁，而非預約日曆。
2. 過敏／禁忌在新增服務時主動衝突提醒（`hasAllergyConflict`）。
3. 行銷同意與敏感個資同意分開管理，未同意者不出現發送動作。
4. 設計師核准制 LINE 提醒，不做群發轟炸。

市場規模、競品價格：**待確認**（無可靠出處，不填數字）。

---

## 3. 現況盤點（以程式為準）

### 3.1 主 repo `beauty-crm`

- 技術棧：Next.js 16.2.10（`package.json` 寫 `"next": "latest"`，實際安裝版本會漂移）、React 19、TypeScript strict、Vitest 2.1、ESLint 9 flat config。純前端，無後端、無 DB、無 API route。
- 入口：`src/app/page.tsx` → `src/components/Dashboard.tsx`（「今日工作台」）。側欄其他分頁（客戶／回訪／洞察／設定）點擊只跳 toast「頁面預覽中」，**未實作內容**。
- `src/components/workbench/*`（另一套工作台、含 Funnel 回流漏斗）**沒有被任何頁面引用**，只有 `seed.ts` 被測試引用，屬未接線程式。
- Domain（`src/lib/`，皆為純函式且有測試）：

| 模組 | 實際功能 |
|---|---|
| `customers.ts` | 建立／更新客戶、台灣手機格式驗證、搜尋、過敏成分衝突、行銷同意切換 |
| `treatments.ts` | 療程紀錄驗證、依客戶排序、4 類預設回訪天數（美甲 28／美睫 21／皮膚 30／髮型 45） |
| `reminders.ts` | 下次回訪日、逾期／即將到期清單（本地時區日期） |
| `followups.ts` | 草稿 draft→approved 狀態機、同意閘門、回訪模板 |
| `tiers.ts` | 4 級會員（一般／銀／金／黑）、升級進度、折扣 |
| `analytics.ts` | 月營收、客戶 LTV、Top spenders |
| `broadcast.ts` | 訊息模板變數、依同意／逾期／高消費／等級篩選、送出前再驗同意（不實際發送） |
| `persistence.ts` | localStorage：語言、主題、最近 20 筆「新增來訪」紀錄 |
| `export.ts` | JSON 匯出下載（未加密） |
| `i18n.ts` | 中英文字串 |

- UI 實際行為：
  - 客戶與療程資料是元件內的固定 seed（`Dashboard.tsx` `SEED_CUSTOMERS`／`SEED_TREATMENTS`），**不可新增或編輯客戶**。
  - 「新增來訪」表單只把紀錄寫入 localStorage 的 `visitLog`，**不會**寫回療程資料，回訪清單不會因此更新。
  - 回訪草稿可核准、複製到剪貼簿；編輯草稿不保存（`handleDraftChange` 為空）；「標記已聯絡」只顯示 toast。
  - KPI（本月來訪 48、營收 128,500、回訪率 68% 等）與回訪節奏圖數值為**寫死的展示數字**。
  - 未取得行銷同意的客戶，草稿動作會被 `BroadcastGuard` 隱藏。
- 測試：12 個測試檔、77 個測試，`npm test` 全數通過（2026-11-16 本機）。
- 未合併工作：open PR #1（`codex/beauty-crm-followups`，接線草稿狀態與客戶記憶）；未合併分支 `fix/v0.3.0-round3`（回流漏斗、audit log 等）、`fix/v0.4.0-ui-redesign`（landing／pricing、localStorage 持久層）。本 SPEC 狀態只計 `main`。

### 3.2 併入 repo `beauty-crm-concierge`

- 技術棧：Next.js 14.2.15（npm 安裝時警告此版本有安全漏洞）、React 18、Tailwind 3、Framer Motion、lucide-react。無測試、無 test script。`npm run build` 本機可通過。
- 定位：**會員（終端客戶）端**的高端美容會員 App，與主 repo 的「設計師工作台」視角不同。
- 實際功能（全部讀 `data/mock.ts` 單一會員假資料，無寫入、無持久化）：

| 頁面／元件 | 實際狀態 |
|---|---|
| `/` 會員首頁 | 下次預約卡、會員方案（套票）進度、效果時序牆、下次推薦療程、專屬顧問卡 |
| `/booking` | 月曆／清單檢視預約紀錄；4 步驟新增預約（療程→顧問→時段→確認），「確認預約」只關閉視窗，**不儲存** |
| `/effect-records` | Before/After 比對、4 項膚況指標 SVG 雷達圖、改善幅度計算；照片為遠端 Unsplash 圖庫圖 |
| `/plans`、`/follow-up`、`/diary`、`/notifications`、`/profile` | **佔位頁**（「PHASE 2 — 敬請期待」） |
| `lib/utils.ts` | `cn`、`formatDate`、`greetingByHour` |

- 資料模型（`data/mock.ts`）：`Member`、`Appointment`（含 status upcoming/completed/cancelled、store、room、consultantId）、`Treatment`（品項目錄：名稱、分類、時長、價格）、`Plan`（套票：總堂數、已用、期間、剩餘價值）、`EffectRecord`（before/after、膚況 4 指標）、`Consultant`（顧問）。
- 無同意、過敏、敏感個資處理。

---

## 4. 功能需求（FR）

狀態以 `main` 實際程式為準。「所在 repo」：CRM = `beauty-crm`，CON = `beauty-crm-concierge`。

| ID | 需求 | 優先 | 狀態 | 所在 repo | 現況說明 | 里程碑 |
|---|---|---|---|---|---|---|
| FR-001 | 客戶檔案：聯絡、偏好、過敏／禁忌、標籤 | P0 | 部分 | CRM | domain 與測試完整；UI 無新增／編輯客戶 | M1 |
| FR-002 | 療程（服務）紀錄 | P0 | 部分 | CRM | domain 完整；UI 新增只寫 `visitLog`，未回寫療程 | M1 |
| FR-003 | 服務週期模板（4 類，可調整） | P0 | 部分 | CRM | 4 類固定天數；店家不可調整 | M1 |
| FR-004 | 下次回訪日與待聯絡清單（篩選、搜尋、逾期排序） | P0 | 已實作 | CRM | `reminders.ts` + `RecallQueue` | — |
| FR-005 | 回訪草稿須設計師核准，不自動發送 | P0 | 部分 | CRM | 狀態機與核准／複製已實作；草稿編輯不保存、「已聯絡」未記錄（PR #1 處理中） | M1 |
| FR-006 | 會員等級／VIP 可解釋計算 | P1 | 部分 | CRM | `tiers.ts` 完整；UI VIP 判斷寫死 LTV ≥ 20,000 | M2 |
| FR-007 | Before/After 效果紀錄（含照片同意） | P1 | 部分 | CON | CON 有比對 UI 與指標計算；無同意、無上傳，照片為遠端圖庫 | M1（資料模型與比對邏輯）／M2（照片） |
| FR-008 | 回流漏斗：應回訪→已聯絡→已預約 | P0 | 部分 | CRM | `workbench/Funnel.tsx` 存在但未接線；主入口無 | M1 |
| FR-009 | 資料匯出與刪除 | P0 | 部分 | CRM | JSON 匯出已實作（未加密）；無刪除 | M1（刪除）／M2（加密匯出） |
| FR-010 | 手機快速新增服務紀錄 | P0 | 部分 | CRM | 表單、手機底部導覽、`N` 快捷鍵已實作；寫入問題同 FR-002 | M1 |
| FR-011 | 行銷同意與送出前再驗 | P0 | 已實作 | CRM | `broadcast.ts`、`followups.ts`、`BroadcastGuard` | — |
| FR-012 | 敏感個資（過敏／健康）同意、遮罩、最小化 | P0 | 未實作 | — | 目前只有「行銷同意」，過敏資料明文顯示 | M1 |
| FR-013 | LINE 回訪提醒整合 | P0 | 未實作 | — | 只有 channel 字串與複製草稿；無 LINE adapter | M1（dry-run）／M2（測試頻道）／M3（正式） |
| FR-014 | 多店與帳號權限（店主／店長／設計師） | P0 | 未實作 | — | `WorkspaceSwitcher` 只顯示店名；療程僅有 `designerId` 欄位 | M1（模型與權限檢查）／M2（真實登入） |
| FR-015 | 計費與方案限制 | P0 | 未實作 | — | 無 | M2（金流測試模式）／M3（正式） |
| FR-016 | 套票（療程方案）剩餘堂數與期限 | P1 | 部分 | CON | CON 有展示 UI 與資料模型；CRM 無 | M1 |
| FR-017 | 下次預約紀錄（只記錄，不做排程系統） | P1 | 部分 | CON | CON 有預約資料模型與清單；新增流程不儲存 | M1 |
| FR-018 | 設計師／顧問檔案 | P1 | 部分 | CON | CON 有顧問模型與卡片；CRM 只有 `designerId` | M1（併入帳號模型） |
| FR-019 | 營運分析（月營收、LTV、回訪率） | P1 | 部分 | CRM | domain 完整；UI KPI 為寫死展示數字 | M2 |
| FR-020 | 中英雙語、深淺色主題 | P2 | 已實作 | CRM | `i18n.ts`、`persistence.ts` | — |
| FR-021 | 試用店家匯入既有客戶（CSV） | P1 | 未實作 | — | 無 | M2 |
| FR-022 | 會員自助入口（客戶端 App） | P2 | 部分 | CON | CON 會員端頁面，資料全為 mock | M3 之後再評估 |
| FR-023 | 稽核紀錄（同意變更、匯出、刪除） | P1 | 未實作 | — | 僅未合併分支有雛形 | M2 |

### 4.1 P0 驗收重點（沿用 v3.0 AC 精神，改寫為可驗證）

- 新增客戶可記錄偏好、過敏與兩種同意（行銷／敏感個資）。
- 新增服務後自動計算下一次回訪日，並出現在待聯絡清單。
- 含過敏衝突的服務在儲存前顯示醒目確認。
- 回訪清單可依逾期天數排序（已實作）。
- 對客訊息必須由設計師核准；未同意者不出現發送動作。
- 撤回行銷同意後，不再出現在推播／提醒發送清單（`buildBroadcast` 已實作；待聯絡清單本身仍會列出，但不顯示發送動作）。
- 店主可自行匯出與刪除單一客戶全部資料。

---

## 5. 非功能需求

| 類別 | 需求 | 驗證方式 |
|---|---|---|
| 效能 | 500 位客戶時回訪清單計算 ≤ 200ms（本機） | Vitest 效能測試（現有 100 客戶測試 < 2 秒，需收斂） |
| 行動裝置 | 375px 寬可單手完成新增服務 | Playwright mobile viewport（尚未配置） |
| 可及性 | 主要互動可鍵盤操作；Lighthouse a11y ≥ 90 | Lighthouse（尚未配置） |
| 時區 | 日期一律以 Asia/Taipei 計算，避免跨日 off-by-one | `tests/reminders.test.ts`（已有） |
| 依賴 | Next.js 版本固定，不使用 `latest` | `package.json` 檢查 |
| 品質閘門 | lint、typecheck、test、build、e2e 全部 exit 0 才可合併 | CI（目前 test 步驟以 `|| echo` 吞錯，需修正） |
| 可攜 | 店家可隨時匯出全部資料 | 匯出測試 |
| 可觀測 | M2 起記錄錯誤率與同步延遲 | 待定 |

---

## 6. 資料與個資處理

### 6.1 資料分級

| 等級 | 欄位 | 處理 |
|---|---|---|
| S（敏感） | 過敏、禁忌、皮膚狀況、健康相關備註、Before/After 照片、膚況指標 | 需獨立「敏感個資同意」才可儲存；UI 預設遮罩；M2 起靜態加密；最小必要存取 |
| P（一般個資） | 姓名、手機、Email、生日 | 需告知蒐集目的；依角色限制可見；可匯出與刪除 |
| B（營運） | 療程項目、價格、日期、套票、預約 | 依店別隔離 |
| M（設定） | 語言、主題 | 本機 localStorage |

### 6.2 同意模型（目標）

- `marketingConsent`：granted／pending／revoked（現有 `ConsentStatus`），控制是否可產生對客訊息。
- `sensitiveDataConsent`：granted／pending／revoked（**新增**），控制 S 級欄位可否儲存與顯示；撤回時 S 級資料須刪除或匿名化。
- 每次同意變更記錄時間與操作者（M2 稽核紀錄）。

### 6.3 儲存與傳輸

| 階段 | 儲存 | 加密 |
|---|---|---|
| 現況 | 客戶資料寫死在程式；`visitLog`（含客戶名、備註）明文存 localStorage | 無 |
| M1 | localStorage，只允許假資料；新增「清除本機資料」 | 無（只用假資料，故可接受） |
| M2 | 後端資料庫（選型待定），依 workspace/store 隔離 | 傳輸 TLS；S 級欄位欄位級加密；金鑰不入 repo |

### 6.4 假資料規範

- seed、測試、文件範例只使用明顯假資料：姓名加「示範」或「測試」前綴、手機號用 `0900000001` 這類明顯假號碼、Email 用 `@example.com`。
- 不得引用真實人物照片作為 Before/After（concierge 目前用 Unsplash 人像，不搬入）。

---

## 7. 法規與風險

| 風險 | 說明 | 對策 | 狀態 |
|---|---|---|---|
| 個資法：敏感個資 | 過敏／皮膚／健康資料是否屬個資法第 6 條特種個資（醫療、健康檢查等）**待法律確認**；產品先以最高敏感等級處理 | 獨立同意、遮罩、加密、最小化、可刪除 | 待確認 |
| 個資法：告知與同意 | 蒐集時須告知目的、類別、利用期間與方式（個資法第 8 條）；行銷利用需當事人同意或可拒絕 | 同意文案與紀錄；撤回立即生效 | 文案待撰寫 |
| LINE 官方帳號政策與費用 | 推播則數、費用與 Messaging API 條款可能變動，**待確認** | adapter 隔離、核准制、可降級為複製草稿 | 待確認 |
| 醫療法／醫療廣告 | Before/After 與「療效」字眼若用於醫美，可能涉及醫療廣告限制，**待法律確認** | 不服務醫美診所；效果紀錄僅內部使用、不對外宣稱 | 待確認 |
| 競品 | 已有美業 App 競品（見 §2） | 專注回訪 wedge；試用驗證 | 進行中 |
| 依賴安全 | 主 repo `next: latest` 版本漂移；concierge 的 Next 14.2.15 有已公告漏洞 | 固定版本；不搬 concierge 依賴 | M1 |
| 金流 | 訂閱扣款、退款、發票（台灣電子發票）規範 | M2 只用金流商測試模式；正式上線前另行審查 | M2 |
| 試用店家資料 | 試用即為真實個資 | 試用前須完成 M2 加密、同意書、資料處理約定 | M2 |

---

## 8. 里程碑

| 里程碑 | 目標 | 主要內容 | 對應「上市前要補」 |
|---|---|---|---|
| **M1：合併與可試用骨架（本機、假資料）** | 單一 repo、資料閉環、權限與同意模型、LINE dry-run | 併入 concierge 選定模組；新增客戶／服務真正寫入並更新回訪清單；敏感個資同意與遮罩；多店與角色權限（假帳號）；LINE 提醒 dry-run adapter；品質閘門（typecheck、e2e、CI 不吞錯） | 兩個 repo 合併、LINE 提醒整合（dry-run）、多店與帳號權限（模型層） |
| **M2：試用就緒** | 可讓 2–3 家店以真實資料安全試用 | 後端與登入、S 級欄位加密、稽核紀錄、LINE 測試頻道串接、計費（金流商測試模式）、CSV 匯入、隱私權政策與同意書、招募 2–3 家試用店 | LINE 提醒整合（測試頻道）、多店與帳號權限（真實登入）、計費（測試模式）、找 2–3 家店試用 |
| **M3：付費上市** | 首批付費店家 | 正式金流與發票、正式 LINE 推送、方案限制、監控與客服流程、依試用回饋調整 | 計費（正式） |

M1 詳細驗收見根目錄 `GOAL.md`。

---

## 9. 成功指標

| 階段 | 指標 | 門檻（內部目標，待 Sean 確認） | 量測 |
|---|---|---|---|
| M1 | GOAL.md 全部 AC 通過 | 100% | SOP.md 指令 exit 0 |
| M2 | 試用店家數 | 2–3 家（Notion） | 簽署試用同意的店家數 |
| M2 | 每店每週處理回訪清單 | ≥ 1 次／週，連續 4 週 | 產品事件紀錄 |
| M2 | 核准後送出的回訪提醒 | 每店 ≥ 10 則／月 | LINE adapter 紀錄 |
| M3 | 試用轉付費 | ≥ 1 家 | 金流紀錄 |
| M3 | 回訪率變化 | 試用前後比較，基準待試用店家提供 | 店家報表 |

---

## 10. 合併清單（beauty-crm-concierge → beauty-crm）

原則：主 repo 是唯一主幹（Next 16／React 19／Vitest）；只搬「資料模型與商業邏輯」，以主 repo 既有的 CSS token 與元件風格重做 UI，不搬 Tailwind／Framer Motion 依賴；主 repo 已有的功能不重複搬。

### 10.1 要搬（M1）

| # | concierge 來源 | 搬到主 repo（建議位置） | 搬的內容 | 對應 FR |
|---|---|---|---|---|
| 1 | `data/mock.ts` `Plan`；`components/home/MemberPlanCard.tsx` | `src/lib/packages.ts` + 客戶記憶面板區塊 | 套票：總堂數、已用堂數、期間、剩餘價值、到期提醒計算；補單元測試 | FR-016 |
| 2 | `data/mock.ts` `Appointment`；`components/home/NextAppointmentCard.tsx`；`app/booking/page.tsx` 的預約清單 | `src/lib/appointments.ts` + 客戶記憶面板「下次預約」 | 預約紀錄模型（日期、時間、狀態、店別、設計師）；「已預約」狀態餵給回流漏斗；補單元測試 | FR-017、FR-008 |
| 3 | `data/mock.ts` `EffectRecord`；`app/effect-records/page.tsx` 的比對與改善幅度計算、`RadarChart` | `src/lib/effects.ts` + 效果比對元件 | Before/After 紀錄模型、膚況指標、改善幅度計算；照片以本機佔位圖代替；受敏感個資同意閘門控管；補單元測試 | FR-007、FR-012 |
| 4 | `data/mock.ts` `Consultant`；`components/home/ConsultantCard.tsx` | 併入 `src/lib/accounts.ts`（設計師帳號） | 設計師檔案（名稱、職稱、專長）併入帳號／角色模型，取代單純 `designerId` | FR-018、FR-014 |
| 5 | `data/mock.ts` `Treatment`（品項目錄：名稱、分類、時長、價格） | 擴充 `src/lib/treatments.ts` 的服務品項目錄 | 店家可維護的服務品項清單，新增服務時帶入價格與時長；分類對應既有 4 類回訪週期 | FR-002、FR-003 |
| 6 | `app/booking/page.tsx` 的月曆格計算（`buildMonthGrid`） | 視需要放入 `src/lib/calendar.ts` | 只用於顯示「回訪日／預約日」月檢視，不做排程 | FR-004（加值） |

### 10.2 不搬

| concierge 項目 | 不搬原因 |
|---|---|
| 會員端頁面整體（會員首頁、問候語、`greetingByHour`、`MobileQuickActions`） | 視角是終端客戶，主產品是設計師工作台；會員自助入口列 FR-022（P2），M3 後再評估 |
| 4 步驟新增預約流程（選療程→顧問→時段→確認） | 預約排程是 Non-Goal（紅海）；且目前不儲存任何資料 |
| `/plans`、`/follow-up`、`/diary`、`/notifications`、`/profile` 佔位頁 | 只有標題與「敬請期待」，無功能 |
| `NextRecommendedCard`（下次推薦療程） | 推薦結果寫死在頁面；AI 推薦不在範圍；主 repo 已有回訪模板與 next best actions |
| Tailwind、Framer Motion、lucide-react、clsx、tailwind-merge、`cn()` | 主 repo 用自有 CSS token；避免引入第二套樣式系統與依賴 |
| Next 14.2.15／React 18 設定、`next.config.js` 的 Unsplash 遠端圖片白名單 | 主 repo 已是 Next 16／React 19；不引用遠端人像圖 |
| `data/mock.ts` 的人物資料與 Unsplash 人像照片 | 看似真實的姓名與真人照片，不符假資料規範；改用明顯假資料 |
| `lib/utils.ts` `formatDate` | 使用 `new Date(dateStr)` 解析，時區行為與主 repo `reminders.ts` 的本地日期規則不一致；主 repo 已有日期處理 |
| `dashboard.html` | 與主 repo `dashboard.html` 幾乎相同的靜態原型（僅標題不同） |
| `.github/workflows/ci.yml` | 部署到 GitHub Pages 但 Next 未輸出 `dist/`，build 與 deploy 以 `continue-on-error` 掩蓋失敗 |
| `PRD/SPEC.md`、`AGENTS.md`、`README.md` | 內容與程式不符（宣稱 localStorage 持久化、雷達圖等），已由本 SPEC 取代 |

### 10.3 合併後處置

- concierge repo 在 M1 合併完成並經 Sean 覆審後，由 Sean 決定是否封存（agent 不執行封存、刪除或改名）。

---

## 11. 技術方向

| 層 | 現況 | M1 | M2（待決定） |
|---|---|---|---|
| 前端 | Next.js 16 App Router、React 19 | 同左；固定 Next 版本 | 同左 |
| 資料 | 程式內 seed + localStorage | localStorage repository 介面（只存假資料） | 後端 DB（選型待定）+ 加密欄位 |
| 通知 | 無 | LINE adapter dry-run（不打網路） | LINE Messaging API 測試頻道 |
| 權限 | 無 | 純函式權限矩陣 + 假帳號切換 | 真實登入 + server-side 檢查 |
| 金流 | 無 | 無 | 金流商測試模式（選型待定） |
| 測試 | Vitest（77 tests） | + typecheck script、Playwright e2e | + integration |

---

## 12. README／文件與程式不一致處

| 文件說法 | 實際程式 |
|---|---|
| 主 README：「vitest 跑 47 個測試、7 個 test file」 | 12 個測試檔、77 個測試 |
| 主 README：seed 在 `Dashboard.tsx`、「Dashboard 5 個分頁」 | 只有「今日工作台」有內容，其餘 4 個分頁只跳 toast |
| 主 README：「v1 不含 … localStorage 持久化列 v2」；`SECURITY_NOTES.md`：「無持久化、重新整理就清空」 | `persistence.ts` 已把語言、主題、`visitLog`（含客戶名與備註）存入 localStorage |
| 主 README：CI 跑 lint + test + build | CI 的 lint 為 `continue-on-error`，test 為 `npm test … \|\| echo`，失敗不會擋 |
| 主 README Stack：Next.js 16 | `package.json` 為 `"next": "latest"`，版本不固定 |
| concierge `PRD/SPEC.md`：「localStorage 持久化」 | 程式內沒有任何 localStorage 使用 |
| concierge README：「預約保養：4 步驟新增預約流程」 | 流程可操作但「確認預約」不儲存資料 |
| concierge `AGENTS.md`：「`.vercel/` 已存在」 | repo 內沒有 `.vercel/`（被 `.gitignore` 排除） |
| concierge CI：部署到 GitHub Pages | Next 未設定靜態輸出，`dist/` 不存在，部署實際無內容 |

---

## 13. 待 Sean 決定

1. Notion「現況完成度 60」是否依本盤點下修。
2. open PR #1（followups 接線）與未合併分支 `fix/v0.3.0-round3`、`fix/v0.4.0-ui-redesign` 要合併、挑選或關閉。
3. 主 repo 兩套工作台（`Dashboard.tsx` 系列 vs `components/workbench/*`）保留哪一套。
4. M1 是否需要包含「方案限制（entitlement）」純邏輯，或計費整個放 M2。
5. M2 後端與金流商選型。
6. 方案價格（§1.4 均為假設）。
7. 合併完成後 concierge repo 是否封存。

---

## 14. 變更紀錄

| 版本 | 日期 | 說明 |
|---|---|---|
| v4.0 | 2026-11-16 | 依實際程式重建 PRD；新增合併清單、FR 狀態對照、M1/M2/M3；對齊 Notion 商品資料庫 |
| v3.0.2 | 2026-09-06 | 舊版（見 git 歷史） |
| v3.0 | 2026-07-19 | 舊版（見 git 歷史） |
