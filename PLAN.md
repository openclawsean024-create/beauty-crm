# Plan: beauty-crm — 推進到 production-ready

> 由 Round 1 orchestrator 產出。
> Goal：把 `beauty-crm` 從「能跑」推進到「production-ready」。
> 約束：有限範圍、可驗收、不擴大 scope、不改 §1-§9。

## 為什麼這樣排

目前 codebase 其實相當乾淨（沒 TODO、沒 console.log、沒 leaked secrets、沒 swallowed exceptions、17 source / 7 test 都 pure-function 為主）。所以這輪不走「補一大片功能」路線，而是把 **現有程式碼收斂到 production-grade**：
1. 把 DRY 違規修掉（`selectOverdue` 不該自己寫 28/21/30/45，該用 `suggestRecallDays()`）
2. 把時區處理收斂正確（`toDateOnly` 用 `toISOString().slice(0,10)` 在亞洲時區會 off-by-one）
3. 加 CI、README、CHANGELOG、`.nvmrc`
4. UI a11y 收尾 + ESLint 跑乾淨 + 安全檢查留下文件

每個 milestone 都有一個 owner + 一組可驗收的 verify 指令，預計 5 分鐘內可完成。

---

## Milestone 1 — backend：DRY 重構 + 時區修正 + 回歸測試

- **owner**: backend
- **scope**:
  - `src/lib/broadcast.ts` — `selectOverdue` 移除硬編碼 28/21/30/45，改呼叫 `suggestRecallDays()`
  - `src/lib/reminders.ts` — `toDateOnly` 改用本地時區（避免 UTC 跨日 off-by-one）
  - `tests/broadcast.test.ts` — 新增測試：`selectOverdue` 與 `listOverdue` 對同一組資料結果一致
  - `tests/reminders.test.ts` — 新增測試：`toDateOnly` 對 Asia/Taipei（+08:00）late-UTC 時間不會跨日
- **verify**:
  - `npm test` → exit 0
  - `npm run build` → exit 0
  - 新測試全部 ✅
- **est. LOC**: ~30 行（refactor + tests）
- **commit prefix**: `rpb(backend):`

## Milestone 2 — devops：CI pipeline + Node 版本鎖定

- **owner**: devops
- **scope**:
  - `.github/workflows/ci.yml` — push/PR 觸發，跑 `npm ci` + `npm test` + `npm run build` + `npm run lint`
  - `.nvmrc` — 寫死 `20`（對齊 package.json `engines.node`）
- **verify**:
  - workflow YAML 可被 `python -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"` 解析
  - 不修改既有 source / test 檔
- **est. LOC**: ~30 行
- **commit prefix**: `rpb(devops):`

## Milestone 3 — docs：README + CHANGELOG + 安全備註

- **owner**: docs
- **scope**:
  - `README.md` — 專案說明 / Quick Start / 結構 / 腳本 / SPEC 連結
  - `CHANGELOG.md` — 新增 v0.2.0 條目（記錄本輪所有 rpb:* commit）
  - `SECURITY_NOTES.md` — 簡述：純前端 in-memory，無 secrets、無 external API、無個資落地
- **verify**:
  - 檔案存在
  - README 提到 stack（Next.js / React / TS / vitest）+ scripts
  - CHANGELOG 含本輪 commit 引用
- **est. LOC**: ~120 行（docs）
- **commit prefix**: `rpb(docs):`
- **不做**：不寫 SPEC.md、不動 §1-§9

## Milestone 4 — frontend + qa：UI a11y + ESLint 收尾

- **owner**: frontend（同時做 qa 的 lint 收尾）
- **scope**:
  - `src/components/Dashboard.tsx`:
    - nav `<button>` 加 `type="button"`、active tab 加 `aria-current="page"`
    - 移除 `<div style={{padding:24}}>載入中…` 改用 `<span role="status" aria-live="polite">` 提供 a11y
  - `src/app/globals.css` — 補 `:focus-visible` outline（讓鍵盤操作可見）
  - 跑 `npm run lint`；如有 error 等級問題，**只在當前檔案內修正**（不擴 scope）
- **verify**:
  - `npm run lint` exit 0
  - `npm test` exit 0（無 regress）
  - `npm run build` exit 0
- **est. LOC**: ~20 行
- **commit prefix**: `rpb(frontend):`

---

## Dependencies

- M1 → M4：M1 修了 domain，M4 才能確認 UI 重新計算結果仍正確
- M2 與 M3 互不相依，可與 M1 / M4 並行

## Out of scope (this round)

- ❌ 加 DB / API route / 持久化層（SPEC §3.1 v2 之後才做）
- ❌ 多語系 i18n（SPEC §5）
- ❌ 第三方登入 / 支付整合
- ❌ 部署腳本 / Vercel config（owner 自己處理 deploy，不在這輪）
- ❌ 修改 PRD/SPEC.md §1-§9
- ❌ 引入新 heavyweight dependency（除非 verify 失敗且證明必要）

## Done = 全 ✅

- [ ] M1-M4 全部 verify exit 0
- [ ] `rpb-1-verify.log` ~ `rpb-4-verify.log` 存在
- [ ] `CHANGELOG.md` v0.2.0 條目已寫入
- [ ] `git grep -E "TODO|FIXME|HACK"` 仍無結果
- [ ] `git grep -E "(sk-|AKIA|ghp_)[A-Za-z0-9]{16,}"` 仍無結果
- [ ] Final summary 寫到 `FINAL_SUMMARY.md`
