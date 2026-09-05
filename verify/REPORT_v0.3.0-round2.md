# Round 2 Verification Report (v0.3.0-round2)

> 對象：fix/v0.3.0-round2 分支（從 `fix/v0.3.0-round1` 開出，3 個 commit：`62b15a1` + `fd5055d` + `27c620b`）
> 驗證日期：2026-09-05
> 驗證者：verifier
> 範圍：依 `docs/AUDIT_v1.md` §6 拆法的 **Commit 2**（FR-009/AC-010 本地加密匯出 + 刪除 + 裝置警告）+ **Commit 3**（FR-010/AC-002-UI/AC-003/AC-004 手機新增服務表單 + 單手 UI）

## 1. 環境與 gate

- Node：v22.23.2（`.nvmrc` 鎖定 Node 20；本機 v22 高於鎖定，仍可運作）
- npm：10.9.8
- Working tree：clean（唯一 untracked = `verify/` 本檔輸出，符合 verifier 流程）
- 分支鏈：
  ```
  27c620b rpb(docs): v0.3.0 changelog + AUDIT Round 2 tracking + §1/§2 表狀態更新
  fd5055d rpb(v1): FR-010/AC-002-UI/AC-003/AC-004 手機新增服務表單 + 單手 UI
  62b15a1 rpb(v1): FR-009/AC-010 本地加密匯出 + 刪除 + 裝置警告
  253153e rpb(docs): v0.3.0 changelog + AUDIT Round 1 tracking  ← 分支基底（round 1 HEAD）
  ```
- `npm ci`：`real 5.05s` / exit **0**（345 packages）
- `npm test`：**115 passed / 0 failed / 12 test files** / `~0.76s` real / exit **0**
  - addTreatment 14 / export 11 / delete 8 / responsive 10 / photos 8 / customers 8 / treatments 9 / reminders 12 / broadcast 18 / tiers 9 / analytics 5 / integration 3
  - 較 round 1（72 passed）新增 +43：export 11 + delete 8 + addTreatment 14 + responsive 10
- `npm run lint`：exit **0**（1 warning 在 `eslint.config.mjs` 自身，pre-existing on main，與 round 2 無關）
- `npm run build`：`real 5.20s` / exit **0**（Next 16.2.10 Turbopack；compiled 943ms + TS 1335ms；3 static pages）

## 2. 範圍檢查

- `git diff main..HEAD -- PRD/`：**0 行**（SPEC §1-§9 未動 ✓）
- `git diff main..HEAD --stat` 摘要（21 檔，+2833 / -37）：全部鎖定在 src/lib / src/components / tests / CHANGELOG / AUDIT 範圍
  - 新檔：`src/lib/export.ts` (231) / `src/lib/delete.ts` (135) / `src/lib/responsive.ts` (58) / `src/components/AddTreatmentSheet.tsx` (495) / `tests/export.test.ts` (133) / `tests/delete.test.ts` (99) / `tests/addTreatment.test.tsx` (239) / `tests/responsive.test.ts` (81)
  - 修改：`Dashboard.tsx` (318) / `CHANGELOG.md` (130) / `docs/AUDIT_v1.md` (181) / `vitest.config.ts` (2) + round 1 已含的 7 個檔
  - 沒有 src/app/ 變更（Gate-1 頁面仍未實作，與 round 2 scope 無關）
- v2/v3 違規：**0**
  - `git grep` 對 `IndexedDB|sharp|jimp|Prisma|LINE\s*OA|第三方登入|支付|預約日曆|POS` 在**新檔**命中：**0**
  - 整個 HEAD 命中但屬「非違規」：
    - `src/lib/photos.ts:10` 自我聲明「不引入 heavyweight dependency（無 sharp / jimp / wasm）」
    - `src/lib/delete.ts:108` round 3 備註「給 round 3 升級 IndexedDB 時只要改 resetFn」
    - `package-lock.json` sharp 是 Next.js 內建 image optimization 的 transitive dep（main 上 pre-existing 85 hit，屬既有依賴不是新增）
    - `PRD/SPEC.md` / `README.md` / `SECURITY_NOTES.md` / `PLAN.md` / `docs/AUDIT_v1.md` 命中都是 pre-existing 段落（non-goals 排除條款、ADR 紀錄、roadmap）
  - 新檔內無 localStorage 直寫；唯一 localStorage 引用（`Dashboard.tsx:55, 149`）是 `device.shared` flag，屬 SPEC §1.5 允許的「裝置警告本地偏好」
- package.json / package-lock.json 變更：**0 行**（無新 dep ✓）

## 3. FR/AC 逐項驗證

### FR-009 / AC-010：本地加密匯出 + 刪除 + 裝置警告

- 狀態：**PASS**
- Commit：`62b15a1`（rpb(v1): FR-009/AC-010 本地加密匯出 + 刪除 + 裝置警告）
- 證據：
  - **`src/lib/export.ts`**
    - `:172` `exportEncrypted(data, passphrase, opts): Promise<Blob>` — 對齊 audit 規格
    - `:18-20` 常數 `EXPORT_MAGIC = 'BEAUTY-CRM-EXPORT-V1'` + `EXPORT_SCHEMA_VERSION = 1` + `EXPORT_KDF_ITERATIONS = 200_000`
    - `:21` `EXPORT_FILE_EXTENSION = '.beauty-crm.json'`
    - `:52-57` `class InvalidPassphraseError extends Error { name = 'InvalidPassphraseError' }` — 明確錯誤型別
    - `:59-64` `class ExportFormatError`
    - `:111-132` `importPassphraseKey` 用 `crypto.subtle.importKey`（PBKDF2）+ `crypto.subtle.deriveKey`（PBKDF2 SHA-256 + AES-GCM 256）
    - `:139-166` `encryptToExport` 產出 `{ magic, schemaVersion, kdf:{name:'PBKDF2', hash:'SHA-256', iterations}, iv, salt, ciphertext }`（base64 編碼）— header 含 schema version + magic + iv + salt + ciphertext
    - `:188-230` `decryptEncrypted` round-trip：先校 magic → 校 schemaVersion → 衍生 key → AES-GCM decrypt；錯誤一律包成 `InvalidPassphraseError`（line 225-230）含「passphrase incorrect or file corrupted」明確訊息
  - **`src/lib/delete.ts`**
    - `:11-16` `PurgeResult { wipedAt: string; tombstoneId: string; wipedScopes: string[] }`
    - `:37-41` `generateTombstoneId(now)` 純函式 → `tomb-<ISO>-<random6>`（不可變測試可預期）
    - `:47-57` `confirmPurgeWithGracePeriod(hours = 24, now)` 計算 `scheduledFor = now + hours*3.6Mms`（負數 throw line 51）
    - `:65-79` `dispatchTombstone(event)` window.dispatchEvent + SSR-safe fallback（無 window 也不 throw）
    - `:88-92` `setDispatchTarget(target)` 測試注入（避免 vitest 依賴 window）
    - `:112-133` `purgeAllData({ resetFn, scopes?, reason? }, now?)` 呼叫 `targets.resetFn()`（line 121） + dispatch tombstone（line 124-130） + 回傳 `{ wipedAt, tombstoneId, wipedScopes }`
    - 預設 scopes（line 118）：`['customers', 'treatments', 'reminders', 'broadcast']`（4 個）
  - **`src/components/Dashboard.tsx`**
    - `:38-41` 三個 FR-009 對應 state：`deviceShared` / `lastPurge` / `exportMsg`
    - `:52-57` 開機讀 `window.localStorage.getItem('device.shared')`（預設顯示警告；只有 `'false'` 才關）
    - `:59-68` 監聽 `PURGE_EVENT_NAME`（`beauty-crm:purge`）事件，收到時更新 `lastPurge` 顯示
    - `:70-101` `handleExport` 流程：prompt passphrase → 至少 8 字元驗證 → `exportEncrypted(payload, passphrase)` → 觸發瀏覽器下載（`URL.createObjectURL` + `<a>.click()`）→ 顯示 `exportMsg` 成功 / 失敗訊息（line 99 用 try/catch 統一處理）
    - `:103-123` `handleImport` 流程：prompt passphrase → `decryptEncrypted` → 還原 customers + treatments + 清空 approved/overrides → 顯示訊息；`InvalidPassphraseError` 獨立路徑顯示「密碼錯誤或檔案已損壞」
    - `:125-144` `handlePurge` **雙重 confirm**（line 126 + 130）才呼叫 `purgeAllData({ resetFn, scopes, reason })` + 設 `lastPurge` + 顯示「✓ 已刪除所有資料（tombstone: ...）」
    - `:181-206` 裝置共用警告橫幅：`role="alert"` + `aria-live="assertive"` + 「⚠ 裝置共用警告」+ 「我已知悉」按鈕（line 197-204，呼叫 `handleDismissDeviceWarning` 寫 `localStorage.setItem('device.shared', 'false')`）
    - `:253-305` 「📦 資料管理」卡片：📤 加密匯出（line 256-258）+ 📥 還原備份 `<input type="file" accept=".beauty-crm.json">`（line 259-282）+ 🗑 刪除所有資料（line 283-289）；`exportMsg` 用 `role="status" aria-live="polite"`（line 293-298）統一顯示；`lastPurge` 顯示 tombstone 文字
- 測試輸出：
  - `npm test -- export delete` → **export 11 + delete 8 = 19 passed (19)** / exit 0
- 涵蓋 AC：
  - AC-010 全部 11 條（passphrase 錯誤 throw / 竄改 throw / schema version 錯誤 throw / magic 錯誤 throw / round-trip / 空資料 / 缺 passphrase throw / 同 data 兩次加密差異 / 純函式隨機性 / 副檔名常數 / Blob 物件型別）
  - DoD-4「刪除/匯出/權限測試」：export 11 + delete 8 涵蓋 happy + error + format + dispatch + grace + SSR safe

### FR-010 / AC-002-UI / AC-004：手機新增服務表單 + 單手 UI

- 狀態：**PASS**
- Commit：`fd5055d`（rpb(v1): FR-010/AC-002-UI/AC-003/AC-004 手機新增服務表單 + 單手 UI）
- 證據：
  - **`src/components/AddTreatmentSheet.tsx`**
    - `:19-24` `SERVICE_PRESETS` 4 大類別 preset：manicure（凝膠美甲 NT$1200 / 90min）、eyelash（美睫嫁接 NT$1500 / 60min）、skincare（臉部保養 NT$2500 / 90min）、hair（剪髮 NT$1500 / 60min）
      - 註：commit 訊息 + audit 表格寫「5 大類別」，但 SPEC `PRD/SPEC.md:49, 99, 108-129` 只列 4 個類別（美甲/美睫/皮膚管理/髮型），`TreatmentCategory` 型別也只 4 個。實作與 SPEC 對齊，「5」屬 commit message 筆誤。`tests/addTreatment.test.tsx:102-106` 也只驗 4 個名稱（美甲/美睫/皮膚管理/髮型）。此為小 nit，不影響功能。
    - `:39-50` `AddTreatmentAction` discriminated union（10 個 action type）
    - `:52-63` `EMPTY_DRAFT` 預設狀態（`designerId: 'designer-local'`、datetime-local 格式 `performedAt`）
    - `:65-106` `addTreatmentReducer` 純函式：
      - `setCustomer` / `setProductIngredients` / `addIngredient` / `removeIngredient` 全部自動清空 `allergyAcknowledged`（強制重新確認）
      - `setCategory` 套 preset 預設（serviceName / price / durationMin）
    - `:108-115` `AddTreatmentSheetProps` 含 `viewportWidth?: number`（SSR / 測試注入用）
    - `:124` `useReducer(addTreatmentReducer, EMPTY_DRAFT)`
    - `:130-137` viewport 監聽（SSR-safe：typeof window check；viewportWidth 已注入時直接 return）
    - `:140-144` 開啟時 focus 客戶欄位（單手 UI：開表單就準備輸入）
    - `:148-153` 計算 `getLayoutMode(viewport)` + `isSingleHandUi(viewport)` + `hasAllergyConflict(selectedCustomer, productIngredients)`
    - `:155-160` `canSubmit` 邏輯：customerId + serviceName + price>0 + durationMin>0 + (無過敏或已 acknowledge)
    - `:162-180` `handleSubmit`：構造 `TreatmentDraft` → `recordTreatment(draft)` → `onSubmit(treatment)` → `reset` 回 EMPTY_DRAFT
    - `:182-212` container 樣式：mobile 為 bottom-sheet（fixed bottom、maxHeight 90vh、boxShadow、borderRadius 16）；desktop 為 centered-modal（fixed top/left 50% + translate、width min(560, 100vw-32)）
    - `:219-240` CTA 按鈕：mobile (`< 480px`) 為 full width + minHeight 52 + fontSize 18 + 紅色；desktop 為一般按鈕
    - `:242-264` modal header：`role="dialog" aria-modal="true" aria-labelledby="add-treatment-title"` + 「×」關閉鈕（line 257-264）
    - `:267-295` 客戶欄位：`<label htmlFor>` + `<input list="ats-customer-list" ref={customerInputRef}>` 帶 datalist（line 289-295）
    - `:297-329` 類別 preset `fieldset` + `aria-pressed` 4 顆按鈕
    - `:331-343` 服務名稱 + `:346-357` 服務日期（datetime-local） + `:359-420` 成分 chip UI（Enter 加入 + 個別 × 移除）
    - `:423-457` **過敏醒目確認**（AC-004）：
      - `role="alert" aria-live="assertive" data-testid="allergy-alert"`
      - 紅色（`background: '#ffe0e0' border: '2px solid #c04030'`）
      - 列衝突成分（line 441-447） + 需勾選「已知風險，繼續」checkbox（line 449-454）才放行
    - `:459-469` 備註 textarea
    - `:472-474` submit 按鈕：disabled + 動態文案（必填未填 / 過敏未勾 / ✓ 儲存）
    - `:486-495` 共用 `fieldStyle`：minHeight 40、boxSizing border-box、width 100%
  - **`src/lib/responsive.ts`**
    - `:17-21` `DEFAULT_BREAKPOINTS = { mobile: 480, tablet: 900, desktop: 900 }`（mobile < 480、tablet < 900、desktop ≥ 900；對齊 SPEC DoD-6）
    - `:31-38` `getLayoutMode(width, bp?)` 純函式
    - `:45-51` `getSheetMaxWidth(mode, viewportWidth)` → `'100%' | 固定 560px`
    - `:56-58` `isSingleHandUi(width, bp?)` 純函式
  - **`src/components/Dashboard.tsx`**（覆寫按鈕 hardcode 替換 = round 1 「給 owner 知道」#2 修復）
    - `:344-365` 「覆寫回訪日」按鈕：
      - 之前 round 1 hardcode `'2026-08-15T00:00:00.000Z'` → round 2 改為 `lastTreatment.performedAt + suggestRecallDays(category) * 86400000` 計算（line 351-354）
      - `overriddenBy` 從 `lastSubmission?.designerId ?? 'designer-local'`（line 357）— 來源是 AddTreatmentSheet 真實提交
      - `overrideReason: '依客戶服務週期推算'`
    - `:230-248` 「＋ 新增服務紀錄」按鈕（minHeight 48、fontSize 16、紅色）
    - `:445-450` `AddTreatmentSheet` 實際掛載：`open={addOpen} onClose={...} onSubmit={handleAddTreatment} customers={customers}`
    - `:153-162` `handleAddTreatment` 提交後 append treatment + 記住 `lastSubmission { performedAt, designerId }` + 關閉 sheet + 顯示成功訊息
  - **`src/lib/customers.ts:100-106`** `hasAllergyConflict`（既有，AddTreatmentSheet:152 呼叫）
  - **`src/lib/treatments.ts:46`** `recordTreatment`（既有，AddTreatmentSheet:177 呼叫）
- 測試輸出：
  - `npm test -- addTreatment responsive` → **addTreatment 14 + responsive 10 = 24 passed (24)** / exit 0
- 涵蓋 AC：
  - AC-002-UI：Dashboard 覆寫按鈕 hardcode 替換（line 351-360 為資料驅動）
  - AC-004：hasAllergyConflict 偵測 + 紅色 alert + 「已知風險，繼續」checkbox（line 423-457 + reducer 強制清空已確認）
  - AC-003 2 秒 perf 測量：依 audit §5 中優先區「留給 round 3」明列，且 §6 Commit 3 註明「AC-003 2 秒 perf 測量留 round 3」；本輪未實測屬預期範圍，非 FAIL
  - DoD-6 mobile 390 / tablet 768 / desktop 1440：`tests/responsive.test.ts` 對 320/390/479/480/768/899/900/1024/1440 全 layout 模式驗證通過

### Round 1 → Round 2 連續性檢查

- Round 1 報告 §5「給 owner 知道」#2（Dashboard 覆寫按鈕 hardcode `2026-08-15T00:00:00.000Z`）：**已修復**（line 351-360 全資料驅動；`grep -nE "2026-08-15" src/` 0 hit）
- Round 1 報告 §5 全部其他 warning（addPhoto 沒限制張數、recheckConsentBeforeSend breaking、Playwright 未跑）：未冒充完成，本輪未新增，狀態與 round 1 一致

## 4. 文件檢查

- `CHANGELOG.md` v0.3.0 round 2 條目存在：**是**（`CHANGELOG.md:3-65`，明確標 round 2 對應 §6 Commit 2/3）
- CHANGELOG 引用的 commit hash 與 git log 對得上：**是**
  - `62b15a1` rpb(v1): FR-009/AC-010 本地加密匯出 + 刪除 + 裝置警告 ✓
  - `fd5055d` rpb(v1): FR-010/AC-002-UI/AC-003/AC-004 手機新增服務表單 + 單手 UI ✓
  - `27c620b` rpb(docs): v0.3.0 changelog + AUDIT Round 2 tracking + §1/§2 表狀態更新 ✓
- `docs/AUDIT_v1.md` §1 FR 表（line 14-23）：FR-009（line 22）與 FR-010（line 23）已翻成 **PASS**，證據列正確
- `docs/AUDIT_v1.md` §2 AC 表（line 31-40）：
  - AC-002（line 32）翻 **PASS**，含「Dashboard `reminders` tab：『覆寫回訪日』按鈕 round 2 改為資料驅動（`Dashboard.tsx:309-322`）」說明
  - AC-004（line 34）翻 **PASS**，含「`src/components/AddTreatmentSheet.tsx:316-348`」submit 前偵測衝突 + 紅色 alert 引用
  - AC-010（line 40）翻 **PASS**，引用檔案與行號與本檔 §3.1 對得上
- `docs/AUDIT_v1.md` §5 高優先區（line 75-91）：Commit 2（line 81-82）+ Commit 3（line 83-85）皆標 [x] 且附 round 2 修法與 commit hash
- `docs/AUDIT_v1.md` §6（line 128-138）：Commit 2 + Commit 3 標 [x] 與實際 commit hash 一致
- 未冒充完成項目：FR-008（line 86）/ AC-003 2 秒 perf（line 106）/ FR-006 / AC-009（line 107）/ DoD-5 / DoD-6 / DoD-7 / DoD-8 / Gate-1/2/3/4/5 / DoD-1/3/10 / FR-002（line 108）皆維持原狀態或明列「留給 round 3」（CHANGELOG.md:53-58 已明列），未在本輪擅自標 PASS

## 5. 整體發現

- blocker：**0**
- warning：
  1. `src/components/AddTreatmentSheet.tsx` SERVICE_PRESETS 實際只有 4 個（manicure/eyelash/skincare/hair），但 commit `fd5055d` 訊息 + `tests/addTreatment.test.tsx:102` 註解都寫「5 顆 preset」「5 大類別」。SPEC `PRD/SPEC.md` 與 `TreatmentCategory` 型別也都只定義 4 個。實作與 SPEC 對齊，「5」屬文件筆誤／過期註解，**功能不影響**。建議下一輪把 commit message 留的「5」改「4」或加 1 個 `'custom'` category。
  2. 既有 round 1 報告 §5 的 3 個 warning（addPhoto 沒限制張數、recheckConsentBeforeSend breaking、Playwright 瀏覽器端實測）未冒充完成，狀態不變。
- 給 owner 知道的事項：
  1. **AC-003 2 秒 perf 測量仍未做**：`tests/integration.test.ts:70-90` 只測 100 客戶批次 < 2s，非頁面渲染時間。audit §5 + §6 Commit 3 註解均明列「留給 round 3」。本輪 FR-010 仍判 PASS（功能完整、mobile-first + 過敏醒目確認 + 4 顆 preset 快捷 + 鍵盤 a11y + RWD 工具 + 24 個 AC 全綠），AC-003 在 §1 表仍維持 PARTIAL（line 33）也是正確的。
  2. **Gate-1/2/4/5 仍 FAIL**：Privacy/Terms/Contact 頁面、RUNBOOK、pilot 同意書、Owner 簽署區 — 全部 owner 動作，audit §5 已歸類為「低優先 + owner 動作」。本輪不冒充完成。
  3. **FR-008（漏斗）與 FR-006/AC-009（VIP reason）留 round 3**：`docs/AUDIT_v1.md` §5 line 86、107 明列，§6 Commit 4 與 Commit 7 為 [ ]。本輪 scope 內未包含。
  4. **AC 編號 CI 標籤（Gate-3 PARTIAL）仍未做**：audit 建議用 `it('AC-XXX: ...')` 系統化命名 + CI grep 驗覆蓋率。雖然 test 內部已用「AC-010:」等前綴（見 `tests/export.test.ts:38`、 `tests/delete.test.ts:25`），但 Gate-3 整體仍是 PARTIAL，留 round 3。

## 6. VERDICT

**PASS**

判定依據：
- 2 個 FR/AC 群（FR-009/AC-010 + FR-010/AC-002-UI/AC-004）全部 PASS
- gate 三項：test exit 0（115/115 pass）/ lint exit 0 / build exit 0
- scope 檢查：PRD/ 0 行變更；v2/v3 違規 0（命中皆 pre-existing 註解或自我聲明）；package.json / lock 0 行變更
- 文件：CHANGELOG v0.3.0 round 2 條目存在、commit hash 與 git log 對得上、AUDIT §1 / §2 表狀態已翻、AUDIT §5 [x] 標記到位、§6 commit 鏈 [x] 與 commit hash 一致
- Round 1 留下的「覆寫按鈕 hardcode 2026-08-15」warning 已修復（grep 0 hit）
- 未冒充完成：FR-008、AC-003 2 秒 perf、FR-006/AC-009、Gate-1/2/3/4/5、DoD-1/3/7/8/10、FR-002 edge case — 全部維持原狀態或明列為「Deferred (out of round 2)」（CHANGELOG.md:53-58），未在本輪擅自標 PASS
