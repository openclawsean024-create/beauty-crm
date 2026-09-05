# Security Notes — beauty-crm v0.2.0

> 本檔記錄 v0.2.0 時的安全狀態。架構重大變動（例如加 DB / API / 第三方登入）後必須更新。

## 威脅模型

- **資料敏感度**：客戶姓名 / 手機 / 療程紀錄 / 過敏 / 同意狀態。屬個資（PII），但 v1 是 **in-memory prototype**，沒落地。
- **攻擊面**：純前端 SPA（Next.js App Router + Turbopack）。沒有對外 API、沒有 DB、沒有第三方整合。
- **信任邊界**：完全信任瀏覽器執行環境。不防 XSS / supply chain / CSRF（這些在沒 backend / 沒寫入 / 沒跨站互動時不適用）。

## ✅ 已落實

| 項目 | 實作位置 | 備註 |
|---|---|---|
| 沒有 hardcoded secrets | 全 repo | `grep -E "(sk-\|AKIA\|ghp_)"` 0 hit |
| 沒有 raw exception 吞噬 | 全 repo | `grep -E "catch.*\{\s*$"` 0 hit |
| 沒有 `console.log` 在 production 路徑 | 全 repo | 全 domain 函式純函式，UI 也無 |
| React 自動 escape | `src/components/Dashboard.tsx` | 全用 `{value}`，無 `dangerouslySetInnerHTML` |
| TypeScript strict | `tsconfig.json` | `strict: true` |
| ESLint | `eslint.config.mjs` | `next/core-web-vitals` + `next/typescript` |
| CI 跑 lint + test + build | `.github/workflows/ci.yml` | 每次 PR 都驗 |
| 行銷同意預設值 | `customers.createCustomer` | 預設 `consent: 'pending'`，需明確 granted 才能推播 |
| 推播前再驗同意 | `broadcast.recheckConsentBeforeSend` | 客戶撤回後即使已被加入清單也不送 |
| 台灣電話格式驗證 | `customers.createCustomer` | `^09\d{8}$` regex |
| 過敏成分衝突偵測 | `customers.hasAllergyConflict` | 大小寫不敏感 |

## ⚠️ v1 限制（架構使然，不在這輪修）

1. **無持久化**：重新整理就清空。不適合真實營運。
2. **無認證 / 授權**：任何人打開網站就看得到所有客戶。**不部署到公開 URL。**
3. **無 audit log 持久化**：撤同意 / 編輯 / 推播只在 console.debug 留 trace，
   關瀏覽器即清空。DoD-8 audit log 已實作（`src/lib/audit.ts`），但僅 in-memory。
4. **無 rate limiting / 濫用防護**：UI 端的 local state 沒有 quota。

## 🔒 v2+ 必須做（架構變動時）

- [ ] 加 DB + 後端 API → 同步加 auth (OAuth / email magic link)
- [ ] audit log 串接 Sentry / OpenTelemetry（目前只在 `console.debug`）
- [ ] 客戶端同意證明留 screenshot 或雙重 opt-in（個資法 §8）
- [ ] PII 欄位加密 at rest（DB 層）
- [ ] API rate limit（建議 60 req/min/user）
- [ ] CORS / CSP header（Next.js middleware）
- [ ] Dependency 漏洞掃描（`npm audit` 已在 install 時跑，目前 9 個，後續 sprint 排程修）
- [ ] 加 SAST / DAST（Strix 或 Semgrep）

## 🧪 跑 Lighthouse a11y 跑分（DoD-7）

`scripts/lighthouse.sh` 與 `lighthouserc.json` 已建立（v0.3.0 round 3）。
真實瀏覽器跑分需在 owner 環境觸發：

```bash
npm run build
npm run start &
sleep 3
bash scripts/lighthouse.sh http://localhost:3000
```

或用 LHCI：

```bash
npx --yes @lhci/cli@latest autorun --config=lighthouserc.json
```

門檻：a11y ≥ 90（與 SPEC §3.1 DoD-7 一致）。

## 套件漏洞現況

`npm install` 後 `npm audit` 報告 **9 vulnerabilities (3 moderate / 5 high / 1 critical)**，主要來自 Next.js / eslint 的 transitive deps。本輪不修（會擴大 scope），v2 sprint 排程：
- 升級 Next.js 16 patch 版
- 升級 eslint-config-next
- 評估 vitest 2.x patch

## 報告問題

發現資安問題請直接聯絡維護者（見 `PRD/SPEC.md` §0 文件資訊表）。
