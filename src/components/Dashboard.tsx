'use client';

import { useEffect, useState } from 'react';
import { createCustomer, type Customer } from '@/lib/customers';
import { recordTreatment, type Treatment, suggestRecallDays } from '@/lib/treatments';
import { computeReminder, listOverdue, setOverride, type Reminder, type OverrideOptions } from '@/lib/reminders';
import { computeRevenueByMonth, topSpenders } from '@/lib/analytics';
import { tierForSpend, tierReason, nextTier as tierNext } from '@/lib/tiers';
import { buildBroadcast, selectByConsent, approve, BUILTIN_TEMPLATES, type BroadcastTarget } from '@/lib/broadcast';
import { exportEncrypted, decryptEncrypted, EXPORT_FILE_EXTENSION, InvalidPassphraseError, type ExportPayload } from '@/lib/export';
import { purgeAllData, PURGE_EVENT_NAME, type PurgeTombstoneEvent } from '@/lib/delete';
import AddTreatmentSheet from '@/components/AddTreatmentSheet';
import { markContacted, markBooked, getFunnelStage, contactLogsFor, apptLogsFor, type ContactLog, type AppointmentLog } from '@/lib/funnel';

const SEED_CUSTOMERS: Customer[] = [
  createCustomer({ id: 'c1', name: '雅婷', phone: '0911111111', consent: 'granted', tags: ['VIP'] }),
  createCustomer({ id: 'c2', name: '小美', phone: '0922222222', consent: 'granted' }),
  createCustomer({ id: 'c3', name: 'Lisa', phone: '0933333333', consent: 'pending' }),
  createCustomer({ id: 'c4', name: 'Amy', phone: '0944444444', consent: 'revoked' }),
];

const SEED_TREATMENTS: Treatment[] = [
  recordTreatment({ id: 't1', customerId: 'c1', category: 'manicure', serviceName: '凝膠美甲', price: 1200, durationMin: 90, performedAt: '2026-05-15T10:00:00Z' }),
  recordTreatment({ id: 't2', customerId: 'c1', category: 'skincare', serviceName: '臉部保養', price: 2500, durationMin: 90, performedAt: '2026-06-20T10:00:00Z' }),
  recordTreatment({ id: 't3', customerId: 'c2', category: 'eyelash', serviceName: '美睫嫁接', price: 1500, durationMin: 60, performedAt: '2026-07-01T10:00:00Z' }),
  recordTreatment({ id: 't4', customerId: 'c3', category: 'hair', serviceName: '染髮', price: 3200, durationMin: 180, performedAt: '2026-06-01T10:00:00Z' }),
];

export default function Dashboard() {
  const [customers, setCustomers] = useState<Customer[]>(SEED_CUSTOMERS);
  const [treatments, setTreatments] = useState<Treatment[]>(SEED_TREATMENTS);
  const [tab, setTab] = useState<'overview' | 'customers' | 'reminders' | 'analytics' | 'broadcast' | 'funnel'>('overview');
  const [hydrated, setHydrated] = useState(false);
  // FR-005 / AC-007：本機追蹤哪些 broadcast target 已 approved
  // （示範用 — 真實情境會由 store / 後端維護）
  const [approvedTargets, setApprovedTargets] = useState<Record<string, BroadcastTarget>>({});
  // FR-004 / AC-002：本機追蹤哪些 reminder 已被設計師手動覆寫
  const [reminderOverrides, setReminderOverrides] = useState<Record<string, OverrideOptions>>({});
  // FR-009 / AC-010：裝置共用警告（localStorage flag，預設顯示）
  const [deviceShared, setDeviceShared] = useState<boolean>(true);
  // FR-009 / AC-010：最近一次 purge tombstone（顯示在 UI）
  const [lastPurge, setLastPurge] = useState<{ wipedAt: string; tombstoneId: string } | null>(null);
  // FR-009 / AC-010：最近一次匯出 / 還原訊息（成功 / 失敗）
  const [exportMsg, setExportMsg] = useState<string>('');
  // FR-010：手機新增表單開關
  const [addOpen, setAddOpen] = useState(false);
  // FR-010：最近一次 AddTreatmentSheet 提交的 performedAt + designerId
  // 給「覆寫回訪日」按鈕取代 Round 1 留下的 hardcode 使用
  const [lastSubmission, setLastSubmission] = useState<{ performedAt: string; designerId: string } | null>(null);
  // FR-008：回流漏斗手動標記紀錄（聯絡 + 預約）
  // 與 reminders 平行存在；不污染 computeReminder 既有路徑
  const [contactLogs, setContactLogs] = useState<ContactLog[]>([]);
  const [apptLogs, setApptLogs] = useState<AppointmentLog[]>([]);

  useEffect(() => setHydrated(true), []);

  // FR-009：讀取裝置共用 flag（localStorage）
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('device.shared');
    if (stored === 'false') setDeviceShared(false);
  }, []);

  // FR-009：監聽 tombstone 事件
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<PurgeTombstoneEvent>).detail;
      setLastPurge({ wipedAt: detail.wipedAt, tombstoneId: detail.tombstoneId });
    };
    window.addEventListener(PURGE_EVENT_NAME, handler);
    return () => window.removeEventListener(PURGE_EVENT_NAME, handler);
  }, []);

  const handleExport = async () => {
    try {
      const passphrase = window.prompt('請輸入匯出密碼（將用於加密這份備份，至少 8 個字元）');
      if (!passphrase) {
        setExportMsg('已取消匯出');
        return;
      }
      if (passphrase.length < 8) {
        setExportMsg('匯出失敗：密碼至少 8 個字元');
        return;
      }
      const payload: ExportPayload = {
        customers,
        treatments,
        exportedAt: new Date().toISOString(),
      };
      const blob = await exportEncrypted(payload, passphrase);
      // 觸發瀏覽器下載
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ts = new Date().toISOString().slice(0, 10);
      a.download = `beauty-crm-${ts}${EXPORT_FILE_EXTENSION}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setExportMsg(`✓ 已匯出 ${customers.length} 客戶 / ${treatments.length} 療程（${a.download}）`);
    } catch (err) {
      setExportMsg(`匯出失敗：${(err as Error).message}`);
    }
  };

  const handleImport = async (file: File) => {
    try {
      const passphrase = window.prompt('請輸入這份備份的密碼');
      if (!passphrase) {
        setExportMsg('已取消還原');
        return;
      }
      const payload = await decryptEncrypted(file, passphrase);
      setCustomers(payload.customers);
      setTreatments(payload.treatments);
      setApprovedTargets({});
      setReminderOverrides({});
      setExportMsg(`✓ 已還原 ${payload.customers.length} 客戶 / ${payload.treatments.length} 療程`);
    } catch (err) {
      if (err instanceof InvalidPassphraseError) {
        setExportMsg('還原失敗：密碼錯誤或檔案已損壞');
      } else {
        setExportMsg(`還原失敗：${(err as Error).message}`);
      }
    }
  };

  const handlePurge = () => {
    const ok = window.confirm(
      '⚠ 即將刪除所有本機資料（客戶、療程、覆寫、核准紀錄）。\n此動作無法復原，請先匯出備份。\n\n確定要繼續嗎？',
    );
    if (!ok) return;
    const ok2 = window.confirm('再次確認：所有資料即將從本機清除，繼續？');
    if (!ok2) return;
    const result = purgeAllData({
      resetFn: () => {
        setCustomers([]);
        setTreatments([]);
        setApprovedTargets({});
        setReminderOverrides({});
      },
      scopes: ['customers', 'treatments', 'reminders', 'broadcast'],
      reason: 'designer manual confirm',
    });
    setLastPurge({ wipedAt: result.wipedAt, tombstoneId: result.tombstoneId });
    setExportMsg(`✓ 已刪除所有資料（tombstone: ${result.tombstoneId.slice(0, 22)}…）`);
  };

  const handleDismissDeviceWarning = () => {
    setDeviceShared(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('device.shared', 'false');
    }
  };

  // FR-010：AddTreatmentSheet 提交後 append 到 treatments，並記住 designerId + 服務日期
  const handleAddTreatment = (treatment: Treatment) => {
    setTreatments((prev) => [treatment, ...prev]);
    setLastSubmission({
      performedAt: treatment.performedAt,
      designerId: treatment.designerId ?? 'designer-local',
    });
    setAddOpen(false);
    setExportMsg(`✓ 已新增服務：${treatment.serviceName}（${treatment.category}，NT$ ${treatment.price}）`);
  };

  // FR-008：設計師手動標記已聯絡
  const handleMarkContacted = (customerId: string, outcome: 'connected' | 'no-answer' | 'left-message' | 'booked' | 'declined') => {
    try {
      const next = markContacted(contactLogs, {
        customerId,
        channel: 'in-person',
        outcome,
        designerId: lastSubmission?.designerId ?? 'designer-local',
      });
      setContactLogs(next);
      const c = customers.find((x) => x.id === customerId);
      setExportMsg(`✓ 已標記 ${c?.name ?? customerId} 為「已聯絡」（${outcome}）`);
    } catch (err) {
      setExportMsg(`標記失敗：${(err as Error).message}`);
    }
  };

  // FR-008：設計師手動標記已預約（排程時間 = 14 天後為預設）
  const handleMarkBooked = (customerId: string) => {
    try {
      const scheduledFor = new Date(Date.now() + 14 * 86_400_000).toISOString();
      const next = markBooked(apptLogs, {
        customerId,
        scheduledFor,
        designerId: lastSubmission?.designerId ?? 'designer-local',
      });
      setApptLogs(next);
      const c = customers.find((x) => x.id === customerId);
      setExportMsg(`✓ 已標記 ${c?.name ?? customerId} 為「已預約」（${scheduledFor.slice(0, 10)}）`);
    } catch (err) {
      setExportMsg(`標記失敗：${(err as Error).message}`);
    }
  };

  if (!hydrated) return <span role="status" aria-live="polite" style={{ padding: 24, display: 'block' }}>載入中…</span>;

  const overdue = listOverdue(customers, treatments, new Date());
  const overdueIds = new Set(overdue.map((o) => o.customerId));
  const overdueCustomers = customers.filter((c) => overdueIds.has(c.id));
  const rev = computeRevenueByMonth(treatments);
  const spenders = topSpenders(treatments, 3);
  const reachable = selectByConsent(customers);
  const targets = buildBroadcast('recall_due', overdueCustomers, treatments);

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, color: '#a04030' }}>Beauty CRM</h1>
        <p style={{ color: '#6b4a45' }}>美業客戶長期管理 — 記得客戶做過什麼、多久該回來、如何在不打擾下追蹤</p>
      </header>

      {/* FR-009 / AC-010：裝置共用警告（localStorage flag 預設顯示） */}
      {deviceShared && (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            background: '#fff4e0',
            border: '1px solid #d6a55a',
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
            color: '#7a4a1a',
          }}
        >
          <b>⚠ 裝置共用警告：</b>此裝置儲存了客戶資料。離開座位前請記得登出 / 上鎖，避免被他人看到個資。
          {' '}
          <button
            type="button"
            onClick={handleDismissDeviceWarning}
            style={{ marginLeft: 8, fontSize: 12 }}
            aria-label="我已知悉，關閉此警告"
          >
            我已知悉
          </button>
        </div>
      )}

      <nav style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['overview', 'customers', 'reminders', 'analytics', 'broadcast', 'funnel'] as const).map((k) => (
          <button
            key={k}
            type="button"
            aria-current={tab === k ? 'page' : undefined}
            className={tab === k ? 'primary' : ''}
            onClick={() => setTab(k)}
          >
            {({ overview: '總覽', customers: '客戶檔案', reminders: '回訪提醒', analytics: '消費分析', broadcast: '行銷推播', funnel: '回流漏斗' } as Record<typeof k, string>)[k]}
          </button>
        ))}
      </nav>

      {tab === 'overview' && (
        <section>
          <Card title="本月重點">
            <Stat label="活躍客戶" value={String(reachable.length)} />
            <Stat label="待回訪客戶" value={String(overdue.length)} />
            <Stat label="本月療程數" value={String(treatments.length)} />
          </Card>
          <Card title="快速操作">
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              style={{
                minHeight: 48,
                fontSize: 16,
                fontWeight: 600,
                background: '#a04030',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 20px',
              }}
            >
              ＋ 新增服務紀錄
            </button>
            <p style={{ fontSize: 12, color: '#6b4a45', marginTop: 8 }}>
              手機單手可達：客戶欄位自動 focus、CTA 放底部、5 大類別快捷鈕、過敏醒目確認
            </p>
          </Card>
          <Card title="商業化分數（來自 PRD v3.0）">
            <p>Sweet spot 7.6 / 10　商業化 83.2 / 100　建議：GO with strict pilot gate</p>
          </Card>
          {/* FR-009 / AC-010：本地加密匯出 + 刪除 + 還原 */}
          <Card title="📦 資料管理（加密匯出 / 刪除）">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" onClick={handleExport}>
                📤 加密匯出
              </button>
              <label
                style={{
                  display: 'inline-block',
                  padding: '6px 12px',
                  border: '1px solid #a04030',
                  borderRadius: 4,
                  background: '#fff',
                  color: '#a04030',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                📥 還原備份
                <input
                  type="file"
                  accept={EXPORT_FILE_EXTENSION}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImport(f);
                    e.target.value = '';
                  }}
                  style={{ display: 'none' }}
                />
              </label>
              <button
                type="button"
                onClick={handlePurge}
                style={{ borderColor: '#a04030', color: '#a04030' }}
              >
                🗑 刪除所有資料
              </button>
            </div>
            {exportMsg && (
              <p
                role="status"
                aria-live="polite"
                style={{ marginTop: 8, fontSize: 13, color: '#3a7a3a' }}
              >
                {exportMsg}
              </p>
            )}
            {lastPurge && (
              <p style={{ marginTop: 8, fontSize: 12, color: '#6b4a45' }}>
                上次刪除 tombstone：<code>{lastPurge.tombstoneId}</code> @ {lastPurge.wipedAt}
              </p>
            )}
          </Card>
        </section>
      )}

      {tab === 'customers' && (
        <section>
          {customers.map((c) => {
            const myTxs = treatments.filter((t) => t.customerId === c.id);
            const last = myTxs[0];
            const totalSpent = myTxs.reduce((s, t) => s + t.price, 0);
            const tier = tierForSpend(totalSpent);
            const next = tierNext(totalSpent);
            const reason = tierReason(tier, totalSpent, next);
            return (
              <Card key={c.id} title={`${c.name} (${c.phone})`}>
                <p>同意狀態：<b>{c.consent}</b>　標籤：{c.tags.join(' / ') || '—'}</p>
                <p>最後療程：{last ? `${last.serviceName} @ ${last.performedAt.slice(0, 10)}` : '—'}</p>
                <p>累計消費：NT$ {totalSpent.toLocaleString()}</p>
                <p style={{ fontSize: 12, color: '#6b4a45' }}>
                  {reason}
                </p>
              </Card>
            );
          })}
        </section>
      )}

      {tab === 'reminders' && (
        <section>
          {customers.map((c) => {
            const base = computeReminder(c, treatments);
            const ov = reminderOverrides[c.id];
            const r: Reminder = ov ? setOverride(base, ov) : base;
            const last = treatments.find((t) => t.id === r.lastTreatmentId);
            return (
              <Card key={c.id} title={`${c.name} — ${r.status}`}>
                <p>上次療程：{last ? `${last.serviceName} (${last.category})` : '—'}</p>
                <p>
                  建議回訪：{r.suggestedRecallAt}（{r.daysUntilRecall >= 0 ? `還有 ${r.daysUntilRecall} 天` : `已過 ${-r.daysUntilRecall} 天`}）
                </p>
                <p>類別預設週期：{last ? suggestRecallDays(last.category) : '—'} 天</p>
                {r.overrideAt ? (
                  <p style={{ fontSize: 12, color: '#3a7a3a' }}>
                    ✓ 已覆寫 → {r.overrideAt}（{r.overriddenBy}：{r.overrideReason ?? '—'}）
                  </p>
                ) : (
                  <button
                    type="button"
                    style={{ marginTop: 4 }}
                    onClick={() => {
                      // FR-010：取代 Round 1 留下的 hardcode。
                      // overrideAt 用「客戶上次療程 + 該類別 recall 天數」計算（資料驅動），
                      // overriddenBy 用最近一次 AddTreatmentSheet 提交的設計師（單機示範 fallback designer-local）。
                      const lastT = treatments.find((t) => t.id === r.lastTreatmentId);
                      const baseDate = lastT ? new Date(lastT.performedAt) : new Date();
                      const recallDays = lastT ? suggestRecallDays(lastT.category) : 28;
                      const overrideDate = new Date(baseDate.getTime() + recallDays * 86_400_000);
                      const next: OverrideOptions = {
                        overrideAt: overrideDate.toISOString(),
                        overriddenBy: lastSubmission?.designerId ?? 'designer-local',
                        overrideReason: '依客戶服務週期推算',
                      };
                      setReminderOverrides((prev) => ({ ...prev, [c.id]: next }));
                    }}
                  >
                    覆寫回訪日
                  </button>
                )}
              </Card>
            );
          })}
        </section>
      )}

      {tab === 'analytics' && (
        <section>
          <Card title="月營收">
            {rev.length === 0 ? <p>—</p> : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th align="left">月份</th><th align="right">筆數</th><th align="right">營收</th></tr></thead>
                <tbody>
                  {rev.map((r) => (
                    <tr key={r.month}><td>{r.month}</td><td align="right">{r.count}</td><td align="right">NT$ {r.total.toLocaleString()}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
          <Card title="Top 3 高消費客戶">
            {spenders.map((s) => {
              const c = customers.find((x) => x.id === s.customerId)!;
              const tier = tierForSpend(s.totalSpent);
              const next = tierNext(s.totalSpent);
              const reason = tierReason(tier, s.totalSpent, next);
              return (
                <div key={s.customerId} style={{ marginBottom: 4 }}>
                  <p>{c.name} — NT$ {s.totalSpent.toLocaleString()}（{tier.label}，共 {s.visitCount} 次）</p>
                  <p style={{ fontSize: 11, color: '#6b4a45', marginLeft: 8 }}>{reason}</p>
                </div>
              );
            })}
          </Card>
        </section>
      )}

      {tab === 'broadcast' && (
        <section>
          <Card title={`預載訊息模板（${Object.keys(BUILTIN_TEMPLATES).length} 種）`}>
            {Object.entries(BUILTIN_TEMPLATES).map(([k, m]) => (
              <div key={k} style={{ marginBottom: 8 }}>
                <b>{k}</b> [{m.channel}]<br />
                <code style={{ fontSize: 12, color: '#6b4a45' }}>{m.body}</code>
              </div>
            ))}
          </Card>
          <Card title={`回訪推播預覽（${targets.length} 位已同意客戶）`}>
            {targets.length === 0 ? <p>目前沒有過期待回訪客戶</p> : targets.map((t) => {
              const approved = approvedTargets[t.customer.id];
              const display = approved ?? t;
              return (
                <div key={t.customer.id} style={{ borderTop: '1px dashed #d6c5c1', paddingTop: 8, marginTop: 8 }}>
                  <p>→ {t.customer.name} ({t.customer.phone}) <span style={{ color: '#a04030', fontSize: 12 }}>[{display.status}]</span></p>
                  <pre style={{ background: '#fff', padding: 8, fontSize: 13 }}>{t.preview}</pre>
                  {approved ? (
                    <p style={{ fontSize: 12, color: '#3a7a3a' }}>
                      ✓ 已核准 by {approved.approvedBy} @ {approved.approvedAt?.slice(0, 16).replace('T', ' ')}
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          const next = approve(t, 'designer-local');
                          setApprovedTargets((prev) => ({ ...prev, [t.customer.id]: next }));
                        } catch (err) {
                          console.error('approve failed', err);
                        }
                      }}
                      style={{ marginTop: 4 }}
                    >
                      ✓ 核准草稿
                    </button>
                  )}
                </div>
              );
            })}
          </Card>
        </section>
      )}

      {tab === 'funnel' && (
        <section>
          <p style={{ color: '#6b4a45', fontSize: 13, marginBottom: 12 }}>
            FR-008 回流漏斗：三階段手動標記（不自動化 — 避免被誤判為自動行銷）
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12,
            }}
          >
            {(['due', 'contacted', 'booked'] as const).map((col) => {
              const colCustomers = customers.filter((c) => {
                const reminder = computeReminder(c, treatments);
                const stage = getFunnelStage(
                  reminder,
                  contactLogsFor(contactLogs, c.id),
                  apptLogsFor(apptLogs, c.id),
                );
                return stage === col;
              });
              const colTitle = {
                due: '① 應回訪',
                contacted: '② 已聯絡',
                booked: '③ 已預約',
              }[col];
              const colHint = {
                due: '尚未聯絡 / 尚未預約',
                contacted: '已打電話 / 傳訊，但還沒約到時間',
                booked: '已安排下次預約',
              }[col];
              return (
                <div
                  key={col}
                  data-testid={`funnel-col-${col}`}
                  style={{
                    background: '#fff',
                    border: '1px solid #f0d8d2',
                    borderRadius: 8,
                    padding: 12,
                  }}
                >
                  <h3 style={{ fontSize: 15, color: '#a04030', marginBottom: 4 }}>{colTitle}（{colCustomers.length}）</h3>
                  <p style={{ fontSize: 11, color: '#6b4a45', marginBottom: 8 }}>{colHint}</p>
                  {colCustomers.length === 0 ? (
                    <p style={{ fontSize: 12, color: '#a0a0a0' }}>— 無客戶 —</p>
                  ) : (
                    colCustomers.map((c) => {
                      const reminder = computeReminder(c, treatments);
                      const lastT = treatments.find((t) => t.id === reminder.lastTreatmentId);
                      return (
                        <div
                          key={c.id}
                          data-testid={`funnel-card-${col}-${c.id}`}
                          style={{
                            borderTop: '1px dashed #d6c5c1',
                            paddingTop: 8,
                            marginTop: 8,
                          }}
                        >
                          <p style={{ fontSize: 14, fontWeight: 600, color: '#3a2a28' }}>{c.name}</p>
                          <p style={{ fontSize: 11, color: '#6b4a45' }}>
                            {lastT ? `${lastT.serviceName} @ ${lastT.performedAt.slice(0, 10)}` : '— 尚無療程 —'}
                          </p>
                          <p style={{ fontSize: 11, color: '#6b4a45' }}>
                            建議回訪：{reminder.suggestedRecallAt}（{reminder.daysUntilRecall >= 0 ? `還有 ${reminder.daysUntilRecall} 天` : `已過 ${-reminder.daysUntilRecall} 天`}）
                          </p>
                          <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                            {col === 'due' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleMarkContacted(c.id, 'connected')}
                                  style={{ fontSize: 12, padding: '4px 8px' }}
                                >
                                  📞 標記已聯絡
                                </button>
                              </>
                            )}
                            {col === 'contacted' && (
                              <button
                                type="button"
                                onClick={() => handleMarkBooked(c.id)}
                                style={{ fontSize: 12, padding: '4px 8px' }}
                              >
                                📅 標記已預約（+14 天）
                              </button>
                            )}
                            {col === 'booked' && (() => {
                              const appt = apptLogsFor(apptLogs, c.id).find(
                                (a) => new Date(a.scheduledFor).getTime() > Date.now(),
                              );
                              return appt ? (
                                <p style={{ fontSize: 11, color: '#3a7a3a' }}>
                                  ✓ {appt.scheduledFor.slice(0, 10)} by {appt.designerId}
                                </p>
                              ) : null;
                            })()}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <AddTreatmentSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAddTreatment}
        customers={customers}
      />
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 8, padding: 16, marginBottom: 12, border: '1px solid #f0d8d2' }}>
      <h3 style={{ fontSize: 16, marginBottom: 8, color: '#a04030' }}>{title}</h3>
      <div>{children}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span style={{ display: 'inline-block', marginRight: 24 }}>
      <b style={{ fontSize: 22, color: '#a04030' }}>{value}</b> <span style={{ color: '#6b4a45' }}>{label}</span>
    </span>
  );
}