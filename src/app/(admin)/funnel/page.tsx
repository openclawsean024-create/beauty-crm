// v0.4.0 /funnel — 回流漏斗（三階段手動標記）
// 對齊 DESIGN §5.6

'use client';

import { useAdminData } from '@/components/admin/AdminDataProvider';
import { useAdminHandlers } from '@/components/admin/useAdminHandlers';
import { computeReminder } from '@/lib/reminders';
import {
  getFunnelStage,
  contactLogsFor,
  apptLogsFor,
  type FunnelStage,
} from '@/lib/funnel';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Icon from '@/components/ui/Icon';

const COLUMNS: { key: FunnelStage; title: string; hint: string }[] = [
  { key: 'due', title: '① 應回訪', hint: '尚未聯絡 / 尚未預約' },
  { key: 'contacted', title: '② 已聯絡', hint: '已打電話 / 傳訊，但還沒約到時間' },
  { key: 'booked', title: '③ 已預約', hint: '已安排下次預約' },
];

export default function FunnelPage() {
  const data = useAdminData();
  const { handleMarkContacted, handleMarkBooked } = useAdminHandlers();

  if (!data.hydrated) return <div style={{ padding: 24 }}>載入中…</div>;

  return (
    <div>
      <header style={{ marginBottom: 'var(--space-4)' }}>
        <h1 style={{ fontSize: 'var(--text-h1)', color: 'var(--text-primary)', margin: 0 }}>回流漏斗</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          手動標記 — 3 階段（避免被誤判為自動行銷）
        </p>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 'var(--space-3)',
        }}
      >
        {COLUMNS.map((col) => {
          const colCustomers = data.customers.filter((c) => {
            const reminder = computeReminder(c, data.treatments);
            const stage = getFunnelStage(
              reminder,
              contactLogsFor(data.contactLogs, c.id),
              apptLogsFor(data.apptLogs, c.id),
            );
            return stage === col.key;
          });

          return (
            <Card
              key={col.key}
              title={`${col.title}（${colCustomers.length}）`}
              subtitle={col.hint}
              testId={`funnel-col-${col.key}`}
            >
              {colCustomers.length === 0 ? (
                <p style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)', padding: '12px 0' }}>
                  — 無客戶 —
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {colCustomers.map((c) => {
                    const reminder = computeReminder(c, data.treatments);
                    const lastT = data.treatments.find((t) => t.id === reminder.lastTreatmentId);
                    return (
                      <div
                        key={c.id}
                        data-testid={`funnel-card-${col.key}-${c.id}`}
                        style={{
                          padding: 12,
                          background: 'var(--bg-primary)',
                          borderRadius: 'var(--radius-md)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</span>
                          {c.consent === 'granted' && (
                            <Badge variant="success" size="sm">已同意</Badge>
                          )}
                        </div>
                        <p style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)', margin: '2px 0' }}>
                          {lastT ? `${lastT.serviceName} @ ${lastT.performedAt.slice(0, 10)}` : '— 尚無療程 —'}
                        </p>
                        <p style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)', margin: '2px 0' }}>
                          建議回訪：{reminder.suggestedRecallAt}
                          {reminder.daysUntilRecall >= 0
                            ? `（還有 ${reminder.daysUntilRecall} 天）`
                            : `（已過 ${-reminder.daysUntilRecall} 天）`}
                        </p>
                        <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                          {col.key === 'due' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleMarkContacted(c.id, 'connected')}
                            >
                              <Icon name="BellRing" size={14} /> 標記已聯絡
                            </Button>
                          )}
                          {col.key === 'contacted' && (
                            <Button size="sm" variant="primary" onClick={() => handleMarkBooked(c.id)}>
                              <Icon name="Check" size={14} /> 標記已預約（+14 天）
                            </Button>
                          )}
                          {col.key === 'booked' &&
                            (() => {
                              const appt = apptLogsFor(data.apptLogs, c.id).find(
                                (a) => new Date(a.scheduledFor).getTime() > Date.now(),
                              );
                              return appt ? (
                                <p
                                  style={{
                                    fontSize: 'var(--text-caption)',
                                    color: 'var(--success)',
                                    margin: 0,
                                  }}
                                >
                                  ✓ {appt.scheduledFor.slice(0, 10)} by {appt.designerId}
                                </p>
                              ) : null;
                            })()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
