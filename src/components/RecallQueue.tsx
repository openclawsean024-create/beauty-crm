'use client';

import type { Customer } from '@/lib/customers';
import type { Treatment } from '@/lib/treatments';
import { t, type Lang } from '@/lib/i18n';
import {
  QUEUE_FILTERS,
  type QueueFilter,
  type Tab,
} from './dashboard-types';

export interface RecallRow {
  customer: Customer;
  lastServiceDate?: string;
  lastServiceName?: string;
  amount: number;
  daysUntilRecall: number; // negative = overdue
  status: 'overdue' | 'soon';
  isVip: boolean;
}

interface RecallQueueProps {
  lang: Lang;
  rows: RecallRow[];
  selectedCustomerId: string | null;
  filter: QueueFilter;
  query: string;
  onFilterChange: (filter: QueueFilter) => void;
  onQueryChange: (query: string) => void;
  onSelect: (customerId: string) => void;
  totalCount: number;
  onExport: () => void;
  onShowAll: () => void;
}

function statusForRow(row: RecallRow): {
  label: string;
  tone: 'overdue' | 'soon' | 'ok';
} {
  if (row.daysUntilRecall < 0) {
    return { label: 'overdue', tone: 'overdue' };
  }
  return { label: 'soon', tone: 'soon' };
}

function initialOf(name: string): string {
  const trimmed = name.trim();
  return trimmed[0] ? trimmed[0].toUpperCase() : '?';
}

function formatServiceDate(iso?: string): string {
  if (!iso) return '—';
  return iso.slice(5).replace('-', '/');
}

function formatDays(daysUntilRecall: number): string {
  if (daysUntilRecall < 0) return `${Math.abs(daysUntilRecall)} days overdue`;
  if (daysUntilRecall === 0) return 'today';
  return `in ${daysUntilRecall} days`;
}

function formatAmount(amount: number): string {
  return `NT$ ${amount.toLocaleString()}`;
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
  totalCount,
  onExport,
  onShowAll,
}: RecallQueueProps) {
  const filtered = filter === 'all' ? rows : rows.filter((r) => {
    if (filter === 'overdue') return r.daysUntilRecall < 0;
    if (filter === 'soon') return r.daysUntilRecall >= 0;
    if (filter === 'vip') return r.isVip;
    return true;
  });
  const searched = !query.trim()
    ? filtered
    : filtered.filter((r) => {
        const q = query.toLowerCase();
        return (
          r.customer.name.toLowerCase().includes(q) ||
          (r.lastServiceName ?? '').toLowerCase().includes(q)
        );
      });

  return (
    <article className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">{t(lang, 'queueTitle')}</h2>
          <p className="card-subtitle">{t(lang, 'queueSubtitle')}</p>
        </div>
        <button type="button" className="quiet" onClick={onExport}>
          {t(lang, 'export')}
        </button>
      </div>
      <div className="queue-tools">
        <label className="queue-search" aria-label="Search queue">
          <span aria-hidden="true">⌕</span>
          <input
            id="queue-search"
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={t(lang, 'queueSearchPlaceholder')}
          />
        </label>
        <div className="segmented" role="tablist" aria-label={t(lang, 'queueTitle')}>
          {QUEUE_FILTERS.map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={filter === option}
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
        {searched.length === 0 ? (
          <p style={{ padding: 20, color: 'var(--muted)', textAlign: 'center', fontSize: 12 }}>
            {lang === 'zh' ? '目前沒有符合條件的客戶' : 'No clients match the current filters'}
          </p>
        ) : null}
        {searched.map((row) => {
          const status = statusForRow(row);
          const isSelected = row.customer.id === selectedCustomerId;
          return (
            <button
              key={row.customer.id}
              type="button"
              className={`queue-row${isSelected ? ' selected' : ''}`}
              aria-pressed={isSelected}
              data-status={status.tone}
              data-vip={row.isVip ? 'true' : 'false'}
              onClick={() => onSelect(row.customer.id)}
            >
              <div className="person">
                <span className="person-mark" aria-hidden="true">{initialOf(row.customer.name)}</span>
                <span>
                  <span className="person-name">{row.customer.name}</span>
                  <br />
                  <span className="person-meta mono">
                    {formatServiceDate(row.lastServiceDate)} · {row.lastServiceName ?? t(lang, 'noFindings')}
                  </span>
                </span>
              </div>
              <span className="cell-stack">
                <span className="cell-label">Return window</span>
                <span className="cell-value mono">{formatDays(row.daysUntilRecall)}</span>
              </span>
              <span className="cell-stack">
                <span className="cell-label">Last visit</span>
                <span className="cell-value mono">{formatAmount(row.amount)}</span>
              </span>
              <span className={`status ${status.tone}`}>{status.label}</span>
            </button>
          );
        })}
      </div>
      <div className="queue-footer">
        <span>
          {t(lang, 'showingOf')} {searched.length} / {totalCount}
        </span>
        <button type="button" className="quiet" onClick={onShowAll}>
          {t(lang, 'showAll')} →
        </button>
      </div>
    </article>
  );
}

export const _internalTab: Tab = 'today';
