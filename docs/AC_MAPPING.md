# Beauty CRM v0.3.0 — AC ↔ Test 對照表

> 對齊 `PRD/SPEC.md` §6.1 DoD-1（§1-§13、§15 皆可對應 issue 與驗收案例）。
> 每個 AC 編號對應到 vitest 內的具體測試檔與行號。
> 用 `npm test -- {keyword}` 可針對特定 AC 群驗證。

| AC 編號 | 描述 | 對應 test 檔 | 行號 | 備註 |
|---|---|---|---|---|
| **AC-001** | 新增客戶可記錄偏好、禁忌、同意 | `tests/customers.test.ts` | 12-19, 62-73, 75-81 | 含建檔 / 過敏 / toggleConsent |
| **AC-002** | 自動計算下次日期 + 手動覆寫 | `tests/reminders.test.ts` | 20-35, 122-216, 148-216 | + Dashboard 覆寫按鈕（commit `fd5055d` 改資料驅動） |
| **AC-003** | 客戶頁 2 秒內看到上次服務摘要 | `tests/perf.test.ts`（new） | 1-50 | in-memory data 預期 < 100ms；真實 browser 需 Playwright |
| **AC-004** | 過敏 / 禁忌醒目確認 | `tests/addTreatment.test.tsx` | 102-120 | + `hasAllergyConflict` util（`tests/customers.test.ts:62-73`） |
| **AC-005** | 5MB 照片壓縮到 500KB | `tests/photos.test.ts` | 29-42, 68-73 | mock canvas exporter，瀏覽器實測需 Playwright |
| **AC-006** | 回訪清單依逾期天數排序 | `tests/reminders.test.ts` | 54-70 | listOverdue sort assertion |
| **AC-007** | LINE 草稿必須先由設計師核准 | `tests/broadcast.test.ts` | 140-167, 169-181, 183-200, 202-215 | approve / markSent / recheckConsentBeforeSend |
| **AC-008** | 撤回同意後不出現在 campaign | `tests/broadcast.test.ts` | 33-42, 84-103 | + integration:49-52 |
| **AC-009** | VIP 規則顯示觸發原因 | `tests/tiers.test.ts` | 55-100 | tierReason util 5 個 AC |
| **AC-010** | 匯出 / 刪除可由店主獨立完成 | `tests/export.test.ts` + `tests/delete.test.ts` | export:1-133, delete:1-99 | 11 + 8 = 19 個 AC |

---

## FR ↔ Test 對照表

| FR 編號 | 描述 | 對應 test 檔 |
|---|---|---|
| **FR-001** | 客戶檔案 | `tests/customers.test.ts`（8 AC） |
| **FR-002** | 療程紀錄（含 designerId） | `tests/treatments.test.ts`（9 AC） |
| **FR-003** | 可調週期 | `tests/treatments.test.ts:70-82` + `tests/reminders.test.ts:122-146` |
| **FR-004** | 下次回訪 + 手動覆寫 | `tests/reminders.test.ts:148-216` |
| **FR-005** | 設計師手動核准草稿 | `tests/broadcast.test.ts:140-200` |
| **FR-006** | VIP 依消費可解釋計算 | `tests/tiers.test.ts`（9 + 5 = 14 AC） |
| **FR-007** | 照片壓縮 + 同意紀錄 | `tests/photos.test.ts`（8 AC） |
| **FR-008** | 回流漏斗手動標記 | `tests/funnel.test.ts`（19 AC） |
| **FR-009** | 本地加密匯出 / 刪除 / 裝置警告 | `tests/export.test.ts` + `tests/delete.test.ts`（11 + 8 = 19 AC） |
| **FR-010** | 手機單手快速新增 | `tests/addTreatment.test.tsx` + `tests/responsive.test.ts`（14 + 10 = 24 AC） |

---

## DoD ↔ 證據

| DoD 編號 | 描述 | 證據 |
|---|---|---|
| DoD-1 | §1-§13、§15 可對應 issue 與驗收案例 | 本檔（AC_MAPPING.md）+ AUDIT_v1.md |
| DoD-2 | P0 都有 unit + error + 1 E2E happy path | `tests/integration.test.ts`（3 條 E2E）+ 各 domain 單元測試 |
| DoD-3 | 5 位 pilot 訪談 | 0 — owner 啟動（§11 SOP） |
| DoD-4 | 敏感資料 刪除 / 匯出 / 權限測試 | `tests/export.test.ts` + `tests/delete.test.ts` |
| DoD-5 | provider failure 降級 | `docs/RUNBOOK.md §3` + 各 error throw 路徑 |
| DoD-6 | Mobile 390 / tablet 768 / desktop 1440 | `tests/responsive.test.ts`（10 AC 涵蓋 320/390/479/480/768/899/900/1024/1440） |
| DoD-7 | Lighthouse a11y ≥90 | `scripts/lighthouse.sh` + `lighthouserc.json`（documented）— 真實跑分需 owner 環境 |
| DoD-8 | 成本 / 事件 / 版本 / 決策 可追查 | `src/lib/audit.ts` + `Customer.version` + `Treatment.version` |
| DoD-9 | 不以 mock 冒充真實市場或模型品質 | `README.md` + `PRD/SPEC.md:8` |
| DoD-10 | sweet=2/3 時 §11 go/no-go | sweet=7.6，條件未觸發，N/A |

---

## 上線閘門 ↔ 證據

| 閘門編號 | 描述 | 證據 |
|---|---|---|
| Gate-1 | Privacy / Terms / Contact 頁面 | `src/app/privacy/page.tsx` + `src/app/terms/page.tsx` + `src/app/contact/page.tsx` |
| Gate-2 | 監控告警 + rollback runbook | `docs/RUNBOOK.md`（匯出 / 刪除 / provider / CI 紅燈 / audit 查詢） |
| Gate-3 | 10 條 AC 在 CI 全綠 | `.github/workflows/ci.yml` 跑 `npm test`（151 passed）+ `npm run build` + `npm run lint` |
| Gate-4 | 5 位 pilot 同意 | 0 — owner 啟動 |
| Gate-5 | Owner 簽署 | `docs/AUDIT_v1.md §9`（佔位）— owner 簽署 |

---

## 測試統計（v0.3.0 round 3）

```
Test Files  15 passed (15)
     Tests  170 passed (170)
```

包含：
- `tests/funnel.test.ts`（19）
- `tests/audit.test.ts`（12）
- `tests/photos.test.ts`（8）
- `tests/export.test.ts`（11）
- `tests/delete.test.ts`（8）
- `tests/addTreatment.test.tsx`（14）
- `tests/responsive.test.ts`（10）
- `tests/customers.test.ts`（10，原 8 + version 2）
- `tests/treatments.test.ts`（9）
- `tests/reminders.test.ts`（12）
- `tests/broadcast.test.ts`（18）
- `tests/analytics.test.ts`（5）
- `tests/tiers.test.ts`（14，原 9 + tierReason 5）
- `tests/integration.test.ts`（3）
- `tests/perf.test.ts`（5，AC-003 2s perf 測量）

---

對應 PRD/SPEC.md §6.1 DoD-1；本檔由 owner 維護，code review 時請同步更新。
