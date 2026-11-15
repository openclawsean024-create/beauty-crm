# Goal — 美業客戶回訪 CRM M1

## Objective

在只使用假資料、不發送真實訊息、不接真實金流的前提下，把 `beauty-crm-concierge` 選定的功能併入本 repo，並讓設計師工作台形成「新增客戶與服務 → 自動算回訪日 → 核准回訪提醒（LINE dry-run）→ 標記已聯絡／已預約」的本機閉環；同時建立多店與帳號權限模型、敏感個資同意與遮罩，以及不會吞錯的品質閘門。

規格依據：`PRD/SPEC.md` v4.0（§4 FR、§8 M1、§10 合併清單）。

## Acceptance criteria

每條 AC 的「驗證」欄指令必須 exit 0；測試檔名為 M1 需新增的檔案，名稱可在實作 PR 中調整，但須同步更新本檔與 `SOP.md`。

- **AC-001：併入 concierge 的資料模型與商業邏輯**（上市前要補：兩個 repo 合併；FR-016／FR-017／FR-007／FR-018）
  - `src/lib/` 新增套票（總堂數、已用、剩餘、到期）、預約紀錄（日期、時間、狀態、店別、設計師）、效果紀錄（before/after、4 項膚況指標、改善幅度計算）、服務品項目錄（名稱、分類、時長、價格）模組，皆為純函式並有單元測試，涵蓋：堂數用完、過期、改善幅度正負、品項分類對應既有 4 類回訪週期。
  - 不新增 Tailwind、Framer Motion、lucide-react 等 concierge 依賴；不引用遠端圖片網域。
  - 驗證：`npm test -- tests/packages.test.ts tests/appointments.test.ts tests/effects.test.ts tests/service-catalog.test.ts`；`git diff main -- package.json` 不含上述依賴；`git grep -n "unsplash" -- src` 無結果。

- **AC-002：合併後 UI 單一入口**（兩個 repo 合併；FR-008）
  - 客戶記憶面板顯示：套票剩餘堂數、下次預約、Before/After 效果摘要（本機佔位圖）。
  - 回流漏斗（應回訪 → 已聯絡 → 已預約）在主入口可見，數字由資料計算而非寫死。
  - 主 repo 只保留一套工作台元件；未被任何頁面引用的元件目錄須刪除或接線（保留哪一套依 `PRD/SPEC.md` §13 第 3 點的決定）。
  - 驗證：`npm run e2e -- tests/e2e/merge-panels.spec.ts`（Playwright，斷言三個區塊與漏斗數字）；`npm run lint` 無 unused 錯誤。

- **AC-003：新增客戶與服務真正寫入並更新回訪清單**（FR-001／FR-002／FR-003／FR-010）
  - 可在 UI 新增、編輯客戶；新增服務會寫入療程資料（不再只寫 `visitLog`），並立即重算該客戶的下次回訪日與待聯絡清單；重新整理後保留（localStorage，假資料）。
  - 店家可調整 4 類服務的回訪天數，調整後回訪日重算。
  - 含過敏衝突的服務在儲存前顯示確認。
  - 驗證：`npm test -- tests/customer-store.test.ts tests/recall-settings.test.ts`；`npm run e2e -- tests/e2e/add-visit.spec.ts`（新增服務 → 清單更新 → reload 後仍在）。

- **AC-004：LINE 回訪提醒 dry-run adapter**（上市前要補：LINE 提醒整合；FR-013／FR-005）
  - 新增 LINE 提醒 adapter 介面與 dry-run 實作：只在草稿狀態為 `approved` 且行銷同意為 `granted` 時，產生符合 LINE Messaging API push 結構的 payload 並寫入本機「發送紀錄」，狀態標為 `dry-run`。
  - 未核准或未同意時回傳錯誤碼（`DRAFT_NOT_APPROVED`／`CONSENT_REQUIRED`），不產生 payload。
  - M1 程式不讀取任何 LINE token 環境變數，不呼叫任何網路 API。
  - 草稿編輯會保存；「標記已聯絡」寫入紀錄並推進漏斗。
  - 驗證：`npm test -- tests/line-reminder.test.ts`（以 mock `fetch` 斷言呼叫次數為 0、錯誤碼正確、payload 結構快照）；`git grep -nE "LINE_CHANNEL|CHANNEL_ACCESS_TOKEN" -- src` 無結果。

- **AC-005：多店與帳號權限模型**（上市前要補：多店與帳號權限；FR-014／FR-018）
  - 新增 workspace → store → account 模型，角色為店主、店長、設計師；設計師檔案（併入 concierge 顧問欄位）屬於帳號。
  - 純函式權限檢查 `can(account, action, resource)`：設計師只能看自己所屬店的客戶；跨店讀寫被拒；S 級敏感欄位只有店主、店長與該客戶的負責設計師可見；只有店主可匯出與刪除。
  - UI 可用假帳號切換身分與店別，畫面依權限隱藏資料與動作。
  - 驗證：`npm test -- tests/permissions.test.ts`（權限矩陣逐格測試）；`npm run e2e -- tests/e2e/role-switch.spec.ts`。

- **AC-006：敏感個資同意、遮罩與刪除**（Notion 主要風險；FR-012／FR-009）
  - 客戶新增 `sensitiveDataConsent`，與現有行銷同意分開；未取得時不可儲存過敏、皮膚狀況、效果紀錄等 S 級欄位；撤回時清除既有 S 級資料。
  - S 級欄位在 UI 預設遮罩，需明確點擊才顯示。
  - 店主可刪除單一客戶，連同療程、預約、套票、效果、發送紀錄與 localStorage 內相關資料一併移除；提供「清除本機全部資料」。
  - 匯出檔標註「含個資」警告與版本。
  - 驗證：`npm test -- tests/sensitive-consent.test.ts tests/customer-delete.test.ts`；`npm run e2e -- tests/e2e/consent-mask.spec.ts`。

- **AC-007：只用明顯假資料**（Notion 主要風險；SPEC §6.4）
  - 所有 seed、測試、fixture 改用明顯假資料：姓名加「示範」或「測試」前綴，手機號在 `09000000xx` 範圍，Email 使用 `@example.com`；移除看似真實的姓名與手機組合。
  - 新增自動檢查測試，掃描 seed 與 fixture，遇到不在假號碼範圍的 `09` 開頭手機號或非 `example.com` Email 即失敗。
  - 驗證：`npm test -- tests/fixtures-safety.test.ts`；`git grep -nIE "(sk-[A-Za-z0-9]{10,}|AKIA[0-9A-Z]{12,}|ghp_[A-Za-z0-9]{20,}|-----BEGIN)" -- src tests .github` 無結果。

- **AC-008：品質閘門可重跑且不吞錯**
  - `package.json` 新增 `typecheck`（`tsc --noEmit`）與 `e2e`（Playwright，固定 `Asia/Taipei`、每次清空 localStorage）script；修正目前 `tests/persistence.test.ts` 的型別錯誤。
  - `next` 改為固定版本，不使用 `latest`；只保留一種 lockfile（npm 或 pnpm 擇一）。
  - CI 移除 lint 的 `continue-on-error` 與 test 的 `|| echo`，新增 typecheck 與 e2e job；deploy 需等全部 job 通過。
  - README 的測試數量、結構與指令與實際一致。
  - 驗證：`npm run lint && npm run typecheck && npm test && npm run build && npm run e2e` 全部 exit 0；PR 上 GitHub Actions 全綠；`grep -nE "continue-on-error|\|\| echo" .github/workflows/ci.yml` 無結果。

## Out of scope

- 真實 LINE 發送、LINE 官方帳號／Messaging API token 申請與設定（M2 才接測試頻道）。
- 計費、金流、發票、方案扣款（M2 測試模式、M3 正式）；M1 不建立任何金流商帳號或金鑰。
- 真實客戶資料、試用店家資料、真人照片；找 2–3 家店試用（M2）。
- 後端、資料庫、雲端同步、真實登入與 server-side 授權、欄位加密（M2）。
- 預約排程系統、會員自助入口（concierge 會員端頁面）、AI 推薦、POS。
- production 部署、Vercel 設定變更；封存、刪除或改名 `beauty-crm-concierge`（由 Sean 決定）。

## Exit gate

- AC-001～AC-008 的驗證指令全部 exit 0，並把指令與結果記錄於 `STATUS.md`。
- 實作 PR 的 GitHub Actions 全綠（lint、typecheck、test、build、e2e）。
- `PRD/SPEC.md` §10 合併清單中每個「要搬」項目都有對應模組與測試；「不搬」項目原因仍成立。
- Sean 覆審 scope 並確認 `PRD/SPEC.md` §13 待決事項後，才可進入 M2（後端、加密、LINE 測試頻道、計費測試模式、試用店家）。
