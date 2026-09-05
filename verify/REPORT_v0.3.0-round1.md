# Round 1 Verification Report (v0.3.0-round1)

> 對象：fix/v0.3.0-round1 分支
> 驗證日期：2026-09-05
> 驗證者：verifier

## 1. 環境與 gate

- Node：v22.23.2（`.nvmrc` 鎖定 Node 20；本機 v22 高於鎖定，仍可運作）
- npm：10.9.8
- `npm ci`：~4.82s real / exit **0**（345 packages）
- `npm test`：72 passed / 0 failed / 72 total / ~0.48s real / exit **0**
  - tiers 9 / customers 8 / analytics 5 / treatments 9 / photos 8 / reminders 12 / integration 3 / broadcast 18
- `npm run lint`：exit **0**（1 warning 在 `eslint.config.mjs` 自身，非 user code）
- `npm run build`：~3.04s real / exit **0**（Next 16.2.10 Turbopack；compiled 912ms + TS 1071ms；3 static pages）

## 2. 範圍檢查

- `git diff main..HEAD -- PRD/` 行數：**0**（SPEC §1-§9 未動 ✓）
- `git diff main..HEAD --stat` 摘要：
  ```
   CHANGELOG.md                 |  64 ++
   docs/AUDIT_v1.md             | 171 ++
   src/components/Dashboard.tsx |  73 ++-
   src/lib/broadcast.ts         |  86 ++-
   src/lib/customers.ts         |  43 ++
   src/lib/photos.ts            | 144 ++
   src/lib/reminders.ts         |  82 ++-
   src/lib/treatments.ts        |  37 ++-
   tests/broadcast.test.ts      |  93 ++-
   tests/photos.test.ts         | 170 ++
   tests/reminders.test.ts      |  99 ++-
   tests/treatments.test.ts     |  14 ++
   12 files changed, 1042 insertions(+), 34 deletions(-)
  ```
  - 全部鎖定在 src/lib / src/components / tests / CHANGELOG / AUDIT 範圍
- v2/v3 違規：**0**
  - grep `localStorage|多店|LINE\s*OA|第三方登入|支付|IndexedDB|Prisma|sharp|jimp` 對所有 src/lib、src/components、tests 唯一命中為 `src/lib/photos.ts:10` 的 design 註解「不引入 heavyweight dependency（無 sharp / jimp / wasm）」，屬自我聲明，無實際引入
- package.json / package-lock.json 變更：**0**（無新 dep）
  - `git diff main..HEAD -- package.json package-lock.json` → 0 lines

## 3. FR/AC 逐項驗證

### FR-007 / AC-005：照片壓縮 + 同意紀錄
- 狀態：**PASS**
- 證據：
  - `src/lib/photos.ts:88` `compressPhoto(file, opts?)` async 函式
  - `src/lib/photos.ts:77` quality 階梯 `[0.92, 0.82, 0.72, 0.62, 0.52]`，於 `:123-129` 迭代 `canvas.toBlob` 直到 `<= targetBytes` 或 quality < minQuality
  - `src/lib/photos.ts:111-117` 環境不可用（無 `createExporter` / `loadImage`）→ `throw new PhotoCompressionError(...)`，訊息含 `'HTMLCanvasElement'` / `'node / jsdom'`（明確、非靜默）
  - `src/lib/photos.ts:141` `originalBlob: wasOverLimit ? file : undefined`（AC-005 保留原檔 reference，不送後端）
  - `src/lib/customers.ts:13-17` `PhotoConsent` 型別；`:30` `Customer.photoConsent?: PhotoConsent`；`:123-139` `setPhotoConsent(c, consent)` 純函數
  - `src/lib/treatments.ts:27` `Treatment.photos: CompressedPhotoRef[]`；`:115-117` `addPhoto(t, photo)` 純函數（spread 新陣列）
  - `tests/photos.test.ts:29-42` mock 5MB Blob → quality 0.92 直接 400KB，斷言 `byteSize < 500 * 1024` + `originalBlob === fiveMB`
  - `tests/photos.test.ts:68-73` 無 `createExporter` / `loadImage` → throw 含 `HTMLCanvasElement` 與 `node / jsdom` 關鍵字
- 測試輸出：`npm test -- photos` → 8 passed (8) / exit 0
- 涵蓋 AC：AC-005 全部 4 個情境（happy / 多次迭代 / fast-path / 無 canvas fallback）
- 不足：—

### FR-005 / AC-007：草稿核准狀態機
- 狀態：**PASS**
- 證據：
  - `src/lib/broadcast.ts:18-33` `BroadcastTarget` 介面含 `status: BroadcastStatus`、`approvedBy?`、`approvedAt?`、`sentAt?`
  - `src/lib/broadcast.ts:35` `type BroadcastStatus = 'draft' | 'approved' | 'sent' | 'cancelled'`（與 audit 建議完全一致）
  - `src/lib/broadcast.ts:151-166` `approve(target, designerId)`：
    - `:152-154` designerId 缺漏 throw
    - `:155-159` status !== 'draft' throw 'cannot approve'
    - `:160-165` 回傳 spread 新物件（不可變，保留 preview / customer / reason）
  - `src/lib/broadcast.ts:175-189` `markSent(target)`：
    - `:179-183` status !== 'approved' throw 'must be in approved'
    - `:184-188` 不可變回傳新物件 + sentAt
  - `src/lib/broadcast.ts:201-212` `recheckConsentBeforeSend` 改為 throw 邏輯（不再回 boolean）：
    - 即使 target.status === 'approved'，若 currentCustomers 中查得 consent !== 'granted' 就 throw
  - `src/components/Dashboard.tsx:189-202` 推播 tab 顯示「✓ 核准草稿」按鈕 → 呼叫 `approve(t, 'designer-local')` → 顯示「✓ 已核准 by ... @ ...」（已實際渲染在 UI）
  - `tests/broadcast.test.ts:140-167` buildBroadcast 預設 draft、approve 後 status=approved + 欄位填入、原 target 不可變
  - `tests/broadcast.test.ts:169-181` non-draft approve throw + 缺 designerId throw
  - `tests/broadcast.test.ts:183-200` markSent 需 approved、approved → sent 不可變
  - `tests/broadcast.test.ts:202-215` approved + revoke consent → recheckConsentBeforeSend throw；approved + granted → not throw
- 測試輸出：`npm test -- broadcast` → 18 passed (18) / exit 0
- 涵蓋 AC：AC-007 全部（未核准不可 send、撤同意後即使 approved 也 recheck throw）
- 不足：—

### FR-003 / FR-004 / AC-002：可調週期 + 手動覆寫
- 狀態：**PASS**
- 證據：
  - `src/lib/treatments.ts:101-109` `suggestRecallDays(category, customRules?)`：
    - `customRules` 為 `Partial<Record<TreatmentCategory, number>>`（設計：不必為一個類別列全部 4 個 key）
    - `:105-107` 有列的 category 用自訂值；`:108` 沒列的 fallback `DEFAULT_RECALL_DAYS[category]`
    - 沒傳 `customRules` 時走 default 路徑 → 向後相容（既有 test `tests/treatments.test.ts:63-68` 仍綠）
  - `src/lib/reminders.ts:8-26` `Reminder` 介面新增 `overrideAt?` / `overriddenBy?` / `overrideReason?` 全部 optional
  - `src/lib/reminders.ts:28-32` `OverrideOptions` 型別
  - `src/lib/reminders.ts:51-64` `setOverride(reminder, opts)` 純函數（缺欄位 throw；不可變 spread）
  - `src/lib/reminders.ts:66-118` `computeReminder` 第 5/6 optional 參數 `customRules` + `override`：
    - `:88` 呼叫 `suggestRecallDays(last.category, customRules)` 把自訂週期納入
    - `:92-98` 邏輯：override 為未來時間才用 `overrideAt` 取代 `baseRecallDate`（過去 override 不影響計算但保留欄位供 audit）
    - `:100-106` 用 `effectiveRecallDate` 重新算 `daysUntilRecall` 與 `status`
  - `src/components/Dashboard.tsx:34` `reminderOverrides` 本機 state；`:98-135` reminders tab：
    - `:103` 若有 override → `setOverride(base, ov)`；否則用 base
    - `:112-115` 顯示「✓ 已覆寫 → ...（by：reason）」
    - `:116-131` 「覆寫回訪日」按鈕
  - `tests/treatments.test.ts:70-82` 自訂 rules 改變單一 category + 與 DEFAULT 混用（2 個 AC）
  - `tests/reminders.test.ts:122-216` `describe 'FR-003/FR-004/AC-002 可調週期 + 手動覆寫'`（6 個 AC）：
    - customRules 影響 suggestedRecallAt
    - customRules 部分覆寫 — 沒列的用 DEFAULT
    - setOverride 設定欄位 + 不可變
    - 未來 override → suggestedRecallAt = overrideAt + daysUntilRecall 重算
    - 過去 override → 用 base + override 欄位仍保留（audit trail）
    - setOverride 必填欄位缺失 throw
- 測試輸出：
  - `npm test -- treatments reminders` → treatments 9 + reminders 12 = 21 passed (21) / exit 0
- 涵蓋 AC：AC-002 全部（自動計算 + 設計師覆寫後 dashboard 顯示覆寫值）
- 不足：—

## 4. 文件檢查

- CHANGELOG.md v0.3.0 條目存在：**是**（`CHANGELOG.md:3-64`，明確標 round 1 對應 §6 Commit 1/5/6）
- CHANGELOG 引用的 commit hash 與 git log 對得上：**是**
  - `f371156` rpb(v1): FR-007/AC-005 照片壓縮 + 同意紀錄 ✓
  - `c8c74d4` rpb(v1): FR-005/AC-007 草稿核准狀態機 ✓
  - `9ee8c1d` rpb(v1): FR-003/FR-004/AC-002 可調週期 + 手動覆寫 ✓
  - `253153e` rpb(docs): v0.3.0 changelog + AUDIT Round 1 tracking ✓
- AUDIT_v1.md §5 高優先區 6 項目的標記狀態：[x] 數 = **6**
  1. FR-007 照片壓縮 5MB→500KB ✓
  2. FR-005 / AC-007 草稿核准狀態機 ✓
  3. AC-005 照片壓縮 5MB→500KB（同 FR-007）✓
  4. FR-003（PARTIAL → PASS）✓
  5. FR-004（PARTIAL → PASS）✓
  6. AC-002（PARTIAL → PASS）✓
  - 其餘 [ ] 項目（FR-009 / FR-010 / FR-008 等）皆屬「Deferred (out of round 1)」（CHANGELOG.md:53-57 已明列），未冒充完成

## 5. 整體發現

- blocker：0
- warning：0（lint 的 1 個 warning 在 `eslint.config.mjs` 自身，main 上已存在，與 round 1 無關）
- 給 owner 知道的事項：
  1. **§1 表格沒更新狀態**：AUDIT_v1.md §1 FR 表（line 14-23）仍將 FR-003 / FR-004 / FR-005 標為 **PARTIAL**、FR-007 / AC-005 / AC-007 標為 **FAIL**。只有 §5 高優先區的 [x] checkbox 已翻。Owner 若要對外文件用，建議把 §1 表的狀態欄同步翻成 PASS。但這不影響 round 1 範圍。
  2. **Dashboard 覆寫按鈕用 hardcoded 2026-08-15 與 'designer-local'**：當 demo 用途 OK，但若要當 production UI，需替成實際 date picker + 真 designerId。
  3. **`addPhoto` 沒限制張數**：`src/lib/treatments.ts:115-117` 直接 spread，可被濫用塞爆。實務上 compressPhoto 500KB 上限已是天然防線，但建議下一輪加 max N photos 與 total bytes cap。
  4. **`recheckConsentBeforeSend` 行為 breaking change**：v0.2.0 回傳 boolean，v0.3.0 改 throw。已同步更新既有 AC-008 test。對外若有人引用此 API 需注意。
  5. **未驗證項目**：本機未跑 Playwright / Lighthouse 對 FR-007 的實際瀏覽器 canvas 行為（測試用 mock exporter）。程式碼邏輯分支正確，但 production browser path 未在 headless 實測。屬「程式邏輯已驗、瀏覽器端實測未跑」。

## 6. VERDICT

**PASS**

判定依據：
- 3 個 FR/AC 群（FR-007/AC-005、FR-005/AC-007、FR-003/FR-004/AC-002）全部 PASS
- gate 三項：test 0 / lint 0 / build 0
- scope 檢查：PRD/ 0 行變更；v2/v3 違規 0；package.json / lock 0 行變更
- 文件：CHANGELOG v0.3.0 條目存在、commit hash 與 git log 對得上、§5 高優先區 6 個 [x] 標記到位
- 未冒充完成：FR-008 / FR-009 / FR-010 / FR-006 / AC-009 等項目仍維持原狀態或明列為「Deferred (out of round 1)」，未在本輪擅自標 PASS
