// Beauty CRM — 回訪佇列 (Queue)
// 對應 PRD/UI-SPEC §3.2:逾期天數排序、客戶記憶摘要、同意狀態。

'use client';

import type { ConsentStatus } from '@/lib/customers';
import type { Reminder } from '@/lib/reminders';
import type { DisplayCustomer, DisplayTreatment } from './seed';

export type QueueItem = {
  customer: DisplayCustomer;
  reminder: Reminder;
  lastTreatment?: DisplayTreatment;
};

interface Props {
  items: QueueItem[];
  selectedId?: string;
  onSelect: (item: QueueItem) => void;
}

const consentLabel: Record<ConsentStatus, string> = {
  granted: '已同意',
  pending: '待確認',
  revoked: '已撤回',
};

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${m[1]?.slice(2)}/${m[2]}/${m[3]}`;
}

function reminderStatus(
  days: number,
): { label: string; tone: 'overdue' | 'soon' | 'ok' } {
  if (days < 0) {
    const n = -days;
    return { label: `逾期 ${n} 天`, tone: 'overdue' };
  }
  if (days <= 3) return { label: `${days} 天內`, tone: 'soon' };
  if (days <= 7) return { label: '本週', tone: 'soon' };
  return { label: `${days} 天後`, tone: 'ok' };
}

export default function QueueList({ items, selectedId, onSelect }: Props) {
  return (
    <div className="queue" role="list" aria-label="回訪佇列">
      {items.map((item) => {
        const t = item.reminder;
        const status = reminderStatus(t.daysUntilRecall);
        const isSelected = selectedId === item.customer.id;
        return (
          <button
            type="button"
            key={item.customer.id}
            className={`queue-row${isSelected ? ' selected' : ''}`}
            onClick={() => onSelect(item)}
            aria-pressed={isSelected}
            aria-label={`選擇 ${item.customer.displayName},最後服務 ${
              item.lastTreatment?.displayName ?? '無'
            },${status.label},同意 ${consentLabel[item.customer.consent]}`}
          >
            <span className="customer">
              <span className="mini-avatar">{item.customer.initials}</span>
              <span>
                <span className="customer-name">{item.customer.displayName}</span>
                <span className="customer-meta">
                  最後服務 · {item.lastTreatment?.displayName ?? '無'}
                </span>
              </span>
            </span>
            <span>
              <span className="cell-label">上次服務</span>
              <br />
              <span className="cell-value">{formatDate(item.lastTreatment?.performedAt)}</span>
            </span>
            <span>
              <span className="cell-label">建議回訪</span>
              <br />
              <span className={`status ${status.tone}`}>{status.label}</span>
            </span>
            <span aria-hidden="true">›</span>
          </button>
        );
      })}
      {items.length === 0 && (
        <p className="panel-sub" style={{ padding: '24px 12px', textAlign: 'center' }}>
          目前沒有待回訪客戶 🎉
        </p>
      )}
    </div>
  );
}
