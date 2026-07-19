'use client';

import { useEffect, useState } from 'react';
import { createCustomer, type Customer } from '@/lib/customers';
import { recordTreatment, type Treatment, suggestRecallDays } from '@/lib/treatments';
import { computeReminder, listOverdue } from '@/lib/reminders';
import { computeRevenueByMonth, topSpenders } from '@/lib/analytics';
import { tierForSpend } from '@/lib/tiers';
import { buildBroadcast, selectByConsent, BUILTIN_TEMPLATES } from '@/lib/broadcast';

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
  const [customers] = useState<Customer[]>(SEED_CUSTOMERS);
  const [treatments] = useState<Treatment[]>(SEED_TREATMENTS);
  const [tab, setTab] = useState<'overview' | 'customers' | 'reminders' | 'analytics' | 'broadcast'>('overview');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);

  if (!hydrated) return <div style={{ padding: 24 }}>載入中…</div>;

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

      <nav style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['overview', 'customers', 'reminders', 'analytics', 'broadcast'] as const).map((k) => (
          <button
            key={k}
            className={tab === k ? 'primary' : ''}
            onClick={() => setTab(k)}
          >
            {({ overview: '總覽', customers: '客戶檔案', reminders: '回訪提醒', analytics: '消費分析', broadcast: '行銷推播' } as Record<typeof k, string>)[k]}
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
          <Card title="商業化分數（來自 PRD v3.0）">
            <p>Sweet spot 7.6 / 10　商業化 83.2 / 100　建議：GO with strict pilot gate</p>
          </Card>
        </section>
      )}

      {tab === 'customers' && (
        <section>
          {customers.map((c) => {
            const myTxs = treatments.filter((t) => t.customerId === c.id);
            const last = myTxs[0];
            return (
              <Card key={c.id} title={`${c.name} (${c.phone})`}>
                <p>同意狀態：<b>{c.consent}</b>　標籤：{c.tags.join(' / ') || '—'}</p>
                <p>最後療程：{last ? `${last.serviceName} @ ${last.performedAt.slice(0, 10)}` : '—'}</p>
                <p>累計消費：NT$ {myTxs.reduce((s, t) => s + t.price, 0).toLocaleString()}</p>
              </Card>
            );
          })}
        </section>
      )}

      {tab === 'reminders' && (
        <section>
          {customers.map((c) => {
            const r = computeReminder(c, treatments);
            const last = treatments.find((t) => t.id === r.lastTreatmentId);
            return (
              <Card key={c.id} title={`${c.name} — ${r.status}`}>
                <p>上次療程：{last ? `${last.serviceName} (${last.category})` : '—'}</p>
                <p>建議回訪：{r.suggestedRecallAt}（{r.daysUntilRecall >= 0 ? `還有 ${r.daysUntilRecall} 天` : `已過 ${-r.daysUntilRecall} 天`}）</p>
                <p>類別預設週期：{last ? suggestRecallDays(last.category) : '—'} 天</p>
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
              return (
                <p key={s.customerId}>
                  {c.name} — NT$ {s.totalSpent.toLocaleString()}（{tier.label}，共 {s.visitCount} 次）
                </p>
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
            {targets.length === 0 ? <p>目前沒有過期待回訪客戶</p> : targets.map((t) => (
              <div key={t.customer.id} style={{ borderTop: '1px dashed #d6c5c1', paddingTop: 8, marginTop: 8 }}>
                <p>→ {t.customer.name} ({t.customer.phone})</p>
                <pre style={{ background: '#fff', padding: 8, fontSize: 13 }}>{t.preview}</pre>
              </div>
            ))}
          </Card>
        </section>
      )}
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