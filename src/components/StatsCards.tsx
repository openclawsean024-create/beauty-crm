'use client';

import { t, tf, type Lang } from '@/lib/i18n';
import type { KpiSummary } from '@/lib/kpi';

interface StatsCardsProps {
  lang: Lang;
  followupsDue: number;
  overdueCount: number;
  upcomingCount: number;
  kpis: KpiSummary;
}

function signed(value: number): string {
  return `${value >= 0 ? '+' : ''}${value}`;
}

/** KPI 卡片：四個數字全部由療程與回訪佇列計算，沒有寫死的展示數字。 */
export default function StatsCards({ lang, followupsDue, overdueCount, upcomingCount, kpis }: StatsCardsProps) {
  const noBaseline = t(lang, 'kpiNoBaseline');
  return (
    <section className="metrics" aria-label={t(lang, 'metricFollowups')}>
      <article className="metric">
        <div className="metric-top">
          <span>{t(lang, 'metricFollowups')}</span>
          <span className="metric-icon" aria-hidden="true">◷</span>
        </div>
        <div className="metric-value mono" data-testid="kpi-followups">{followupsDue}</div>
        <div className="metric-foot">
          <b>{tf(lang, 'kpiOverdue', { n: overdueCount })}</b> · {tf(lang, 'kpiUpcoming', { n: upcomingCount })}
        </div>
      </article>

      <article className="metric">
        <div className="metric-top">
          <span>{t(lang, 'metricReturn')}</span>
          <span className="metric-icon" aria-hidden="true">↗</span>
        </div>
        <div className="metric-value mono" data-testid="kpi-return">
          {kpis.returnRatePct === null ? '—' : `${kpis.returnRatePct}%`}
        </div>
        <div className="metric-foot" title={t(lang, 'kpiReturnNote')}>
          {kpis.returnRateDeltaPts === null ? (
            noBaseline
          ) : (
            <>
              <b>{signed(kpis.returnRateDeltaPts)} {t(lang, 'kpiPoints')}</b> {t(lang, 'kpiVsPrev30')}
            </>
          )}
        </div>
      </article>

      <article className="metric">
        <div className="metric-top">
          <span>{t(lang, 'metricVisits')}</span>
          <span className="metric-icon" aria-hidden="true">＋</span>
        </div>
        <div className="metric-value mono" data-testid="kpi-visits">{kpis.visitsThisMonth}</div>
        <div className="metric-foot">
          {kpis.visitsDeltaPct === null ? (
            noBaseline
          ) : (
            <>
              <b>{signed(kpis.visitsDeltaPct)}%</b> {t(lang, 'kpiVsLastMonth')}
            </>
          )}
        </div>
      </article>

      <article className="metric">
        <div className="metric-top">
          <span>{t(lang, 'metricRevenue')}</span>
          <span className="metric-icon" aria-hidden="true">$</span>
        </div>
        <div className="metric-value mono" data-testid="kpi-revenue">
          NT$ {kpis.revenueThisMonth.toLocaleString('en-US')}
        </div>
        <div className="metric-foot">
          {kpis.revenueDeltaPct === null ? (
            noBaseline
          ) : (
            <>
              <b>{signed(kpis.revenueDeltaPct)}%</b> {t(lang, 'kpiVsLastMonth')}
            </>
          )}
        </div>
      </article>
    </section>
  );
}
