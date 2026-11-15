'use client';

import { useMemo, useState } from 'react';
import type { Appointment } from '@/lib/appointments';
import { buildMonthGrid, markMonthGrid, shiftMonth, type CalendarMark } from '@/lib/calendar';
import type { Customer } from '@/lib/customers';
import type { FollowupDraft } from '@/lib/followups';
import { t, type Lang, type MessageKey } from '@/lib/i18n';
import type { LineReminderErrorCode, LineSendRecord } from '@/lib/line-reminder';
import { buildRecipientList } from '@/lib/line-reminder';
import type { FunnelCounts, RecallQueueRow } from '@/lib/recall-queue';
import Funnel from './Funnel';

interface RetentionViewProps {
  lang: Lang;
  today: string;
  funnel: FunnelCounts;
  rows: RecallQueueRow[];
  customers: Customer[];
  appointments: Appointment[];
  drafts: FollowupDraft[];
  sendLog: LineSendRecord[];
}

const BLOCK_LABEL: Record<LineReminderErrorCode, MessageKey> = {
  DRAFT_NOT_APPROVED: 'errDraftNotApproved',
  CONSENT_REQUIRED: 'errConsentRequired',
};

const WEEKDAYS: Record<Lang, string[]> = {
  zh: ['日', '一', '二', '三', '四', '五', '六'],
  en: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
};

/**
 * 回訪分頁：漏斗、回訪／預約月曆（只顯示，不做排程）、
 * LINE dry-run 的收件清單與本機發送紀錄。
 */
export default function RetentionView({ lang, today, funnel, rows, customers, appointments, drafts, sendLog }: RetentionViewProps) {
  const [cursor, setCursor] = useState(() => {
    const [y, m] = today.split('-').map(Number) as [number, number];
    return { year: y, month: m - 1 };
  });

  const cells = useMemo(() => {
    const marks: CalendarMark[] = [
      ...rows.map((r) => ({ iso: r.suggestedRecallAt, kind: 'recall' as const })),
      ...appointments.filter((a) => a.status === 'upcoming').map((a) => ({ iso: a.date, kind: 'appointment' as const })),
    ];
    return markMonthGrid(buildMonthGrid(cursor.year, cursor.month), marks, today);
  }, [rows, appointments, cursor, today]);

  const recipients = useMemo(() => {
    const withDraft = customers.filter((c) => drafts.some((d) => d.customerId === c.id));
    return buildRecipientList(withDraft, drafts);
  }, [customers, drafts]);
  const nameOf = (id: string) => customers.find((c) => c.id === id)?.name ?? id;
  const log = [...sendLog].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="stack" data-testid="retention-view">
      <div className="bottom-grid" style={{ marginTop: 0 }}>
        <article className="card insight" aria-labelledby="calendar-title">
          <div className="insight-head">
            <div>
              <h2 id="calendar-title">{t(lang, 'calendarTitle')}</h2>
              <p className="insight-note">
                <span className="legend recall" aria-hidden="true" /> {t(lang, 'calendarLegendRecall')}{' '}
                <span className="legend appointment" aria-hidden="true" /> {t(lang, 'calendarLegendAppointment')}
              </p>
            </div>
            <div className="calendar-nav">
              <button
                type="button"
                className="top-button"
                aria-label={t(lang, 'calendarPrev')}
                onClick={() => setCursor((c) => shiftMonth(c.year, c.month, -1))}
              >
                ‹
              </button>
              <span className="mono" data-testid="calendar-month">
                {cursor.year}-{String(cursor.month + 1).padStart(2, '0')}
              </span>
              <button
                type="button"
                className="top-button"
                aria-label={t(lang, 'calendarNext')}
                onClick={() => setCursor((c) => shiftMonth(c.year, c.month, 1))}
              >
                ›
              </button>
            </div>
          </div>
          <div className="calendar" role="grid" aria-labelledby="calendar-title">
            {WEEKDAYS[lang].map((d, i) => (
              <div key={`${d}-${i}`} className="calendar-head" role="columnheader">{d}</div>
            ))}
            {cells.map((cell, i) => (
              <div
                key={cell.iso ?? `blank-${i}`}
                role="gridcell"
                className={`calendar-cell${cell.isToday ? ' today' : ''}${cell.date === null ? ' blank' : ''}`}
                data-date={cell.iso ?? undefined}
                data-recall={cell.recallCount}
                data-appointment={cell.appointmentCount}
              >
                {cell.date !== null ? (
                  <>
                    <span className="mono">{cell.date}</span>
                    <span className="calendar-marks" aria-hidden="true">
                      {cell.recallCount > 0 ? <i className="legend recall" /> : null}
                      {cell.appointmentCount > 0 ? <i className="legend appointment" /> : null}
                    </span>
                  </>
                ) : null}
              </div>
            ))}
          </div>
        </article>
        <Funnel lang={lang} counts={funnel} />
      </div>

      <div className="bottom-grid">
        <article className="card insight" aria-labelledby="send-log-title">
          <div className="insight-head">
            <div>
              <h2 id="send-log-title">{t(lang, 'sendLogTitle')}</h2>
              <p className="insight-note">{t(lang, 'lineDryRunNote')}</p>
            </div>
          </div>
          {log.length === 0 ? (
            <p className="empty-note" data-testid="send-log-empty">{t(lang, 'sendLogEmpty')}</p>
          ) : (
            <ul className="log-list" data-testid="send-log">
              {log.map((record) => (
                <li key={record.id} data-testid="send-log-item" data-customer-id={record.customerId}>
                  <div className="log-head">
                    <strong>{nameOf(record.customerId)}</strong>
                    <span className="status soon">{t(lang, 'sendLogStatus')}</span>
                  </div>
                  <p className="mono log-meta">
                    to: {record.payload.to} · {record.createdAt.slice(0, 16).replace('T', ' ')}
                  </p>
                  <p>{record.payload.messages[0]?.text}</p>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="card insight" aria-labelledby="recipients-title">
          <div className="insight-head">
            <div>
              <h2 id="recipients-title">{t(lang, 'recipientsTitle')}</h2>
            </div>
          </div>
          {recipients.ready.length === 0 && recipients.blocked.length === 0 ? (
            <p className="empty-note">{t(lang, 'recipientsNone')}</p>
          ) : (
            <ul className="log-list" data-testid="recipient-list">
              {recipients.ready.map((entry) => (
                <li key={entry.customerId} data-state="ready">
                  <div className="log-head">
                    <strong>{nameOf(entry.customerId)}</strong>
                    <span className="status ok">{t(lang, 'recipientsReady')}</span>
                  </div>
                  <p className="mono log-meta">to: {entry.to}</p>
                </li>
              ))}
              {recipients.blocked.map((entry) => (
                <li key={entry.customerId} data-state="blocked">
                  <div className="log-head">
                    <strong>{nameOf(entry.customerId)}</strong>
                    <span className="status overdue">{t(lang, 'recipientsBlocked')}</span>
                  </div>
                  <p className="log-meta">{t(lang, BLOCK_LABEL[entry.code])}</p>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>
    </div>
  );
}
