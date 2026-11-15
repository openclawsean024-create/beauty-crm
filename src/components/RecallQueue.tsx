'use client';

import { t, tf, type Lang } from '@/lib/i18n';
import type { RecallQueueRow } from '@/lib/recall-queue';
import { QUEUE_FILTERS, type QueueFilter } from './dashboard-types';

interface RecallQueueProps {
  lang: Lang;
  rows: RecallQueueRow[];
  selectedCustomerId: string | null;
  filter: QueueFilter;
  query: string;
  onFilterChange: (filter: QueueFilter) => void;
  onQueryChange: (query: string) => void;
  onSelect: (customerId: string) => void;
  onExport?: () => void; // 沒有匯出權限時不傳，按鈕就不顯示
  onShowAll: () => void;
}

function initialOf(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.slice(-1).toUpperCase() : '?';
}

function formatServiceDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

export function formatRecallDays(lang: Lang, daysUntilRecall: number): string {
  if (daysUntilRecall < 0) return tf(lang, 'daysOverdue', { n: Math.abs(daysUntilRecall) });
  if (daysUntilRecall === 0) return t(lang, 'dueToday');
  return tf(lang, 'dueInDays', { n: daysUntilRecall });
}

const FILTER_LABEL: Record<QueueFilter, 'filterAll' | 'filterOverdue' | 'filterSoon' | 'filterVip'> = {
  all: 'filterAll',
  overdue: 'filterOverdue',
  soon: 'filterSoon',
  vip: 'filterVip',
};

export default function RecallQueue({
  lang,
  rows,
  selectedCustomerId,
  filter,
  query,
  onFilterChange,
  onQueryChange,
  onSelect,
  onExport,
  onShowAll,
}: RecallQueueProps) {
  const filtered = rows.filter((r) => {
    if (filter === 'overdue') return r.daysUntilRecall < 0;
    if (filter === 'soon') return r.daysUntilRecall >= 0;
    if (filter === 'vip') return r.isVip;
    return true;
  });
  const q = query.trim().toLowerCase();
  const searched = !q
    ? filtered
    : filtered.filter(
        (r) =>
          r.customer.name.toLowerCase().includes(q) ||
          r.customer.phone.includes(q) ||
          r.lastServiceName.toLowerCase().includes(q),
      );

  return (
    <article className="card" data-testid="recall-queue">
      <div className="card-header">
        <div>
          <h2 className="card-title">{t(lang, 'queueTitle')}</h2>
          <p className="card-subtitle">{t(lang, 'queueSubtitle')}</p>
        </div>
        {onExport ? (
          <button type="button" className="quiet" onClick={onExport} data-testid="export-data">
            {t(lang, 'export')}
          </button>
        ) : null}
      </div>
      <div className="queue-tools">
        <label className="queue-search" aria-label={t(lang, 'queueSearchPlaceholder')}>
          <span aria-hidden="true">⌕</span>
          <input
            id="queue-search"
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={t(lang, 'queueSearchPlaceholder')}
          />
        </label>
        <div className="segmented" role="group" aria-label={t(lang, 'queueTitle')}>
          {QUEUE_FILTERS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={filter === option}
              className={filter === option ? 'active' : ''}
              data-filter={option}
              onClick={() => onFilterChange(option)}
            >
              {t(lang, FILTER_LABEL[option])}
            </button>
          ))}
        </div>
      </div>
      <div className="queue">
        {searched.length === 0 ? <p className="empty-note">{t(lang, 'queueEmpty')}</p> : null}
        {searched.map((row) => {
          const isSelected = row.customer.id === selectedCustomerId;
          return (
            <button
              key={row.customer.id}
              type="button"
              className={`queue-row${isSelected ? ' selected' : ''}`}
              aria-pressed={isSelected}
              data-testid="queue-row"
              data-customer-id={row.customer.id}
              data-status={row.status}
              data-vip={row.isVip ? 'true' : 'false'}
              onClick={() => onSelect(row.customer.id)}
            >
              <div className="person">
                <span className="person-mark" aria-hidden="true">{initialOf(row.customer.name)}</span>
                <span>
                  <span className="person-name">{row.customer.name}</span>
                  <br />
                  <span className="person-meta mono">
                    {formatServiceDate(row.lastServiceDate)} · {row.lastServiceName}
                  </span>
                </span>
              </div>
              <span className="cell-stack">
                <span className="cell-label">{t(lang, 'colReturnWindow')}</span>
                <span className="cell-value mono">{formatRecallDays(lang, row.daysUntilRecall)}</span>
              </span>
              <span className="cell-stack">
                <span className="cell-label">{t(lang, 'colLastVisit')}</span>
                <span className="cell-value mono">NT$ {row.amount.toLocaleString('en-US')}</span>
              </span>
              <span className="status-stack">
                <span className={`status ${row.status}`}>
                  {row.status === 'overdue' ? t(lang, 'statusOverdue') : t(lang, 'statusSoon')}
                </span>
                {row.booked ? (
                  <span className="status ok" data-badge="booked">{t(lang, 'badgeBooked')}</span>
                ) : row.contacted ? (
                  <span className="status ok" data-badge="contacted">{t(lang, 'badgeContacted')}</span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
      <div className="queue-footer">
        <span>
          {t(lang, 'showingOf')} {searched.length} / {rows.length}
        </span>
        <button type="button" className="quiet" onClick={onShowAll}>
          {t(lang, 'showAll')} →
        </button>
      </div>
    </article>
  );
}
