'use client';

import type { Customer } from '@/lib/customers';
import type { Treatment } from '@/lib/treatments';
import { treatmentsByCustomer } from '@/lib/treatments';
import { computeCustomerLTV } from '@/lib/analytics';
import { progressToNextTier } from '@/lib/tiers';
import { t, type Lang } from '@/lib/i18n';
import BroadcastGuard from './BroadcastGuard';
import DraftComposer from './DraftComposer';
import type { RecallRow } from './RecallQueue';

interface CustomerMemoryPanelProps {
  lang: Lang;
  customer: Customer | null;
  row: RecallRow | null;
  treatments: Treatment[];
  tierLabel: string;
  careNote: string;
  draftBody: string;
  draftApproved: boolean;
  draftOpen: boolean;
  onDraftToggle: () => void;
  onDraftChange: (value: string) => void;
  onApproveDraft: () => void;
  onCopyDraft: () => void;
  onMarkContacted: () => void;
}

function initialOf(name: string): string {
  const trimmed = name.trim();
  return trimmed[0] ? trimmed[0].toUpperCase() : '?';
}

function maskPhone(phone: string): string {
  if (phone.length < 4) return phone;
  return `09•• ••• ${phone.slice(-3)}`;
}

function formatDate(iso: string): string {
  // YYYY-MM-DDThh:mm:ssZ → "MM.DD.YYYY"
  return iso.slice(0, 10).split('-').reverse().join('.').replace(/^(\d{2})\.(\d{2})\./, '$1.$2.');
}

export default function CustomerMemoryPanel({
  lang,
  customer,
  row,
  treatments,
  tierLabel,
  careNote,
  draftBody,
  draftApproved,
  draftOpen,
  onDraftToggle,
  onDraftChange,
  onApproveDraft,
  onCopyDraft,
  onMarkContacted,
}: CustomerMemoryPanelProps) {
  if (!customer) {
    return (
      <aside className="card profile" aria-live="polite">
        <div className="profile-cover">
          <small>Client memory</small>
          <p>{t(lang, 'noClientSelected')}</p>
        </div>
        <div className="profile-body">
          <p style={{ color: 'var(--muted)', fontSize: 12 }}>
            {lang === 'zh'
              ? '從左邊選擇一位客戶查看完整記憶'
              : 'Select a client on the left to see their full memory'}
          </p>
        </div>
      </aside>
    );
  }

  const myTreatments = treatmentsByCustomer(treatments, customer.id).slice(0, 2);
  const ltv = computeCustomerLTV(treatments, customer.id);
  const tierProgress = progressToNextTier(ltv.totalSpent);

  const reasonText = row
    ? row.daysUntilRecall < 0
      ? lang === 'zh'
        ? `已超過建議回流週期 ${Math.abs(row.daysUntilRecall)} 天`
        : `${Math.abs(row.daysUntilRecall)} days past recommended window`
      : lang === 'zh'
        ? `${row.daysUntilRecall} 天內進入回訪窗口`
        : `Enters return window in ${row.daysUntilRecall} days`
    : t(lang, 'reasonFallback');

  const nextActionText = t(lang, 'nextActionFallback');

  const tags = [...customer.tags];
  if (customer.consent === 'granted') tags.push(lang === 'zh' ? '已同意聯絡' : 'consent granted');
  if (customer.consent === 'pending') tags.push(lang === 'zh' ? '待確認同意' : 'pending consent');
  if (customer.consent === 'revoked') tags.push(lang === 'zh' ? '不同意行銷' : 'consent revoked');

  // Tier label is passed in via tierLabel prop; tierProgress gives context for future use
  void tierProgress;

  return (
    <aside className="card profile" aria-live="polite" data-customer-id={customer.id}>
      <div className="profile-cover">
        <small>Client memory</small>
        <p>
          {lang === 'zh'
            ? '每一次服務都需要的關鍵記憶都在這裡'
            : 'Everything your next visit needs to know'}
        </p>
      </div>
      <div className="profile-body">
        <div className="profile-head">
          <div className="profile-person">
            <div className="profile-avatar" aria-hidden="true">{initialOf(customer.name)}</div>
            <div>
              <div className="profile-name" id="profile-name">{customer.name}</div>
              <div className="profile-phone mono" id="profile-phone">{maskPhone(customer.phone)}</div>
            </div>
          </div>
          <span className="tier" id="profile-tier">{tierLabel}</span>
        </div>

        <div className="tags" id="profile-tags">
          {tags.map((tag, index) => (
            <span key={`${tag}-${index}`} className={`tag${index >= 2 ? ' neutral' : ''}`}>
              {tag}
            </span>
          ))}
        </div>

        <div
          className="risk"
          role={customer.allergies.length > 0 ? 'alert' : 'status'}
          id="profile-risk"
        >
          <strong aria-hidden="true">!</strong>
          <span>{careNote}</span>
        </div>

        <dl className="facts">
          <div className="fact">
            <dt>Last visit</dt>
            <dd id="profile-service">
              {row?.lastServiceDate
                ? `${formatDate(row.lastServiceDate)} · ${row.lastServiceName}`
                : '—'}
              {row ? <> <span>／ NT$ {row.amount.toLocaleString()}</span></> : null}
            </dd>
          </div>
          <div className="fact">
            <dt>Why now</dt>
            <dd id="profile-reason">{reasonText}</dd>
          </div>
          <div className="fact">
            <dt>Next best action</dt>
            <dd id="profile-next">{nextActionText}</dd>
          </div>
        </dl>

        {myTreatments.length > 0 ? (
          <div className="timeline">
            {myTreatments.map((tx) => (
              <div key={tx.id} className="timeline-item">
                <time className="mono">{formatDate(tx.performedAt)}</time>
                <p>
                  {tx.serviceName}
                  {tx.notes
                    ? ` · ${tx.notes.slice(0, 38)}${tx.notes.length > 38 ? '…' : ''}`
                    : ''}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="profile-actions">
          <BroadcastGuard consent={customer.consent} ready lang={lang}>
            <button
              type="button"
              className="button primary"
              onClick={onDraftToggle}
              data-i18n="viewDraft"
            >
              {draftOpen
                ? lang === 'zh'
                  ? '收起草稿'
                  : 'Hide draft'
                : t(lang, 'viewDraft')}
            </button>
          </BroadcastGuard>
          <button
            type="button"
            className="button secondary"
            onClick={onMarkContacted}
            data-i18n="markContacted"
          >
            {t(lang, 'markContacted')}
          </button>
        </div>
      </div>

      <DraftComposer
        lang={lang}
        open={draftOpen}
        approved={draftApproved}
        body={draftBody}
        onBodyChange={onDraftChange}
        onToggle={onDraftToggle}
        onApprove={onApproveDraft}
        onCopy={onCopyDraft}
      />
    </aside>
  );
}
