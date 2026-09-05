// v0.4.0 /dashboard — admin 首頁（greeting + 重點 cards）
// 對齊 DESIGN §5.1

'use client';

import { useState } from 'react';
import { useAdminData } from '@/components/admin/AdminDataProvider';
import { useAdminHandlers } from '@/components/admin/useAdminHandlers';
import { listOverdue } from '@/lib/reminders';
import { computeRevenueByMonth, topSpenders } from '@/lib/analytics';
import { selectByConsent } from '@/lib/broadcast';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Icon from '@/components/ui/Icon';
import AddTreatmentSheet from '@/components/AddTreatmentSheet';
import { EXPORT_FILE_EXTENSION } from '@/lib/export';

export default function DashboardPage() {
  const data = useAdminData();
  const { handleExport, handleImport, handlePurge } = useAdminHandlers();
  const [addOpen, setAddOpen] = useState(false);

  if (!data.hydrated) {
    return <div style={{ padding: 24 }}>載入中…</div>;
  }

  const overdue = listOverdue(data.customers, data.treatments, new Date());
  const reachable = selectByConsent(data.customers);
  const spenders = topSpenders(data.treatments, 3);
  const rev = computeRevenueByMonth(data.treatments);

  return (
    <div>
      {/* Hero / Greeting */}
      <section style={{ marginBottom: 'var(--space-5)' }}>
        <h1 style={{ fontSize: 'var(--text-h1)', color: 'var(--text-primary)', margin: 0 }}>
          早安，林心妍
        </h1>
        <p style={{ fontSize: 'var(--text-body-lg)', color: 'var(--text-secondary)', marginTop: 4 }}>
          今日有 {overdue.length} 位客戶待回訪 · {reachable.length} 位本月壽星
        </p>
      </section>

      {/* 主要 stat cards（4 col grid） */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-5)',
        }}
      >
        <Card variant="stat">
          <div style={{ fontSize: 'var(--text-display)', color: 'var(--accent-primary)', fontWeight: 700 }}>
            {reachable.length}
          </div>
          <div style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)' }}>活躍客戶</div>
        </Card>
        <Card variant="stat">
          <div style={{ fontSize: 'var(--text-display)', color: 'var(--accent-primary)', fontWeight: 700 }}>
            {overdue.length}
          </div>
          <div style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)' }}>待回訪</div>
        </Card>
        <Card variant="stat">
          <div style={{ fontSize: 'var(--text-display)', color: 'var(--accent-primary)', fontWeight: 700 }}>
            {data.treatments.length}
          </div>
          <div style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)' }}>本月療程</div>
        </Card>
        <Card variant="stat" onClick={() => setAddOpen(true)} testId="quick-add-treatment">
          <div style={{ color: 'var(--accent-primary)', marginBottom: 8 }}>
            <Icon name="Plus" size={32} strokeWidth={2} />
          </div>
          <div style={{ fontSize: 'var(--text-h4)', color: 'var(--accent-primary)', fontWeight: 600 }}>
            新增服務
          </div>
          <div style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)' }}>單手快速記錄</div>
        </Card>
      </div>

      {/* Top 3 高消費客戶 */}
      <Card title="Top 3 高消費客戶" subtitle={`本月營收 NT$ ${rev.reduce((s, r) => s + r.total, 0).toLocaleString()}`}>
        {spenders.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>尚無資料</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {spenders.map((s) => {
              const c = data.customers.find((x) => x.id === s.customerId);
              return (
                <li
                  key={s.customerId}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    borderTop: '1px solid var(--border-light)',
                  }}
                >
                  <span>
                    <b style={{ color: 'var(--text-primary)' }}>{c?.name ?? s.customerId}</b>{' '}
                    <Badge variant="accent" size="sm">VIP</Badge>
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    NT$ {s.totalSpent.toLocaleString()} · {s.visitCount} 次
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* 資料管理（加密匯出 / 刪除） */}
      <Card title="資料管理" subtitle="加密匯出 / 還原 / 刪除 — FR-009">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button onClick={handleExport} variant="primary">
            加密匯出
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              if (typeof document === 'undefined') return;
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = EXPORT_FILE_EXTENSION;
              input.onchange = (e) => {
                const f = (e.target as HTMLInputElement).files?.[0];
                if (f) handleImport(f);
              };
              input.click();
            }}
          >
            還原備份
          </Button>
          <Button variant="danger" onClick={handlePurge}>
            刪除所有資料
          </Button>
        </div>
        {data.lastPurge && (
          <p
            style={{
              fontSize: 'var(--text-caption)',
              color: 'var(--text-muted)',
              marginTop: 12,
              fontFamily: 'var(--font-mono)',
            }}
          >
            上次刪除 tombstone：{data.lastPurge.tombstoneId} @ {data.lastPurge.wipedAt}
          </p>
        )}
      </Card>

      <AddTreatmentSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={(t) => {
          data.addTreatment(t);
          setAddOpen(false);
        }}
        customers={data.customers}
      />
    </div>
  );
}
