'use client';

import { t, type Lang } from '@/lib/i18n';
import type { FunnelCounts } from '@/lib/recall-queue';

interface FunnelProps {
  lang: Lang;
  counts: FunnelCounts;
}

/**
 * 回流漏斗：應回訪 → 已聯絡 → 已預約（FR-008）。
 * 數字來自 recall-queue.computeFunnel，由目前的回訪佇列、聯絡紀錄與預約計算。
 */
export default function Funnel({ lang, counts }: FunnelProps) {
  const base = Math.max(1, counts.due);
  const steps = [
    { id: 'due', label: t(lang, 'funnelDue'), count: counts.due, ratio: counts.due === 0 ? 0 : 1, tone: '' },
    { id: 'contacted', label: t(lang, 'funnelContacted'), count: counts.contacted, ratio: counts.contacted / base, tone: 'muted' },
    { id: 'booked', label: t(lang, 'funnelBooked'), count: counts.booked, ratio: counts.booked / base, tone: 'green' },
  ];
  return (
    <article className="card funnel" aria-labelledby="funnel-title" data-testid="funnel">
      <div className="insight-head">
        <div>
          <h2 id="funnel-title">{t(lang, 'funnelTitle')}</h2>
          <p className="insight-note">{t(lang, 'funnelSubtitle')}</p>
        </div>
      </div>
      {steps.map((step) => (
        <div key={step.id} className="funnel-row">
          <span className="funnel-label">{step.label}</span>
          <div className="funnel-track" aria-hidden="true">
            <div className={`funnel-fill ${step.tone}`} style={{ width: `${Math.round(Math.min(1, step.ratio) * 100)}%` }} />
          </div>
          <span className="funnel-number mono" data-testid={`funnel-${step.id}`}>{step.count}</span>
        </div>
      ))}
      <div className="funnel-foot">
        <span>
          {t(lang, 'funnelContactToBook')}
          <br />
          <strong className="mono" data-testid="funnel-contact-to-book">{counts.contactToBookPct}%</strong>
        </span>
        <span style={{ textAlign: 'right' }}>
          {t(lang, 'funnelOverall')}
          <br />
          <strong className="mono" data-testid="funnel-overall">{counts.overallPct}%</strong>
        </span>
      </div>
    </article>
  );
}
