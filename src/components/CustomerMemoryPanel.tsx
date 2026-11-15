'use client';

import { useState } from 'react';
import type { Appointment } from '@/lib/appointments';
import type { ConsentStatus } from '@/lib/customers';
import type { EffectSummary as EffectSummaryData } from '@/lib/effects';
import type { FollowupStatus } from '@/lib/followups';
import { t, tf, type Lang, type MessageKey } from '@/lib/i18n';
import type { PackageSummary } from '@/lib/packages';
import { remainingSessions } from '@/lib/packages';
import type { CustomerView } from '@/lib/permissions';
import { SENSITIVE_MASK, sensitiveConsentOf } from '@/lib/sensitive';
import type { Treatment } from '@/lib/treatments';
import BroadcastGuard from './BroadcastGuard';
import DraftComposer from './DraftComposer';
import EffectSummary from './EffectSummary';

export interface MemoryPanelActions {
  onDraftToggle: () => void;
  onDraftChange: (value: string) => void;
  onApproveDraft: () => void;
  onCopyDraft: () => void;
  onDryRun: () => void;
  onMarkContacted: () => void;
  onSetMarketingConsent: (status: ConsentStatus) => void;
  onGrantSensitive: () => void;
  onRevokeSensitive: () => void;
  onAddAppointment: (date: string, time: string) => void;
  onCancelAppointment: (appointmentId: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}

interface CustomerMemoryPanelProps extends MemoryPanelActions {
  lang: Lang;
  today: string; // YYYY-MM-DD
  view: CustomerView | null;
  /** 距建議回訪日的天數；沒有服務紀錄時為 undefined */
  daysUntilRecall: number | undefined;
  contacted: boolean;
  recentTreatments: Treatment[];
  lastTreatment: Treatment | undefined;
  packageSummary: PackageSummary;
  nextAppointment: Appointment | undefined;
  effectSummary: EffectSummaryData | undefined;
  designerName: string | undefined;
  designerDescription: string;
  tierLabel: string;
  draftBody: string;
  draftStatus: FollowupStatus;
  draftOpen: boolean;
  canDelete: boolean;
}

const CONSENT_LABEL: Record<ConsentStatus, MessageKey> = {
  granted: 'consentGranted',
  pending: 'consentPending',
  revoked: 'consentRevoked',
};

function initialOf(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.slice(-1).toUpperCase() : '?';
}

function maskPhone(phone: string): string {
  if (phone.length < 4) return phone;
  return `09•• ••• ${phone.slice(-3)}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function CustomerMemoryPanel(props: CustomerMemoryPanelProps) {
  const { lang, view } = props;
  // 換客戶時由父層以 key 重掛，以下 state 會回到預設（敏感資料重新遮罩）
  const [revealed, setRevealed] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [apptDate, setApptDate] = useState(props.today);
  const [apptTime, setApptTime] = useState('14:00');

  if (!view) {
    return (
      <aside className="card profile" aria-live="polite" data-testid="memory-panel">
        <div className="profile-cover">
          <small>Client memory</small>
          <p>{t(lang, 'noClientSelected')}</p>
        </div>
        <div className="profile-body">
          <p className="memory-empty">{t(lang, 'memoryEmptyHint')}</p>
        </div>
      </aside>
    );
  }

  const { customer, sensitiveHidden } = view;
  const sensitiveConsent = sensitiveConsentOf(customer);
  const { daysUntilRecall, lastTreatment, packageSummary, nextAppointment } = props;

  const reasonText =
    daysUntilRecall === undefined
      ? t(lang, 'reasonNoHistory')
      : daysUntilRecall < 0
        ? tf(lang, 'reasonOverdue', { n: Math.abs(daysUntilRecall) })
        : daysUntilRecall <= 14
          ? tf(lang, 'reasonSoon', { n: daysUntilRecall })
          : t(lang, 'reasonNotDue');

  const sensitiveItems: Array<{ label: string; value: string }> = [
    ...(customer.allergies.length > 0 ? [{ label: t(lang, 'labelAllergies'), value: customer.allergies.join('、') }] : []),
    ...(customer.skinCondition ? [{ label: t(lang, 'labelSkin'), value: customer.skinCondition }] : []),
    ...(customer.healthNotes ? [{ label: t(lang, 'labelHealth'), value: customer.healthNotes }] : []),
  ];
  const nearestPackage = packageSummary.usable[0];

  return (
    <aside className="card profile" aria-live="polite" data-testid="memory-panel" data-customer-id={customer.id}>
      <div className="profile-cover">
        <small>Client memory</small>
        <p>{t(lang, 'memoryCover')}</p>
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
          <span className="tier" id="profile-tier">{props.tierLabel}</span>
        </div>

        <div className="tags" id="profile-tags">
          {[...customer.tags, ...customer.preferences].map((tag, index) => (
            <span key={`${tag}-${index}`} className={`tag${index >= customer.tags.length ? ' neutral' : ''}`}>
              {tag}
            </span>
          ))}
        </div>

        {/* 兩種同意分開管理（FR-011、FR-012） */}
        <div className="consent-grid">
          <div className="consent-row" data-testid="consent-marketing" data-status={customer.consent}>
            <span>
              {t(lang, 'consentMarketing')}{' '}
              <strong className={`status ${customer.consent === 'granted' ? 'ok' : 'soon'}`}>
                {t(lang, CONSENT_LABEL[customer.consent])}
              </strong>
            </span>
            {customer.consent === 'granted' ? (
              <button type="button" className="quiet" data-testid="marketing-revoke" onClick={() => props.onSetMarketingConsent('revoked')}>
                {t(lang, 'consentSetRevoked')}
              </button>
            ) : (
              <button type="button" className="quiet" data-testid="marketing-grant" onClick={() => props.onSetMarketingConsent('granted')}>
                {t(lang, 'consentSetGranted')}
              </button>
            )}
          </div>
          <div className="consent-row" data-testid="consent-sensitive" data-status={sensitiveConsent}>
            <span>
              {t(lang, 'consentSensitive')}{' '}
              <strong className={`status ${sensitiveConsent === 'granted' ? 'ok' : 'soon'}`}>
                {t(lang, CONSENT_LABEL[sensitiveConsent])}
              </strong>
            </span>
            {sensitiveConsent !== 'granted' ? (
              <button type="button" className="quiet" data-testid="sensitive-grant" onClick={props.onGrantSensitive}>
                {t(lang, 'consentSetGranted')}
              </button>
            ) : null}
          </div>
        </div>

        {/* S 級敏感資料：預設遮罩，需明確點擊才顯示 */}
        <section className="memory-section sensitive" data-testid="sensitive-block" aria-labelledby="sensitive-title">
          <div className="memory-section-head">
            <h3 id="sensitive-title">{t(lang, 'sensitiveTitle')}</h3>
            {!sensitiveHidden && sensitiveConsent === 'granted' ? (
              <button
                type="button"
                className="quiet"
                data-testid="sensitive-reveal"
                aria-pressed={revealed}
                onClick={() => setRevealed((v) => !v)}
              >
                {revealed ? t(lang, 'sensitiveHide') : t(lang, 'sensitiveReveal')}
              </button>
            ) : null}
          </div>
          {sensitiveHidden ? (
            <p className="memory-empty" data-testid="sensitive-no-permission">{t(lang, 'sensitiveNoPermission')}</p>
          ) : sensitiveConsent !== 'granted' ? (
            <p className="memory-empty" data-testid="sensitive-no-consent">{t(lang, 'sensitiveNoConsent')}</p>
          ) : (
            <>
              {sensitiveItems.length === 0 ? (
                <p className="memory-empty">{t(lang, 'sensitiveEmpty')}</p>
              ) : (
                <dl className="sensitive-list" data-testid="sensitive-content" data-revealed={revealed ? 'true' : 'false'}>
                  {sensitiveItems.map((item) => (
                    <div key={item.label}>
                      <dt>{item.label}</dt>
                      <dd>{revealed ? item.value : SENSITIVE_MASK}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {!revealed ? <p className="memory-hint">{t(lang, 'sensitiveMaskedHint')}</p> : null}
              {confirmRevoke ? (
                <div className="confirm-box" role="alert">
                  <p>{t(lang, 'sensitiveRevokeWarning')}</p>
                  <div className="confirm-actions">
                    <button type="button" className="button secondary" onClick={() => setConfirmRevoke(false)}>
                      {t(lang, 'cancelAction')}
                    </button>
                    <button
                      type="button"
                      className="button danger"
                      data-testid="sensitive-revoke-confirm"
                      onClick={() => {
                        setConfirmRevoke(false);
                        setRevealed(false);
                        props.onRevokeSensitive();
                      }}
                    >
                      {t(lang, 'sensitiveRevokeConfirm')}
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" className="quiet danger-text" data-testid="sensitive-revoke" onClick={() => setConfirmRevoke(true)}>
                  {t(lang, 'sensitiveRevokeAndClear')}
                </button>
              )}
            </>
          )}
        </section>

        <dl className="facts">
          <div className="fact">
            <dt>{t(lang, 'factLastVisit')}</dt>
            <dd id="profile-service">
              {lastTreatment ? (
                <>
                  {formatDate(lastTreatment.performedAt)} · {lastTreatment.serviceName}{' '}
                  <span>／ NT$ {lastTreatment.price.toLocaleString('en-US')}</span>
                </>
              ) : (
                '—'
              )}
            </dd>
          </div>
          <div className="fact">
            <dt>{t(lang, 'factWhyNow')}</dt>
            <dd id="profile-reason">{reasonText}</dd>
          </div>
          <div className="fact">
            <dt>{t(lang, 'factDesigner')}</dt>
            <dd id="profile-designer">
              {props.designerName ?? t(lang, 'fieldUnassigned')}
              {props.designerDescription ? <span> ／ {props.designerDescription}</span> : null}
            </dd>
          </div>
        </dl>

        {/* 套票剩餘堂數（併自 concierge） */}
        <section className="memory-section" data-testid="memory-package" aria-labelledby="package-title">
          <div className="memory-section-head">
            <h3 id="package-title">{t(lang, 'packageTitle')}</h3>
            {packageSummary.expiringSoon ? <span className="status soon">{t(lang, 'packageExpiringSoon')}</span> : null}
          </div>
          {nearestPackage ? (
            <>
              <p className="memory-value">
                <strong className="mono" data-testid="package-remaining">
                  {tf(lang, 'packageRemaining', { n: packageSummary.remainingSessions })}
                </strong>
              </p>
              <p className="memory-hint">
                {nearestPackage.name} · {nearestPackage.usedSessions}/{nearestPackage.totalSessions} ·{' '}
                {tf(lang, 'packageExpires', { date: nearestPackage.endDate })}
              </p>
              <div className="funnel-track" aria-hidden="true">
                <div
                  className="funnel-fill"
                  style={{ width: `${Math.round((remainingSessions(nearestPackage) / nearestPackage.totalSessions) * 100)}%` }}
                />
              </div>
            </>
          ) : (
            <p className="memory-empty" data-testid="package-remaining">{t(lang, 'packageNone')}</p>
          )}
        </section>

        {/* 下次預約（只記錄，不做排程） */}
        <section className="memory-section" data-testid="memory-appointment" aria-labelledby="appointment-title">
          <div className="memory-section-head">
            <h3 id="appointment-title">{t(lang, 'appointmentTitle')}</h3>
            {nextAppointment ? <span className="status ok">{t(lang, 'badgeBooked')}</span> : null}
          </div>
          {nextAppointment ? (
            <div className="memory-row">
              <strong className="mono" data-testid="appointment-next">
                {nextAppointment.date} {nextAppointment.time}
              </strong>
              <button
                type="button"
                className="quiet"
                data-testid="appointment-cancel"
                onClick={() => props.onCancelAppointment(nextAppointment.id)}
              >
                {t(lang, 'appointmentCancel')}
              </button>
            </div>
          ) : (
            <>
              <p className="memory-empty" data-testid="appointment-next">{t(lang, 'appointmentNone')}</p>
              <div className="inline-form">
                <label>
                  <span className="sr-only">{t(lang, 'appointmentDate')}</span>
                  <input
                    type="date"
                    data-testid="appointment-date"
                    value={apptDate}
                    min={props.today}
                    onChange={(event) => setApptDate(event.target.value)}
                  />
                </label>
                <label>
                  <span className="sr-only">{t(lang, 'appointmentTime')}</span>
                  <input
                    type="time"
                    data-testid="appointment-time"
                    value={apptTime}
                    onChange={(event) => setApptTime(event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="button secondary"
                  data-testid="appointment-add"
                  disabled={!apptDate || !apptTime}
                  onClick={() => props.onAddAppointment(apptDate, apptTime)}
                >
                  {t(lang, 'appointmentAdd')}
                </button>
              </div>
            </>
          )}
        </section>

        {/* Before/After 效果摘要（本機示意圖） */}
        <section className="memory-section" data-testid="memory-effect" aria-labelledby="effect-title">
          <div className="memory-section-head">
            <h3 id="effect-title">{t(lang, 'effectTitle')}</h3>
          </div>
          {sensitiveHidden ? (
            <p className="memory-empty">{t(lang, 'sensitiveNoPermission')}</p>
          ) : sensitiveConsent !== 'granted' ? (
            <p className="memory-empty">{t(lang, 'sensitiveNoConsent')}</p>
          ) : (
            <EffectSummary lang={lang} summary={props.effectSummary} revealed={revealed} />
          )}
        </section>

        {props.recentTreatments.length > 0 ? (
          <div className="timeline">
            {props.recentTreatments.map((tx) => (
              <div key={tx.id} className="timeline-item">
                <time className="mono">{formatDate(tx.performedAt)}</time>
                <p>
                  {tx.serviceName}
                  {tx.notes ? ` · ${tx.notes.slice(0, 38)}${tx.notes.length > 38 ? '…' : ''}` : ''}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="profile-actions">
          <BroadcastGuard consent={customer.consent} ready lang={lang}>
            <button type="button" className="button primary" data-testid="view-draft" onClick={props.onDraftToggle}>
              {props.draftOpen ? (lang === 'zh' ? '收起草稿' : 'Hide draft') : t(lang, 'viewDraft')}
            </button>
          </BroadcastGuard>
          <button
            type="button"
            className="button secondary"
            data-testid="mark-contacted"
            onClick={props.onMarkContacted}
            disabled={daysUntilRecall === undefined}
          >
            {props.contacted ? `✓ ${t(lang, 'badgeContacted')}` : t(lang, 'markContacted')}
          </button>
        </div>

        <div className="profile-admin">
          <button type="button" className="quiet" data-testid="edit-customer" onClick={props.onEdit}>
            {t(lang, 'editCustomer')}
          </button>
          {props.canDelete ? (
            confirmDelete ? (
              <div className="confirm-box" role="alert">
                <p>{t(lang, 'deleteCustomerWarning')}</p>
                <div className="confirm-actions">
                  <button type="button" className="button secondary" onClick={() => setConfirmDelete(false)}>
                    {t(lang, 'cancelAction')}
                  </button>
                  <button
                    type="button"
                    className="button danger"
                    data-testid="delete-customer-confirm"
                    onClick={() => {
                      setConfirmDelete(false);
                      props.onDelete();
                    }}
                  >
                    {t(lang, 'deleteCustomerConfirm')}
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="quiet danger-text" data-testid="delete-customer" onClick={() => setConfirmDelete(true)}>
                {t(lang, 'deleteCustomer')}
              </button>
            )
          ) : null}
        </div>
      </div>

      {customer.consent === 'granted' ? (
        <DraftComposer
          lang={lang}
          open={props.draftOpen}
          status={props.draftStatus}
          body={props.draftBody}
          onBodyChange={props.onDraftChange}
          onToggle={props.onDraftToggle}
          onApprove={props.onApproveDraft}
          onCopy={props.onCopyDraft}
          onDryRun={props.onDryRun}
        />
      ) : null}
    </aside>
  );
}
