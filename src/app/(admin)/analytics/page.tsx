// v0.4.0 /analytics — 消費分析
// 對齊 DESIGN §5.4

'use client';

import { useAdminData } from '@/components/admin/AdminDataProvider';
import {
  computeRevenueByMonth,
  topSpenders,
} from '@/lib/analytics';
import { tierForSpend, tierReason, nextTier as tierNext } from '@/lib/tiers';
import Card from '@/components/ui/Card';
import ProgressBar from '@/components/ui/ProgressBar';

export default function AnalyticsPage() {
  const data = useAdminData();

  if (!data.hydrated) return <div style={{ padding: 24 }}>載入中…</div>;

  const rev = computeRevenueByMonth(data.treatments);
  const spenders = topSpenders(data.treatments, 3);

  // 簡單回購率：客戶數 ≥ 2 筆療程的比例
  const repurchaseCount = data.customers.filter((c) => {
    const myTxs = data.treatments.filter((t) => t.customerId === c.id);
    return myTxs.length >= 2;
  }).length;
  const repurchase = data.customers.length === 0 ? 0 : repurchaseCount / data.customers.length;

  // 計算每個 tier 的客戶數
  const tierCounts = data.customers.reduce<Record<string, number>>((acc, c) => {
    const myTxs = data.treatments.filter((t) => t.customerId === c.id);
    const totalSpent = myTxs.reduce((s, t) => s + t.price, 0);
    const tier = tierForSpend(totalSpent).tier;
    acc[tier] = (acc[tier] ?? 0) + 1;
    return acc;
  }, {});

  const tierTotal = Object.values(tierCounts).reduce((s, n) => s + n, 0) || 1;
  const tierOrder = ['bronze', 'silver', 'gold', 'platinum', 'vip'] as const;

  // 平均客單價
  const avgTicket =
    data.treatments.length === 0
      ? 0
      : data.treatments.reduce((s, t) => s + t.price, 0) / data.treatments.length;

  return (
    <div>
      <header style={{ marginBottom: 'var(--space-4)' }}>
        <h1 style={{ fontSize: 'var(--text-h1)', color: 'var(--text-primary)', margin: 0 }}>消費分析</h1>
        <p style={{ color: 'var(--text-secondary)' }}>月營收、Top 客戶、Tier 分佈、回購率</p>
      </header>

      {/* 主 metrics row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-4)',
        }}
      >
        <Card variant="stat">
          <div style={{ fontSize: 'var(--text-h2)', color: 'var(--accent-primary)', fontWeight: 700 }}>
            NT$ {rev.reduce((s, r) => s + r.total, 0).toLocaleString()}
          </div>
          <div style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)' }}>累計營收</div>
        </Card>
        <Card variant="stat">
          <div style={{ fontSize: 'var(--text-h2)', color: 'var(--accent-primary)', fontWeight: 700 }}>
            NT$ {Math.round(avgTicket).toLocaleString()}
          </div>
          <div style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)' }}>平均客單價</div>
        </Card>
        <Card variant="stat">
          <div style={{ fontSize: 'var(--text-h2)', color: 'var(--accent-primary)', fontWeight: 700 }}>
            {Math.round(repurchase * 100)}%
          </div>
          <div style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)' }}>回購率</div>
        </Card>
      </div>

      {/* 月營收 table */}
      <Card title="月營收">
        {rev.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>尚無資料</p>
        ) : (
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 'var(--text-body)',
            }}
          >
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                <th style={{ textAlign: 'left', padding: '8px 0', color: 'var(--text-muted)' }}>月份</th>
                <th style={{ textAlign: 'right', padding: '8px 0', color: 'var(--text-muted)' }}>筆數</th>
                <th style={{ textAlign: 'right', padding: '8px 0', color: 'var(--text-muted)' }}>營收</th>
              </tr>
            </thead>
            <tbody>
              {rev.map((r) => (
                <tr key={r.month} style={{ borderTop: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '8px 0', color: 'var(--text-primary)' }}>{r.month}</td>
                  <td style={{ padding: '8px 0', textAlign: 'right', color: 'var(--text-primary)' }}>{r.count}</td>
                  <td style={{ padding: '8px 0', textAlign: 'right', color: 'var(--text-primary)', fontWeight: 600 }}>
                    NT$ {r.total.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Top 3 + Tier 分佈 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 'var(--space-4)',
          marginTop: 'var(--space-4)',
        }}
      >
        <Card title="Top 3 高消費客戶">
          {spenders.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>尚無資料</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {spenders.map((s) => {
                const c = data.customers.find((x) => x.id === s.customerId);
                const tier = tierForSpend(s.totalSpent);
                const next = tierNext(s.totalSpent);
                const reason = tierReason(tier, s.totalSpent, next);
                return (
                  <li
                    key={s.customerId}
                    style={{ padding: '8px 0', borderTop: '1px solid var(--border-light)' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c?.name}</span>
                      <span style={{ color: 'var(--accent-primary)' }}>
                        NT$ {s.totalSpent.toLocaleString()}
                      </span>
                    </div>
                    <div style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)' }}>
                      {tier.label} · {s.visitCount} 次 · {reason}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="Tier 分佈">
          {data.customers.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>尚無客戶</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {tierOrder.map((t) => {
                const count = tierCounts[t] ?? 0;
                return (
                  <div key={t}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: 4,
                        fontSize: 'var(--text-caption)',
                      }}
                    >
                      <span style={{ color: 'var(--text-primary)' }}>{t}</span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {count} 位（{Math.round((count / tierTotal) * 100)}%）
                      </span>
                    </div>
                    <ProgressBar value={count} max={tierTotal} variant="tier" />
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
