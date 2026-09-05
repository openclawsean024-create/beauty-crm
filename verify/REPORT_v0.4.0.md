# v0.4.0 Verification Report

> 對象：`fix/v0.4.0-ui-redesign`（從 `fix/v0.3.0-round3` 開出，coder 完成 7 個 commit）
> 驗證日期：2026-09-05
> 驗證者：verifier
> 對齊規格：`docs/DESIGN_v0.4.0.md`（852 行）+ `docs/AUDIT_v1.md`（v0.3.0 行為 baseline）+ `PRD/SPEC.md` §1-§9（未動）
> 驗證範圍：commit 1（design system）+ commit 2（component library）+ commit 3（AppShell + routing）+ commit 4（localStorage persistence）+ commit 5（landing + pricing）+ commit 6（vercel + README）+ commit 7（changelog）

---

## 1. 環境與 gate

- Node：v22.23.2（`.nvmrc` 鎖定 Node 20；本機 v22 高於鎖定，腳本仍可運作）
- npm：10.9.8
- Working tree：clean（唯一 untracked = `docs/DESIGN_v0.4.0.md` + `verify/` 本檔輸出）
- HEAD：`58472f2`（`rpb(docs): v0.4.0 changelog`）
- 分支鏈（v0.4.0 7 個 commit）：
  ```
  58472f2 rpb(docs): v0.4.0 changelog
  dc4c525 rpb(deploy): vercel.json + README + .gitignore + deploy test
  a8cdeb4 rpb(landing): / landing + /pricing (DESIGN §7)
  3588335 rpb(data): localStorage persistence layer (DESIGN §6)
  7ad9228 rpb(shell): AppShell + 7 admin page routing
  ea552d4 rpb(ui): component library (11 components + Icon, 75 tests)
  979af11 rpb(design): design system + globals.css (7 sections, 60+ tokens)
  0fe8f17 ← 分支基底（v0.3.0-round3 HEAD）
  ```

### Gate 三項 exit code

| 指令 | exit | 結果 |
|---|---|---|
| `npm ci` | **0** | 4s real，345 packages，無新 dep |
| `npm test` | **0** | **256 passed / 0 failed / 30 test files**（was 162，+94：74 component + 14 storage + 6 deploy + 4 pages）|
| `npm run lint` | **0** | 0 errors，1 warning 在 `eslint.config.mjs` 自身（pre-existing on main，非 user code）|
| `npm run build` | **0** | Next 16.2.10 Turbopack，13 routes（`/`、`/pricing`、`/dashboard`、`/customers`、`/reminders`、`/analytics`、`/broadcast`、`/funnel`、`/settings`、`/privacy`、`/terms`、`/contact` + auto `_not-found`）|

> CHANGELOG 文字說 11 個路由；實測 13 個（含 `/contact` + `/_not-found`）。不影響功能。
> CHANGELOG 說「75 component」；實測 74（Input 10 + Button 10 + Badge 8 + Avatar 5 + ProgressBar 8 + Icon 5 + Card 5 + Sheet 5 + Modal 5 + Skeleton 6 + Toast 3 + EmptyState 4 = 74）。總計 256 仍正確（162 + 74 + 14 + 6 = 256），僅 CHANGELOG 文案 off-by-1。

---

## 2. 範圍檢查

### 2.1 vs main

- `git diff main..HEAD -- PRD/`：**0 行**（SPEC §1-§9 未動 ✓）
- `git diff main..HEAD -- package.json package-lock.json`：**0 行**（無新 dep ✓）
- `git diff main..HEAD --stat`：87 檔，+9831 / -262（v0.3.0 累積 + v0.4.0 增量）
- `git diff fix/v0.3.0-round3..HEAD --stat -- src/lib/`：**1 檔 / +73 行 / 0 deletions**（只新增 `storage.ts`，既有 11 個 lib 檔零修改）
- `git diff fix/v0.3.0-round3..HEAD --stat`：30 個新檔 + 14 個改檔，+5004 / -220（純 v0.4.0 增量）

### 2.2 v2/v3 違規掃描

對 `IndexedDB|sharp|jimp|Prisma|LINE\s*OA|第三方登入|支付|多店|密碼保護` 在 v0.4.0 新檔命中掃描：

| pattern | 命中 | 性質 | 違規？ |
|---|---|---|---|
| IndexedDB | `src/app/privacy/page.tsx` 1 處 + `src/lib/storage.ts` 1 處 | 「不寫入 IndexedDB」自我聲明 + 「v2 migration 給 IndexedDB 時」備註 | 否（負面聲明 + v2 roadmap） |
| Prisma | `src/lib/customers.ts` 1 處 | 「對齊 Prisma schema」參考註解（main 既有，非 v0.4.0 新增）| 否 |
| 多店 | `src/app/page.tsx` 2 處 + `src/app/pricing/page.tsx` 1 處 | pricing 文字描述「品牌」tier 含「多店」feature | 否（pricing 描述文字，非實作） |
| sharp / jimp / LINE OA / 支付 / 密碼保護 / 第三方登入 | 0 | — | 否 |

**結論：0 實作命中 v2/v3 範圍。**

---

## 3. 7 個 commit 逐項驗證

### Commit 1：`979af11` design system → **PASS**

- `src/app/globals.css` 第 13-148 行 `:root` 區塊，7 個 section 標記齊全：
  - §1.1 Background / Text / Accent / Border / Status / Sidebar / Gradient
  - §1.2 Typography（font stack + 9 級 type scale）
  - §1.3 Spacing（8 級 4–64px）
  - §1.4 Border Radius（5 級）
  - §1.5 Shadow（4 級）
  - §1.6 Z-index（7 級）
  - §1.7 Motion（3 duration + 1 ease）
  - §2.1 Breakpoints（sm 480 / md 768 / lg 1024 / xl 1440）
- Token 數：35 color + 27 typography + 8 spacing + 5 radius + 4 shadow + 7 z-index + 4 motion + 4 breakpoint + 2 legacy = **~96 tokens**（spec 說 60+，實作超出）
- 所有 hex 對齊 spec：`--accent-primary: #B85A45`、`--bg-primary: #FDF5F0`、`--text-primary: #2A1A1A`、status 4 色等全對
- `--accent-primary-legacy: #a04030` 與 `--bg-primary-legacy: #fff7f5` 保留 ✓
- `src/app/layout.tsx` 第 6-11 行用 `next/font/google` 載入 `Noto_Sans_TC`，weight 400/500/600/700，自動 self-host，無新 dep ✓

### Commit 2：`ea552d4` component library → **PASS**

- `src/components/ui/` 12 個元件檔（spec 說 11+）：`Card / Button / Input / Textarea / Select / Badge / Avatar / Modal / Sheet / Toast / ProgressBar / EmptyState / Skeleton / Icon`（Input.tsx 同檔 export 三件）
- `src/components/ui/index.ts` barrel 對齊
- `tests/components/` 12 個對應 test 檔，74 個 AC 全綠
- `src/components/ui/Icon.tsx` 14 個 inline SVG（`LayoutDashboard / Users / BellRing / TrendingUp / Send / Filter / Settings / Home / Bell / ShieldCheck / MessageSquare / Plus / Check / X`），viewBox 24×24，stroke currentColor，路徑取自 Lucide MIT，標註出處
- `package.json` / `package-lock.json` **無 `lucide-react`**（`grep -i lucide package.json package-lock.json` 0 hit）✓
- ARIA：測試驗證 `aria-label` / `aria-current` / `aria-pressed` / `aria-busy` / `aria-invalid` 都存在

### Commit 3：`7ad9228` AppShell + routing → **PASS**

- 7 個 admin page：`/dashboard /customers /reminders /analytics /broadcast /funnel /settings`，全部在 `src/app/(admin)/` route group
- `src/app/(admin)/layout.tsx` route group layout 包 `AppShell` + `AdminDataProvider`
- `src/components/AppShell.tsx` 接受 `children` + `userName` + `userRole` + `dueCount` + `birthdayCount`，內含 `useResponsive`（width < 768 → mobile、< 1024 → tablet、≥ 1024 → desktop）
- `src/components/Sidebar.tsx` desktop 240px 固定側欄，7 nav item（dashboard / customers / reminders / analytics / broadcast / funnel / settings），用 `usePathname()` 高亮 active
- `src/components/MobileBottomNav.tsx` mobile 5 tab（dashboard / customers / reminders / broadcast / settings），對齊 spec §4.2
- `src/components/MobileDrawer.tsx` 漢堡從左滑入 240px 全高
- `src/components/Header.tsx` 含 greeting + 通知 + avatar + 漢堡
- `src/components/admin/AdminDataProvider.tsx` Context，集中 8 個 state + 9 個 setter + reset
- `src/components/admin/useAdminHandlers.ts` 6 個 handler（export / import / purge / markContacted / markBooked / override）
- 既有 v0.3.0 行為移植：customers 頁含 tierReason + 搜尋 + 排序；reminders 頁含 filter（全部 / overdue / due-soon / upcoming）+ 覆寫按鈕 + 標記已聯絡 / 已預約；broadcast 頁含草稿預覽 + 人工核准；funnel 頁 3 欄 grid
- v0.3.0 `src/components/Dashboard.tsx` 已刪除（不再有 useState tab 切換；改 Next.js App Router）

### Commit 4：`3588335` localStorage persistence → **PASS**

- `src/lib/storage.ts` 73 行，5 個函數 + 常數 + 型別：
  - `isClient()` — SSR safe 檢查
  - `load<T>(key, fallback)` — 缺值 / JSON 損壞 silent fallback
  - `save<T>(key, value)` — quota exceeded silent fail
  - `clear(key)` / `clearAll()` — 移除單 / 多 key
  - `StorageKeys` 7 個常數（customers / treatments / contactLogs / apptLogs / approvedTargets / reminderOverrides / device.shared）
  - `PREFIX = 'beauty-crm:v1:'`（v2 schema break 改 prefix 自動清空）
- `AdminDataProvider`：1 個 mount useEffect（load 7 個 key） + **7 個 save useEffect**（每個 state dep + hydrated guard）— 符合 spec「7 對 useEffect」
- `reset()` 第 140 行整合 `clearAll()` ✓
- `tests/storage.test.ts` 14 個 AC，涵蓋：缺值 / 損壞 JSON / quota / SSR / PREFIX / 7 key 常數齊全 / `setItem` 拋例外 silent fail

### Commit 5：`a8cdeb4` landing + pricing → **PASS**

- `src/app/page.tsx` landing：hero「記得客戶做過什麼 / 多久該回來 / 不打擾追蹤」、2 CTA（免費試用 50 位客戶 / 查看方案）、3 feature card（療程回流 / 過敏 / 草稿）、4 tier 簡介、footer（Privacy / Terms / Contact）
- `src/app/pricing/page.tsx` 4 個 pricing card：
  - **免費**：NT$ 0 — 50 位客戶 / 30 次服務 / 回訪清單 / 加密匯出 / 「免費開始」CTA
  - **設計師** ⭐：NT$ 299 — 300 位客戶 / 草稿與報表 / VIP 分級 / 多裝置同步（測試版） / 「開始 14 天試用」CTA（popular）
  - **工作室**：NT$ 799 — 5 位成員 / 5,000 位客戶 / LINE adapter beta / cohort 報表 / 「聯絡銷售」CTA
  - **品牌**：NT$ 2,499 — 訪談後開放 / 多店 / API / SSO / 專屬顧問 / 「預約 demo」CTA
- 5 題 FAQ：免費版可用 / 隨時升級 / 資料安全 / 匯出備份 / 設計師 vs 工作室
- 風格：landing 用 `--text-display` 32px hero、pricing card 用 `--shadow-md` hover lift

### Commit 6：`dc4c525` vercel + README → **PASS**

- `vercel.json` valid JSON（`python3 -c "import json; json.load(open('vercel.json'))"` pass），4 個欄位：`$schema / framework: nextjs / buildCommand: npm run build / outputDirectory: .next`
- `README.md`「Deploy to Vercel」段（line 49-62）含 7 步驟：登入 → Import → Root Directory → Framework Preset → Deploy → Env（不需） → Custom domain
- `.gitignore` 確認 `.next/` + `node_modules/` 都有
- `tests/deploy.test.ts` 6 個 AC（vercel.json 結構 / README 必要段 / .gitignore 必要項）

### Commit 7：`58472f2` docs → **PASS**

- `CHANGELOG.md` 第 3-100 行 v0.4.0 條目：對應 7 個 commit hash（`979af11` ~ `dc4c525`）+ files 統計 + verified 結果 + deferred 項目
- 註：CHANGELOG 文字有兩處 minor inaccuracy（`11 個路由` 應為 13、`75 component` 應為 74），但 commit hash 對應正確、實作正確

---

## 4. v0.3.0 行為保留

| 行為 | 對齊 spec | 證據 | 結果 |
|---|---|---|---|
| 客戶頁 `tierReason` 顯示觸發原因 | AUDIT §1 FR-006 / §2 AC-009 | `src/app/(admin)/customers/page.tsx:125` 呼叫 `tierReason(tier, totalSpent, next)` 並顯示 | ✓ |
| 客戶頁 編輯按鈕（覆寫觸發） | AC-009 | `src/app/(admin)/customers/page.tsx:142-144` 編輯 Button | ✓ |
| 回訪 `listOverdue` 排序 | AC-006 | `src/lib/reminders.ts:73-76`（`listOverdue` 排序 `a.daysUntilRecall - b.daysUntilRecall`）未動 | ✓ |
| 回訪 `setOverride` setter | AC-002 | `src/lib/reminders.ts:51-64` 未動；`src/app/(admin)/reminders/page.tsx:9,49-50,139-142` 沿用 | ✓ |
| 推播 `approve` throw | AC-007 | `src/lib/broadcast.ts:152-167` `approve(target, designerId)` non-draft throw | ✓ |
| 推播 `markSent` throw | AC-007 | `src/lib/broadcast.ts:184-199` `markSent` non-approved throw | ✓ |
| 推播 `recheckConsentBeforeSend` throw | AC-008 | `src/lib/broadcast.ts:217-240` revoke consent throw | ✓ |
| 漏斗 `markContacted` 純函數 | FR-008 | `src/lib/funnel.ts:50-82`（不可變 + 自動去重 + 必填 throw）未動 | ✓ |
| 漏斗 `markBooked` 純函數 | FR-008 | `src/lib/funnel.ts:84-110`（不可變 + 未來時間 throw）未動 | ✓ |
| 客戶 `photoConsent` 欄位 | FR-007 | `src/lib/customers.ts:29` `photoConsent?: PhotoConsent` 從 v0.3.0 保留 | ✓ |
| `Treatment.photos` 欄位 | FR-007 | `src/lib/treatments.ts:27,72,135-139` 從 v0.3.0 保留 | ✓ |
| `exportEncrypted` / `decryptEncrypted` | FR-009 / AC-010 | `src/lib/export.ts:172,188` 從 v0.3.0 保留 | ✓ |
| `purgeAllData` | FR-009 / AC-010 | `src/lib/delete.ts:114` 從 v0.3.0 保留；`AdminDataProvider.reset()` 串接 `clearAll()` | ✓ |

**結論：13 項 v0.3.0 行為 100% 保留。**

---

## 5. 視覺驗證

啟動 production server（`nohup npm start`，先 kill 占用 port 3000 的舊 next-server）：

```
▲ Next.js 16.2.10
- Local:    http://localhost:3000
✓ Ready in 91ms
```

12 個 user route 全部回傳 HTTP 200：

| Route | HTTP | 內容驗證 |
|---|---|---|
| `/` | 200 | 含「記得客戶」「免費試用」「查看方案」+ 3 個 feature card（療程回流提醒 / 過敏 / 草稿）|
| `/pricing` | 200 | 4 個 tier 全到（NT$ 0 / 299 / 799 / 2,499）+ 5 題 FAQ |
| `/dashboard` | 200 | 「早安」「待回訪」「首頁」+ 7 個 sidebar nav item（`data-testid="sidebar-link-{route}"` 7 個）|
| `/customers` | 200 | — |
| `/reminders` | 200 | — |
| `/analytics` | 200 | — |
| `/broadcast` | 200 | — |
| `/funnel` | 200 | — |
| `/settings` | 200 | — |
| `/privacy` | 200 | — |
| `/terms` | 200 | — |
| `/contact` | 200 | — |

> 註：截圖未做（無 browser tool），但 HTML 內容 grep 驗證所有 spec 必要字串、data-testid、CTA 文案、price 都正確 render。Server 已 kill。

---

## 6. 整體發現

### PASS
1. **gate 三項全綠**：test 256/256、lint 0 error、build 0 error
2. **7 個 commit 與 spec 對應**：每個 commit 的 file list 與 spec 對應段落一致
3. **scope 紀律**：0 行 PRD 變更、0 行 package.json/lock 變更、0 個新 dep（含 lucide-react 拒裝）
4. **v2/v3 0 實作命中**：IndexedDB / sharp / jimp / Prisma / LINE OA / 支付 / 密碼保護 / 多店 / 第三方登入 全部 0 命中
5. **v0.3.0 行為 100% 保留**：13 項關鍵行為（tierReason、override、approve/markSent/recheckConsent、markContacted/markBooked、photoConsent、Treatment.photos、exportEncrypted/decryptEncrypted/purgeAllData）全部 source code 可定位
6. **localStorage persistence 完整**：5 個函數 + 7 個 StorageKey + SSR safe + quota fail silent + PREFIX version 機制 + AdminDataProvider 7 對 useEffect 串接正確
7. **AppShell 響應式**：≥1024 sidebar、<768 bottom nav、768-1023 hamburger + drawer，全部 12 條 route 都通
8. **landing + pricing 內容對齊 SPEC §9.1**：4 個 tier 價格 / 包含 / CTA / popular ⭐ 全部正確
9. **Vercel deploy 設定**：vercel.json valid + README 7 步驟 + 6 個 deploy AC 全綠
10. **視覺驗證**：production server 起來、12 條 route 200、HTML grep 對齊 spec

### MINOR（不影響 verdict）
1. **CHANGELOG 文字 off-by-1**：「11 個路由」實為 13（含 `/contact` + `/_not-found`）；「75 component」實為 74。總計 256 仍正確，僅文案細節
2. **CHANGELOG「+94」拆分寫法略含糊**：實際是 +74 component + 14 storage + 6 deploy = +94，CHANGELOG 寫成「75 component + 14 storage + 6 deploy」加總 95，與「扣 1 pages test」自相矛盾
3. **lint warning 1 個**在 `eslint.config.mjs` 第 12 行（pre-existing on main，非 v0.4.0 引入）

### 未觀察到
- 截圖：無 browser tool 可用，僅 HTML grep 驗證文字內容
- 鍵盤 / 螢幕閱讀器 / Lighthouse a11y ≥ 90：未跑（commit 6 / v0.3.0 round 3 已建立 `scripts/lighthouse.sh` + `lighthouserc.json`，但 v0.4.0 未重新跑分）
- 真實瀏覽器 P95 < 2s：未做 Playwright 跑分

---

## 7. VERDICT: **PASS**

依 `docs/DESIGN_v0.4.0.md` 規格實作 v0.4.0 UI redesign：
- 7 個 commit 全部對齊交付
- gate 三項全綠（test 256/256、lint 0 error、build 0 error）
- scope 0 creep（PRD / package.json / lockfile 零修改）
- v0.3.0 13 項關鍵行為 100% 保留
- localStorage / AppShell / landing / pricing / vercel 全部對齊
- 12 條 route HTTP 200 視覺驗證通過

CHANGELOG 文案 off-by-1 為 minor 文件精度問題，不影響 release 決策。
