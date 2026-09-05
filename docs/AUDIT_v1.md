# beauty-crm v1 SPEC Audit Report (v0.2.0 → 目標 v0.3.0)

> 對齊 PRD/SPEC.md v3.0 §1-§9
> 報告日期：2026-09-05
> 審計範圍：FR-001~FR-010、AC-001~AC-010、DoD 10 條、上線閘門 5 條
> 評審基準：v0.2.0 production-ready push（4 milestone / 47 tests / CI / ESLint / a11y）

---

## 1. Functional Requirements (FR-001~FR-010)

| 編號 | 描述摘錄 | 狀態 | 證據 (file:line) | 建議修法 |
|---|---|---|---|---|
| FR-001 | 客戶檔案：聯絡方式、偏好、禁忌與同意狀態 | **PASS** | `src/lib/customers.ts:6-53`（Customer 型別 + `createCustomer` 驗證 phone regex `^09\\d{8}$`、consent 預設 `pending`）；`tests/customers.test.ts:12-81`（8 個 AC 涵蓋必填/格式/同意/搜尋/過敏/toggle） | — |
| FR-002 | 療程紀錄：項目、日期、產品、照片與設計師備註 | **PARTIAL** | `src/lib/treatments.ts:10-56`（Treatment 介面有 `serviceName/performedAt/productIngredients/notes/designerId`）；`tests/treatments.test.ts:19-68`（7 個 AC） | 「照片 (Before/After)」欄位整個缺失；`designerId` 未被任何測試覆蓋。建議在 `Treatment` 加 `photos: PhotoRef[]`、新增 `addPhoto` 工具與 edge case 測試 |
| FR-003 | 服務週期模板：美甲/美睫/護膚/髮型可調 | **PARTIAL** | `src/lib/treatments.ts:75-83`（`DEFAULT_RECALL_DAYS` 硬編碼 28/21/30/45 + `suggestRecallDays`）；`tests/treatments.test.ts:63-68` | 「可調」尚未實作 — 無法由設計師自訂週期。建議改為接收自訂 `rules: Record<Category, number>` 參數（向後相容 DEFAULT），加測試驗證覆寫後 `computeReminder` 用新值 |
| FR-004 | 下一次回訪日期與「待聯絡」清單 | **PARTIAL** | `src/lib/reminders.ts:29-77`（`computeReminder` 自動算 `suggestedRecallAt`；`listOverdue` 排序；`listDueSoon`）；`tests/reminders.test.ts:13-85`（5 個 AC + 1 個時區守護） | 「手動覆寫」未實作：Reminder 介面無 `manualOverrideDate` 欄位；Dashboard 沒按鈕。建議在 `Reminder` 加 optional `overrideAt?: string`、`overriddenBy?: string`、`overrideReason?: string`，並提供 setter；新增 override 測試 |
| FR-005 | 設計師手動核准的 LINE/簡訊草稿，不直接自動發送 | **PARTIAL** | `src/lib/broadcast.ts:113-126`（`buildBroadcast` 產出 `BroadcastTarget.preview` 草稿）；`tests/broadcast.test.ts:84-103`（consent 過濾 + revoke 阻擋） | 「核准」狀態機缺：`BroadcastTarget` 無 `status: 'draft'\|'approved'\|'sent'` 欄位；無 approve/send action；現有 `recheckConsentBeforeSend` 只能 recheck，無法鎖定版本。建議加狀態欄位 + `approve(target, designerId)` + 不可變已核准草稿 |
| FR-006 | 客戶標籤與 VIP 依回訪/消費可解釋計算 | **PARTIAL** | `src/lib/tiers.ts:15-83`（`DEFAULT_TIER_RULES` 4 級 minSpend 0/5k/20k/60k + `tierForSpend` + `progressToNextTier`）；`tests/tiers.test.ts:4-54`（10 個 AC）；`src/lib/customers.ts:6-19`（Customer.tags） | (a) VIP/tier 僅依 `totalSpent`，SPEC 寫「依回訪/消費」需結合回訪率（`computeReminder` status）— 缺多因子計算；(b) Dashboard.tsx:129 只顯示 `tier.label` 與 `spend`，未顯示「為何是這個 tier」（即 `minSpend` 與差額），呼應 AC-009。建議新增 `tierReason(tier, ltv)` 工具與 Dashboard 顯示 |
| FR-007 | Before/After 照片壓縮與明確同意紀錄 | **FAIL** | 整個 repo `grep -E "photo\|Photo"` 0 hit（`ProductIngredients` 字串陣列非照片）；`src/lib/treatments.ts` 無 photo 欄位；無任何 compression util；無 consent-with-photo 標記 | 整條鏈未實作。需新增：(1) `src/lib/photos.ts` 提供 `compressPhoto(file, {maxSizeKB:500, originalKeepLocal:true})` 純前端 Canvas/Web Worker；(2) `Treatment.photos: CompressedPhoto[]` 並保留原圖 reference；(3) `Customer.photoConsent: {grantedAt, scope, revokedAt?}`；(4) 對應單元 + 邊界測試（無 canvas 時的 fallback） |
| FR-008 | 回流漏斗：應回訪、已聯絡、已預約（手動標記） | **FAIL** | `src/lib/reminders.ts:68-77` 只有「應回訪」清單；`tests/reminders.test.ts:54-70` 僅驗 listOverdue 排序；全 repo 無 `contactLog` / `appointmentLog` / `status` 標記結構 | 漏斗三階段（應回訪/已聯絡/已預約）只有第一階段。需新增 `src/lib/funnel.ts`：`ContactLog {customerId, contactedAt, channel, outcome:'connected'\|'no-answer'\|'booked'}`、`AppointmentLog {customerId, bookedAt, scheduledFor}`；`Reminder.status` 升級為可被 `markContacted/markBooked` 改寫；新增 3 個 E2E 測試 |
| FR-009 | 本地加密匯出、資料刪除與裝置警告 | **PASS** | `src/lib/export.ts:115-198` `exportEncrypted` / `decryptEncrypted`（PBKDF2 SHA-256 200k iter + AES-GCM 256）；`src/lib/export.ts:206-228` `InvalidPassphraseError` / `ExportFormatError`；`src/lib/delete.ts:88-115` `purgeAllData` + `dispatchTombstone` + `confirmPurgeWithGracePeriod`；`src/components/Dashboard.tsx:165-178` 「⚠ 裝置共用警告」橫幅 + `:226-269` 「📦 資料管理」卡片（匯出 / 還原 / 刪除 三鈕）；`tests/export.test.ts`（11 AC） + `tests/delete.test.ts`（8 AC） | — |
| FR-010 | 手機單手快速新增服務紀錄 | **PASS** | `src/components/AddTreatmentSheet.tsx:74-115` `addTreatmentReducer`（純函式可測）；`:189-220` 表單欄位（autofocus customer / 5 preset / 過敏醒目 / 必填驗證）；`:263-272` submit 呼叫 `recordTreatment`；`src/lib/responsive.ts:17-22` 斷點工具；`src/components/Dashboard.tsx:147-148` 「＋ 新增服務紀錄」按鈕 + `:230-237` 掛載 sheet；`tests/addTreatment.test.tsx`（14 AC，react-dom/server SSR） + `tests/responsive.test.ts`（10 AC） | — |

---

## 2. Acceptance Criteria (AC-001~AC-010)

| 編號 | 描述摘錄 | 狀態 | 證據 | 建議修法 |
|---|---|---|---|---|
| AC-001 | 新增客戶時可記錄偏好、禁忌與資料同意 | **PASS** | `src/lib/customers.ts:21-53` (`createCustomer` 接受 `preferences[]` / `allergies[]` / `consent`)；`tests/customers.test.ts:12-19, 62-73, 75-81` 涵蓋建檔、過敏、同意 toggle | —（補一個 integration：建檔→同意→出現在 campaign 即可） |
| AC-002 | 新增服務後自動計算下一次建議日期且可手動覆寫 | **PASS** | 自動計算：`src/lib/reminders.ts:66-118` `computeReminder` + `tests/reminders.test.ts:20-35, 122-216`；手動覆寫：`src/lib/reminders.ts:51-64` `setOverride` + `OverrideOptions`；Dashboard `reminders` tab：「覆寫回訪日」按鈕 round 2 改為資料驅動（`Dashboard.tsx:309-322`：用客戶 lastTreatment.performedAt + suggestRecallDays(category) 計算 overrideAt，overriddenBy 用 lastSubmission.designerId）；`tests/reminders.test.ts:148-216` 6 個 AC | — |
| AC-003 | 打開客戶頁 2 秒內看到上次服務摘要 | **PARTIAL** | 摘要顯示：`src/components/Dashboard.tsx:77-91`（customers tab 顯示 last treatment + 累計消費）；「2 秒內」未測量 — `tests/integration.test.ts:70-90` 只測 100 客戶批次 < 2s，非頁面渲染時間 | 加 Playwright 實測 `domcontentloaded → last treatment visible` P95 < 2s on throttled CPU 4x；Dashboard 已 in-memory，渲染時間遠低於 2s，缺的是 measurement |
| AC-004 | 含過敏/禁忌的客戶在服務建立前顯示醒目確認 | **PASS** | util 完整：`src/lib/customers.ts:100-106` `hasAllergyConflict` + `tests/customers.test.ts:62-73`；醒目確認 UI：`src/components/AddTreatmentSheet.tsx:316-348` submit 前偵測衝突 → 紅色 alert (role=alert aria-live=assertive) 列出衝突成分 + 需勾選「已知風險，繼續」checkbox 才放行；reducer 強制「換客戶 / 改成分就清空已確認」；`tests/addTreatment.test.tsx:103-120` 驗證 SSR markup + reducer 5 個 AC | — |
| AC-005 | 照片大於 5MB 時壓縮到 500KB 左右並保留原檔不出裝置 | **FAIL** | 0 hit — 無 photo 邏輯 | 同 FR-007。壓縮後檔案 < 500KB 用 `canvas.toBlob` + 迭代 quality；「保留原檔不出裝置」= 不送任何後端；新增測試：mock 5MB Blob → output < 500KB；output URL 為 `blob:` 不走 network |
| AC-006 | 回訪清單可依逾期天數排序 | **PASS** | `src/lib/reminders.ts:73-76` (`listOverdue` 排序 `a.daysUntilRecall - b.daysUntilRecall`)；`tests/reminders.test.ts:54-70` 驗證 c1 (-32) 排在 c2 (-29) 前面 | — |
| AC-007 | LINE 草稿必須先由設計師核准 | **FAIL** | `src/lib/broadcast.ts:113-126` 產出 draft preview；無 `approve` action；無 BroadcastTarget.status；`tests/broadcast.test.ts:84-103` 只驗 consent 過濾 | `BroadcastTarget` 加 `status: 'draft'\|'approved'\|'sent'\|'cancelled'`、`approvedBy?: string`、`approvedAt?: string`；加 `approve(target, designerId)` 不可變鎖定；UI 加「✓ 核准」按鈕；測試：未核准不可 send、撤同意後即使 approved 也要 recheck |
| AC-008 | 客戶撤回行銷同意後不再出現在 campaign 清單 | **PASS** | `src/lib/broadcast.ts:67-69` (`selectByConsent`)、`src/lib/broadcast.ts:128-135` (`recheckConsentBeforeSend`)；`tests/broadcast.test.ts:33-42, 84-103`；`tests/integration.test.ts:49-52` 端到端驗證 | — |
| AC-009 | VIP 規則顯示觸發原因而非黑箱 badge | **PARTIAL** | tier 規則可解釋：`src/lib/tiers.ts:15-83`（4 級 minSpend/discount/perks 全 explicit）；顯示原因：缺失 — `src/components/Dashboard.tsx:123-133` 只顯示 `{c.name} — NT${total}（{tier.label}，共 N 次）` | 新增 `tierReason(tierRule, ltv)` 回傳「累計 NT$xx 達到 {label}（門檻 NT$yy）」字串；Dashboard 改用此字串；加測試：silver at 6000 → reason 包含「5,000」與「銀卡」 |
| AC-010 | 匯出/刪除流程可由店主獨立完成 | **PASS** | `src/lib/export.ts:115-198` 加密匯出（PBKDF2 + AES-GCM） + `src/lib/delete.ts:88-115` 刪除 + tombstone；`src/components/Dashboard.tsx:226-269` 「📦 資料管理」卡片（單一鈕：📤 加密匯出 / 📥 還原備份 / 🗑 刪除所有資料）；`src/lib/delete.ts:60-71` `confirmPurgeWithGracePeriod(24)` 排程；`src/lib/delete.ts:65-71` 刪除 dispatch `beauty-crm:purge` 事件 + UI 監聽顯示 tombstone；`tests/export.test.ts` 11 個 AC（含 passphrase 錯誤 throw / 竄改 throw / schema version 錯誤 throw / round-trip / 空資料 / 同 data 兩次加密差異） + `tests/delete.test.ts` 8 個 AC（含 tombstone dispatch / 24h grace / 預設 4 scopes） | — |

---

## 3. v1 MVP DoD (§6.1 10 條)

| 編號 | 描述 | 狀態 | 證據 | 建議修法 |
|---|---|---|---|---|
| DoD-1 | §1-§13、§15 皆可對應 issue 與驗收案例 | **PARTIAL** | SPEC v3.0 本身存在（`PRD/SPEC.md:1-12` 文件資訊表）；GitHub issue 0（`gh` CLI 不可用，無 .github/ISSUE_TEMPLATE）；測試標題已含 `AC:` prefix（見 `tests/*.test.ts` 全檔） | 把每個 FR / AC 對應到 GitHub issue（可用 `.github/ISSUE_TEMPLATE/` + labels：`FR-001`…`AC-010`）；或在 `docs/AC_MAPPING.md` 維護對照表 |
| DoD-2 | P0 都有 unit + error + 1 E2E happy path | **PARTIAL** | unit：`tests/customers.test.ts` (8) / `tests/treatments.test.ts` (7) / `tests/reminders.test.ts` (5+1) / `tests/broadcast.test.ts` (9) / `tests/analytics.test.ts` (5) / `tests/tiers.test.ts` (10) = 45 unit + integration；E2E：`tests/integration.test.ts:13-68`（2 條完整旅程），但 **FR-007/008/009/010 0 測試** | 補 4 個新 test 檔：`tests/photos.test.ts`、`tests/funnel.test.ts`、`tests/export.test.ts`、`tests/addTreatment.test.ts`（含 RTL） |
| DoD-3 | sweet spot 核心 job 由 5 位外部 pilot 從空白完成 | **FAIL** | 0 pilot 證據；`README.md` / `PLAN.md` / `CHANGELOG.md` / `SECURITY_NOTES.md` 都未提 pilot 啟動 | 此項需離開純程式 — Owner 啟動 §11 訪談 SOP；非本 audit 範圍可解 |
| DoD-4 | 敏感資料 刪除/匯出/權限測試 | **FAIL** | 三者皆 0 實作（見 FR-009 / AC-010） | 同 FR-009 / AC-010 |
| DoD-5 | provider failure 降級路徑保留輸入 + 給下一步 | **PARTIAL** | `SECURITY_NOTES.md` / `PRD/SPEC.md §5.3` 描述降級原則；實際程式碼：0（前端無 provider 呼叫） | 雖 v1 無外部 LLM，但「資料刪除失敗」「匯出失敗」等內部操作需降級 UI（見 §5.3 表 EXPORT_FAILED/DELETE_FAILED） |
| DoD-6 | Mobile 390 / tablet 768 / desktop 1440 主流程 | **PARTIAL** | `src/components/Dashboard.tsx:44` `maxWidth: 960` + `flexWrap: 'wrap'` on nav（line 50）有基本響應式；無明確 3 斷點測試 | 加 3 個 Playwright 螢幕斷點跑 `dashboard.spec.ts`；Dashboard 改為 `clamp()` 寬度或加 media query |
| DoD-7 | Lighthouse a11y ≥90 + 鍵盤/焦點/空狀態 | **PARTIAL** | a11y polish in v0.2.0：`Dashboard.tsx:33` `role="status" aria-live="polite"`、`:52-60` `aria-current`、`:23-26` `button:focus-visible` outline；Lighthouse 未實測；空狀態部分覆蓋（`Dashboard.tsx:112` 月營收空陣列、`:148` 推播 0 筆） | 加 `lighthouse-ci` GitHub Action，門檻 a11y ≥90；鍵盤測試需 Tab 走訪 5 個分頁 + Enter 啟動 + Esc 關閉 modal |
| DoD-8 | 成本/事件/版本/決策 可由 maintainer 追查 | **PARTIAL** | 版本：`Customer` / `Treatment` 介面無 `version` 欄位（SPEC §4.3 Prisma schema 有）；事件：0 audit log；決策：`PRD/SPEC.md §7.2 ADR-001~005` 已記錄；成本：無 metrics | `Customer` / `Treatment` 加 `version: number`（從 Prisma schema 對齊）；新增 `src/lib/audit.ts` 簡易 event log（in-memory + console.debug）；`docs/DECISION_LOG.md` 維護 sprint 決策 |
| DoD-9 | 不以 mock 冒充真實市場或模型品質 | **PASS** | `README.md:22` 明確「純前端 in-memory v1 不含 DB / API」；`PRD/SPEC.md:8` 「不可把 mock、HTTP 可達性或訪談口頭意願當成營收事實」；`SECURITY_NOTES.md:9-11` 承認 v1 限制 | — |
| DoD-10 | sweet=2/3 時 §11 go/no-go 才能 v2 | **PARTIAL** | sweet=7.6（`PRD/SPEC.md:6`），條件未觸發，本項 N/A；但 §11 go/no-go 本身（pilot 5/5、2 次核心 job 完成率 ≥60%）**未達** | §11 KPI 需被 owner 啟動 pilot 才驗證；本 audit 不驗 |

---

## 4. 上線閘門 (§6.2 5 條)

| 編號 | 描述 | 狀態 | 證據 | 建議修法 |
|---|---|---|---|---|
| Gate-1 | Privacy/Terms/Contact 頁面 + 資料刪除說明 | **FAIL** | 0 頁面；`src/app/` 只有 `layout.tsx` + `page.tsx` + `globals.css`；無 `/privacy` `/terms` `/contact` route | 新增 `src/app/privacy/page.tsx`（含 §1.5 Non-Goals 衍生條款、§5.2 安全、§10.4 error code）、`/terms`、`/contact`；資料刪除說明連結 FR-009 流程 |
| Gate-2 | 監控告警 + rollback runbook | **FAIL** | CI 0 monitor；`docs/` 0 檔；無 Sentry / OpenTelemetry | 至少加 `docs/RUNBOOK.md`（含「匯出失敗→檢查 passphrase」「刪除卡住→查 audit log」runbook）+ 簡易 Sentry 接線或 console event 上報到 `/api/healthz` |
| Gate-3 | 10 條 AC 在 CI 全綠 | **PARTIAL** | `.github/workflows/ci.yml:31-38` 跑 `lint + test + build`；`tests/*.test.ts` 47 passed（per CHANGELOG）；但 AC-005 / AC-007 / AC-010 FAIL = CI **不會全綠** 等到 v0.3.0 補齊 | 把 10 條 AC 編號標籤對應到 `it('AC-005: ...', ...)` 命名（部分已有 prefix「AC:」但混用），CI 跑 `grep -E "AC-00(1|2|3|4|5|6|7|8|9|10)" tests/` 確認覆蓋率 |
| Gate-4 | 5 位 pilot 同意回饋資料用途 | **FAIL** | 0 pilot 證據 | 同 DoD-3 — owner 啟動 §11.2 訪談 SOP，產出 `docs/PILOT_CONSENT.md` 含 5 份同意書 hash |
| Gate-5 | Owner 簽署「不把 sweet spot 假設當成事實」 | **FAIL** | 0 簽署文件；`PRD/SPEC.md:6` 雖列 sweet=7.6 但無 owner signature | 在 `docs/AUDIT_v1.md`（本檔）末尾或 `PRD/SPEC.md` 頂部加「Owner 簽署區」含日期 + 簽名；對應 §0 文件資訊表的 owner 欄位 |

---

## 5. 總結：所有 FAIL 與 PARTIAL（按優先級排序）

### 高優先（影響核心 job，必須 v0.3.0 修）

- [x] **FR-007** 照片壓縮 5MB→500KB：FAIL — 完全未實作。阻擋 FR-002 完整閉環
  - Round 1 修：`src/lib/photos.ts` `compressPhoto` 純前端 Canvas 迭代 quality（0.92→0.52）
    + `Customer.photoConsent` + `setPhotoConsent` + `Treatment.photos` + `addPhoto` + 8 個 AC（commit `f371156`）
- [x] **FR-009** 本地加密匯出/刪除/裝置警告：FAIL — 阻擋 AC-010、DoD-4、Gate-1
  - Round 2 修：`src/lib/export.ts` PBKDF2 + AES-GCM 加密匯出 + `src/lib/delete.ts` purge + tombstone +
    Dashboard 警告橫幅 + 匯出/還原/刪除三鈕 + 19 個 AC（commit `62b15a1`）
- [x] **FR-010** 手機單手快速新增：FAIL — 阻擋 AC-002 人工覆寫、AC-004 過敏確認、DoD-6 mobile 主流程
  - Round 2 修：`src/components/AddTreatmentSheet.tsx` mobile-first bottom sheet + 5 preset 快捷 +
    過敏醒目確認 + useReducer + `src/lib/responsive.ts` 斷點工具 + 24 個 AC（commit `fd5055d`）
- [ ] **FR-008** 回流漏斗手動標記：FAIL — 只剩「應回訪」一階段，漏斗 KPI 無法量測
  - 留給 round 3
- [x] **FR-005 / AC-007** 草稿核准狀態機：FAIL — `BroadcastTarget` 缺 `status` + approve action；影響核心「不自動發送」的可驗證性
  - Round 1 修：`BroadcastTarget.status` + `approve()` + `markSent()` + `recheckConsentBeforeSend` 改 throw +
    Dashboard 推播 tab 核准按鈕 + 9 個 AC（commit `c8c74d4`）
- [x] **AC-005** 照片壓縮 5MB→500KB：FAIL（同 FR-007）— Round 1 修（同 commit `f371156`）

### Round 1 同時修的 PARTIAL 項目

- [x] **FR-003**（PARTIAL → PASS）：`suggestRecallDays` 加 `customRules` 參數，2 個 AC（commit `9ee8c1d`）
- [x] **FR-004**（PARTIAL → PASS）：`Reminder` 加 `overrideAt/By/Reason` + `setOverride` + Dashboard 覆寫按鈕，3 個 AC（commit `9ee8c1d`）
- [x] **AC-002**（PARTIAL → PASS）：自動計算 + 手動覆寫完整鏈，3 個 AC（commit `9ee8c1d`）
  - Round 2 補強：Dashboard 覆寫按鈕 hardcode 改為資料驅動（`Dashboard.tsx:309-322`），
    `AC-002-UI` 部分從 PARTIAL 升為 PASS（commit `fd5055d`）

### 中優先（影響 AC 與 DoD）

- [x] **AC-010** 匯出/刪除流程：FAIL（同 FR-009）— Round 2 修（同 commit `62b15a1`）
- [x] **AC-002-UI PARTIAL**（自動算有，手動 override 缺）— Round 2 修（Dashboard 覆寫按鈕改資料驅動，commit `fd5055d`）
- [x] **AC-004 PARTIAL**：`hasAllergyConflict` util 有，UI 醒目確認缺 — Round 2 修（AddTreatmentSheet 紅色 alert + 已知風險勾選，commit `fd5055d`）
- [ ] **AC-003 PARTIAL**：摘要顯示有，2 秒 perf 未測量 — 留給 round 3（需 Playwright + throttled CPU 4x 環境）
- [ ] **FR-006 / AC-009 PARTIAL**：tier 可解釋但 UI 未顯示觸發原因 — 留給 round 3（`tierReason` util + Dashboard reason 文字）
- [ ] **FR-002 PARTIAL**：`designerId` 已加欄位但 `tests/treatments.test.ts` 對 `designerId` edge case 尚未補
- [ ] **DoD-2 PARTIAL**：4 個 FR 全部補上測試 → round 2 完成 FR-007/009/010 三個；FR-008 留 round 3
- [ ] **DoD-5 PARTIAL**：內部操作降級 UI 缺（無 EXPORT_FAILED/DELETE_FAILED 顯示）— round 2 在 export / restore 訊息以 role=status 顯示，但缺系統化 error code UI（EXPOR_FAILED/DELETE_FAILED）
- [ ] **DoD-6 PARTIAL**：3 斷點未測試 — Round 2 部分覆蓋（`tests/responsive.test.ts` 對 320/390/480/768/900/1440 各 layout mode 驗證，commit `fd5055d`）；Lighthouse 仍缺
- [ ] **DoD-7 PARTIAL**：Lighthouse a11y ≥90 未實測 — 留給 round 3
- [ ] **DoD-8 PARTIAL**：`version` 欄位 + audit log 缺 — 留給 round 3

### 低優先（影響上線閘門與文件）

- [ ] **Gate-1 FAIL**：Privacy/Terms/Contact 頁面
- [ ] **Gate-2 FAIL**：監控告警 + rollback runbook
- [ ] **Gate-3 PARTIAL**：AC 編號未系統化標到 CI
- [ ] **Gate-4 FAIL**：5 pilot 同意書
- [ ] **Gate-5 FAIL**：Owner 簽署區
- [ ] **DoD-1 PARTIAL**：issue 對應未建
- [ ] **DoD-3 FAIL** / **DoD-10 PARTIAL**：pilot 啟動（owner 動作，非技術）
- [ ] **FR-001** PASS 但僅 API 層，無 UI 表單（與 FR-010 一起修）

---

## 6. 建議的 commit 拆法

把 v0.3.0 切成 7 個 logical commit（按 domain / FR），commit prefix 沿用 `rpb(v1):`：

- [x] **Commit 1** `rpb(v1): FR-007/AC-005 照片壓縮 + 同意紀錄`（round 1 commit `f371156` ✓）
- [x] **Commit 2** `rpb(v1): FR-009/AC-010 本地加密匯出 + 刪除 + 裝置警告`（round 2 commit `62b15a1` ✓）
- [x] **Commit 3** `rpb(v1): FR-010/AC-002-UI/AC-003/AC-004 手機新增服務表單 + 單手 UI`（round 2 commit `fd5055d` ✓；AC-003 2 秒 perf 測量留 round 3）
- [ ] **Commit 4** `rpb(v1): FR-008 回流漏斗 + 手動標記`（新檔 `src/lib/funnel.ts` ~100 行 + `src/lib/reminders.ts` 升級 `Reminder.status` + `markContacted/markBooked` ~50 行修改 + `tests/funnel.test.ts` ~80 行 + Dashboard 漏斗 tab 視覺 ~60 行）— 留給 round 3
- [x] **Commit 5** `rpb(v1): FR-005/AC-007 草稿核准狀態機`（round 1 commit `c8c74d4` ✓）
- [x] **Commit 6** `rpb(v1): FR-003/FR-004/AC-002 可調週期 + 手動覆寫`（round 1 commit `9ee8c1d` ✓）
- [ ] **Commit 7** `rpb(v1): FR-006/AC-009 VIP 觸發原因 + 上線閘門文件`（`src/lib/tiers.ts` 加 `tierReason()` + Dashboard 顯示原因 + `src/app/privacy/page.tsx` + `src/app/terms/page.tsx` + `src/app/contact/page.tsx` + `docs/RUNBOOK.md` + `docs/AC_MAPPING.md` + 補 `Customer.version` / `Treatment.version` 欄位）— 留給 round 3

> Round 2 完成度：§6 拆法 7 個 commit 中 5 個完成（1/2/3/5/6），剩 4（FR-008）與 7（FR-006/AC-009 + 上線閘門文件）留 round 3。

---

## 7. 統計

| 區塊 | PASS | PARTIAL | FAIL | 小計 |
|---|---|---|---|---|
| §3.1 FR-001~FR-010 | 4 (was 1) | 4 (was 5) | 2 (was 4) | 10 |
| §3.4 AC-001~AC-010 | 6 (was 3) | 3 (was 4) | 1 (was 3) | 10 |
| §6.1 DoD 10 條 | 1 | 5 | 2 (+ 2 owner-action) | 10 |
| §6.2 上線閘門 5 條 | 0 | 1 | 4 | 5 |
| **總計** | **11** (was 5) | **13** (was 15) | **9** (was 13) | **35** |

> 註：DoD-3 / DoD-10 / Gate-4 / Gate-5 為 owner 動作（pilot 啟動、文件簽署），雖記為 FAIL/PARTIAL，但非純技術 gap。
> 若排除 owner-action：技術面 **11 PASS / 13 PARTIAL / 5 FAIL = 29 項**（round 2：+6 PASS / -2 PARTIAL / -4 FAIL）。
>
> Round 2 修了：FR-009 / FR-010 / AC-010 / AC-002-UI / AC-004 / DoD-2 補了 FR-009/010 測試 / DoD-6 部分覆蓋。

---

## 8. v0.3.0 預估工時

- Commit 1（照片）：~320 行 / 1.5 sprint
- Commit 2（匯出/刪除）：~430 行 / 2 sprint
- Commit 3（新增表單 + Playwright）：~440 行 / 1.5 sprint
- Commit 4（漏斗）：~350 行 / 1 sprint
- Commit 5（草稿核准）：~180 行 / 0.5 sprint
- Commit 6（可調 + override）：~210 行 / 0.5 sprint
- Commit 7（VIP reason + 文件 + 上線閘門）：~310 行 / 1 sprint

總計約 **~2,240 行新增/修改 + ~570 行測試**，約 2 個 sprint 完成。

---

## 9. Owner 簽署區（對應 §6.2 Gate-5）

> 「不把 sweet spot 假設當成事實；v0.3.0 technical gap 與市場驗證（§11 pilot）需分開追蹤。」

- 簽署人：________________（owner 簽署：Sean Li）
- 日期：________________（owner 填入實際日期）
- 備註：________________

### Round 3 補位說明

v0.3.0 round 3 commit `fix/v0.3.0-round3` 補齊以下技術項目，把對應的上線閘門技術條件推到可驗證狀態：

- **Gate-1**：新增 `src/app/privacy/page.tsx`、`/terms/page.tsx`、`/contact/page.tsx` 三個靜態頁面
  （技術已完成；owner 真實聯絡資訊待 owner 替換 placeholder）
- **Gate-2**：新增 `docs/RUNBOOK.md` 涵蓋匯出失敗、刪除卡住、provider 失敗降級、
  CI 紅燈、audit log 查詢
- **DoD-1**：新增 `docs/AC_MAPPING.md` 對照表
- **Gate-5**：本節為 owner 簽署區的技術檔建立；真實簽署為 owner 動作（見下方 deferred）

> 此區段為技術檔的「佔位」（technical placeholder），**不是 owner 真實簽署**。
> 真正的 owner 簽署需由 Sean 本人在上線前填入。
