// v0.4.0 /reminders — 回訪提醒列表
// 對齊 DESIGN §5.3

'use client';

import { useState } from 'react';
import { useAdminData } from '@/components/admin/AdminDataProvider';
import { useAdminHandlers } from '@/components/admin/useAdminHandlers';
import { computeReminder, setOverride, type Reminder } from '@/lib/reminders';
import { suggestRecallDays } from '@/lib/treatments';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import Icon from '@/components/ui/Icon';
import { Select } from '@/components/ui/Input';

const STATUS_VARIANT = {
  overdue: 'danger' as const,
  'due-soon': 'warning' as const,
  upcoming: 'info' as const,
  'no-history': 'default' as const,
};

const STATUS_LABEL = {
  overdue: '已過期',
  'due-soon': '即將到期',
  upcoming: '未來',
  'no-history': '無紀錄',
};

const FILTERS = [
  { value: 'all', label: '全部' },
  { value: 'overdue', label: '已過期' },
  { value: 'due-soon', label: '即將到期' },
  { value: 'upcoming', label: '未來' },
] as const;

export default function RemindersPage() {
  const data = useAdminData();
  const { handleOverrideReminder } = useAdminHandlers();
  const [filter, setFilter] = useState<typeof FILTERS[number]['value']>('all');

  if (!data.hydrated) return <div style={{ padding: 24 }}>載入中…</div>;

  const rows = data.customers
    .map((c) => {
      const base = computeReminder(c, data.treatments);
      const ov = data.reminderOverrides[c.id];
      const r: Reminder = ov ? setOverride(base, ov) : base;
      const last = data.treatments.find((t) => t.id === r.lastTreatmentId);
      return { customer: c, reminder: r, last };
    })
    .filter((row) => {
      if (filter === 'all') return true;
      return row.reminder.status === filter;
    });

  return (
    <div>
      <header
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-4)',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ fontSize: 'var(--text-h1)', color: 'var(--text-primary)', margin: 0 }}>回訪提醒</h1>
          <p style={{ color: 'var(--text-secondary)' }}>依客戶上次療程自動計算下次回訪日</p>
        </div>
        <Select
          id="reminder-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          options={[...FILTERS]}
        />
      </header>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Icon name="BellRing" size={48} strokeWidth={1.5} />}
          title="無符合條件的客戶"
          description="切換其他狀態或新增客戶"
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {rows.map(({ customer: c, reminder: r, last }) => (
            <Card key={c.id} testId={`reminder-card-${c.id}`}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  marginBottom: 8,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <span style={{ fontSize: 'var(--text-h4)', fontWeight: 600 }}>{c.name}</span>{' '}
                  <Badge variant={STATUS_VARIANT[r.status]} size="sm">
                    {STATUS_LABEL[r.status]}
                  </Badge>
                </div>
                <span style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)' }}>
                  建議回訪：{r.suggestedRecallAt}
                  {r.daysUntilRecall >= 0 ? `（還有 ${r.daysUntilRecall} 天）` : `（已過 ${-r.daysUntilRecall} 天）`}
                </span>
              </div>
              <p style={{ fontSize: 'var(--text-body)', color: 'var(--text-secondary)' }}>
                上次療程：{last ? `${last.serviceName}（${last.category}）` : '—'}
              </p>
              <p style={{ fontSize: 'var(--text-caption)', color: 'var(--text-muted)' }}>
                類別預設週期：{last ? `${suggestRecallDays(last.category)} 天` : '—'}
              </p>
              {r.overrideAt ? (
                <p
                  style={{
                    fontSize: 'var(--text-caption)',
                    color: 'var(--success)',
                    marginTop: 4,
                  }}
                >
                  ✓ 已覆寫 → {r.overrideAt}（{r.overriddenBy}：{r.overrideReason ?? '—'}）
                </p>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const lastT = data.treatments.find((t) => t.id === r.lastTreatmentId);
                    const baseDate = lastT ? new Date(lastT.performedAt) : new Date();
                    const recallDays = lastT ? suggestRecallDays(lastT.category) : 28;
                    const overrideDate = new Date(baseDate.getTime() + recallDays * 86_400_000);
                    handleOverrideReminder(c.id, {
                      overrideAt: overrideDate.toISOString(),
                      overriddenBy: 'designer-local',
                      overrideReason: '依客戶服務週期推算',
                    });
                  }}
                >
                  覆寫回訪日
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
