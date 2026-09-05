// v0.4.0 /customers — 客戶檔案列表
// 對齊 DESIGN §5.2

'use client';

import { useState, useMemo } from 'react';
import { useAdminData } from '@/components/admin/AdminDataProvider';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import EmptyState from '@/components/ui/EmptyState';
import Icon from '@/components/ui/Icon';
import Input from '@/components/ui/Input';
import { Select } from '@/components/ui/Input';
import { tierForSpend, tierReason, nextTier as tierNext } from '@/lib/tiers';

const CONSENT_LABELS = {
  granted: '已同意',
  pending: '待同意',
  revoked: '已撤回',
} as const;

const CONSENT_VARIANTS = {
  granted: 'success' as const,
  pending: 'warning' as const,
  revoked: 'danger' as const,
};

export default function CustomersPage() {
  const data = useAdminData();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'spent' | 'lastVisit'>('spent');

  const enriched = useMemo(() => {
    return data.customers
      .map((c) => {
        const myTxs = data.treatments.filter((t) => t.customerId === c.id);
        const last = myTxs[0];
        const totalSpent = myTxs.reduce((s, t) => s + t.price, 0);
        return { customer: c, myTxs, last, totalSpent };
      })
      .filter((row) => {
        if (!search.trim()) return true;
        const q = search.trim().toLowerCase();
        return (
          row.customer.name.toLowerCase().includes(q) ||
          row.customer.phone.includes(q) ||
          row.customer.tags.some((t) => t.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.customer.name.localeCompare(b.customer.name, 'zh');
        if (sortBy === 'lastVisit') {
          const aT = a.last?.performedAt ?? '';
          const bT = b.last?.performedAt ?? '';
          return bT.localeCompare(aT);
        }
        return b.totalSpent - a.totalSpent;
      });
  }, [data.customers, data.treatments, search, sortBy]);

  if (!data.hydrated) return <div style={{ padding: 24 }}>載入中…</div>;

  const grantedCount = data.customers.filter((c) => c.consent === 'granted').length;

  return (
    <div>
      <header
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          marginBottom: 'var(--space-4)',
        }}
      >
        <h1 style={{ fontSize: 'var(--text-h1)', color: 'var(--text-primary)', margin: 0 }}>客戶檔案</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          共 {data.customers.length} 位 · {grantedCount} 位已同意
        </p>
      </header>

      {data.customers.length === 0 ? (
        <EmptyState
          icon={<Icon name="Users" size={48} strokeWidth={1.5} />}
          title="尚無客戶"
          description="新增第一位客戶開始建立你的 CRM"
        />
      ) : (
        <>
          {/* Search + Sort */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: 'var(--space-3)',
              marginBottom: 'var(--space-4)',
            }}
          >
            <Input
              id="customer-search"
              placeholder="搜尋姓名 / 電話 / 標籤…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              fullWidth
              aria-label="搜尋客戶"
            />
            <Select
              id="customer-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              options={[
                { value: 'spent', label: '依消費金額' },
                { value: 'lastVisit', label: '依最近療程' },
                { value: 'name', label: '依姓名' },
              ]}
            />
          </div>

          {/* List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {enriched.map(({ customer: c, myTxs, last, totalSpent }) => {
              const tier = tierForSpend(totalSpent);
              const next = tierNext(totalSpent);
              const reason = tierReason(tier, totalSpent, next);
              return (
                <Card key={c.id} testId={`customer-card-${c.id}`}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <Avatar name={c.name} size="md" />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 'var(--text-h4)', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {c.name}
                        </span>
                        <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)' }}>({c.phone})</span>
                        <Badge variant={CONSENT_VARIANTS[c.consent]} size="sm">
                          {CONSENT_LABELS[c.consent]}
                        </Badge>
                        {c.tags.length > 0 && <Badge variant="accent" size="sm">{c.tags.join(' / ')}</Badge>}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" ariaLabel={`編輯 ${c.name}`}>
                      編輯
                    </Button>
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                      gap: 12,
                      fontSize: 'var(--text-body)',
                    }}
                  >
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-caption)' }}>最後療程</div>
                      <div style={{ color: 'var(--text-primary)' }}>
                        {last ? `${last.serviceName}` : '—'}
                        {last && (
                          <span style={{ color: 'var(--text-muted)' }}> @ {last.performedAt.slice(0, 10)}</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-caption)' }}>累計消費</div>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                        NT$ {totalSpent.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-caption)' }}>Tier</div>
                      <div style={{ color: 'var(--text-primary)' }}>{tier.label}（{myTxs.length} 次）</div>
                    </div>
                  </div>
                  <p style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)', marginTop: 8 }}>
                    {reason}
                  </p>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
