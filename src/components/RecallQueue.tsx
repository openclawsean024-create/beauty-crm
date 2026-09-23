'use client';

import type { Customer } from '@/lib/customers';
import type { Treatment } from '@/lib/treatments';
import type { Reminder } from '@/lib/reminders';
import DraftComposer from './DraftComposer';

export interface RecallRow {
  customer: Customer;
  reminder: Reminder;
  lastTreatment: Treatment | undefined;
}

interface RecallQueueProps {
  rows: RecallRow[];
  selectedCustomerId: string | null;
  onSelect: (customerId: string) => void;
  totalCount: number;
  draftOpen: boolean;
  draftText: string;
  draftApproved: boolean;
  onGenerateDraft: () => void;
  onApproveDraft: () => void;
  onCopyDraft: () => void;
}

function formatShortDate(iso: string | undefined): string {
  if (!iso) return '—';
  return iso.slice(5).replace('-', '/');
}

function statusForReminder(reminder: Reminder): { label: string; tone: 'overdue' | 'soon' | 'ok' } {
  if (reminder.status === 'overdue') {
    return { label: `逾期 ${Math.abs(reminder.daysUntilRecall)} 天`, tone: 'overdue' };
  }
  if (reminder.status === 'due-soon') {
    if (reminder.daysUntilRecall <= 3) return { label: `${reminder.daysUntilRecall} 天內`, tone: 'soon' };
    return { label: `${reminder.daysUntilRecall} 天內`, tone: 'soon' };
  }
  if (reminder.status === 'upcoming') return { label: `${reminder.daysUntilRecall} 天後`, tone: 'ok' };
  return { label: '尚無紀錄', tone: 'soon' };
}

function customerInitial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  return trimmed[0]!.toUpperCase();
}

export default function RecallQueue({
  rows,
  selectedCustomerId,
  onSelect,
  totalCount,
  draftOpen,
  draftText,
  draftApproved,
  onGenerateDraft,
  onApproveDraft,
  onCopyDraft,
}: RecallQueueProps) {
  return (
    <section className="panel" aria-labelledby="queue-title">
      <div className="panel-head">
        <div>
          <h2 className="panel-title" id="queue-title">今天先聯絡誰？</h2>
          <p className="panel-sub">依逾期天數排序 · 點選客戶查看完整記憶</p>
        </div>
        <button type="button" className="filter" aria-label="篩選狀態">
          全部狀態　⌄
        </button>
      </div>

      <div className="queue">
        {rows.length === 0 ? (
          <p style={{ padding: 24, color: 'var(--muted)', textAlign: 'center' }}>
            目前沒有待回訪客戶
          </p>
        ) : (
          rows.map(({ customer, reminder, lastTreatment }) => {
            const status = statusForReminder(reminder);
            const isSelected = customer.id === selectedCustomerId;
            return (
              <button
                key={customer.id}
                type="button"
                className={`queue-row${isSelected ? ' selected' : ''}`}
                aria-pressed={isSelected}
                onClick={() => onSelect(customer.id)}
              >
                <span className="customer">
                  <span className="mini-avatar" aria-hidden="true">{customerInitial(customer.name)}</span>
                  <span>
                    <span className="customer-name">{customer.name}</span>
                    <br />
                    <span className="customer-meta">
                      最後服務 · {lastTreatment?.serviceName ?? '尚無紀錄'}
                    </span>
                  </span>
                </span>
                <span>
                  <span className="cell-label">上次服務</span>
                  <br />
                  <span className="cell-value">{formatShortDate(reminder.lastPerformedAt)}</span>
                </span>
                <span>
                  <span className="cell-label">建議回訪</span>
                  <br />
                  <span className={`status ${status.tone}`}>{status.label}</span>
                </span>
                <span aria-hidden="true" style={{ color: 'var(--muted)' }}>›</span>
              </button>
            );
          })
        )}
      </div>

      <DraftComposer
        open={draftOpen}
        draftText={draftText}
        approved={draftApproved}
        onApprove={onApproveDraft}
        onCopy={onCopyDraft}
        onGenerate={onGenerateDraft}
      />

      <div className="panel-foot">
        <button type="button" className="ghost">
          查看全部 {totalCount} 位待回訪客戶　→
        </button>
      </div>
    </section>
  );
}
