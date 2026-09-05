// v0.4.0 /broadcast — 行銷推播（草稿 + 人工核准）
// 對齊 DESIGN §5.5

'use client';

import { useAdminData } from '@/components/admin/AdminDataProvider';
import { buildBroadcast, BUILTIN_TEMPLATES, selectByConsent, approve, type BroadcastTarget } from '@/lib/broadcast';
import { listOverdue } from '@/lib/reminders';
import { toast } from '@/components/ui/Toast';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import Icon from '@/components/ui/Icon';

export default function BroadcastPage() {
  const data = useAdminData();

  if (!data.hydrated) return <div style={{ padding: 24 }}>載入中…</div>;

  const overdue = listOverdue(data.customers, data.treatments, new Date());
  const overdueCustomers = data.customers.filter((c) => overdue.some((o) => o.customerId === c.id));
  const reachable = selectByConsent(data.customers);
  const targets = buildBroadcast('recall_due', overdueCustomers, data.treatments);
  const draftCount = targets.filter((t) => !data.approvedTargets[t.customer.id]).length;

  return (
    <div>
      <header style={{ marginBottom: 'var(--space-4)' }}>
        <h1 style={{ fontSize: 'var(--text-h1)', color: 'var(--text-primary)', margin: 0 }}>行銷推播</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          已同意 {reachable.length} 位 · 草稿 {draftCount} 份待核准
        </p>
      </header>

      <Card title="預載訊息模板" subtitle={`${Object.keys(BUILTIN_TEMPLATES).length} 種可用模板`}>
        {Object.entries(BUILTIN_TEMPLATES).map(([k, m]) => (
          <div
            key={k}
            style={{ marginBottom: 12, padding: 12, background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <b style={{ color: 'var(--text-primary)' }}>{k}</b>
              <Badge variant="info" size="sm">{m.channel}</Badge>
            </div>
            <code style={{ fontSize: 'var(--text-caption)', color: 'var(--text-secondary)' }}>{m.body}</code>
          </div>
        ))}
      </Card>

      <div style={{ marginTop: 'var(--space-4)' }}>
        <Card
          title="回訪推播預覽"
          subtitle={`${targets.length} 位過期待回訪客戶`}
        >
          {targets.length === 0 ? (
            <EmptyState
              icon={<Icon name="Send" size={48} strokeWidth={1.5} />}
              title="目前沒有過期待回訪客戶"
              description="新增服務或等待客戶回流"
            />
          ) : (
            targets.map((t) => {
              const approved: BroadcastTarget | undefined = data.approvedTargets[t.customer.id];
              const display = approved ?? t;
              return (
                <div
                  key={t.customer.id}
                  style={{
                    borderTop: '1px dashed var(--border-medium)',
                    paddingTop: 12,
                    marginTop: 12,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 8,
                    }}
                  >
                    <span>
                      <b style={{ color: 'var(--text-primary)' }}>→ {t.customer.name}</b>
                      <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-caption)', marginLeft: 6 }}>
                        ({t.customer.phone})
                      </span>
                    </span>
                    <Badge variant={approved ? 'success' : 'warning'} size="sm">
                      {display.status}
                    </Badge>
                  </div>
                  <pre
                    style={{
                      background: 'var(--bg-primary)',
                      padding: 12,
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--text-body)',
                      color: 'var(--text-primary)',
                      whiteSpace: 'pre-wrap',
                      margin: 0,
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    {t.preview}
                  </pre>
                  {approved ? (
                    <p style={{ fontSize: 'var(--text-caption)', color: 'var(--success)', marginTop: 8 }}>
                      ✓ 已核准 by {approved.approvedBy} @{' '}
                      {approved.approvedAt?.slice(0, 16).replace('T', ' ')}
                    </p>
                  ) : (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        try {
                          const next = approve(t, 'designer-local');
                          data.setApprovedTargets({ ...data.approvedTargets, [t.customer.id]: next });
                          toast.success(`已核准 ${t.customer.name} 的推播草稿`);
                        } catch (err) {
                          toast.error(`核准失敗：${(err as Error).message}`);
                        }
                      }}
                    >
                      ✓ 核准草稿
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </Card>
      </div>
    </div>
  );
}
