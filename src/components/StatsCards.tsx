'use client';

import { t, type Lang } from '@/lib/i18n';

interface StatsCardsProps {
  lang: Lang;
  followupsDue: number;
  overdueCount: number;
  upcomingCount: number;
  returnRatePct: number;
  returnRateDeltaPct: number;
  visitsThisMonth: number;
  visitsDeltaPct: number;
  serviceRevenue: number;
  revenueTargetPct: number;
}

interface StatItem {
  labelKey: 'metricFollowups' | 'metricReturn' | 'metricVisits' | 'metricRevenue';
  icon: string;
  value: string;
  note: React.ReactNode;
}

export default function StatsCards({
  lang,
  followupsDue,
  overdueCount,
  upcomingCount,
  returnRatePct,
  returnRateDeltaPct,
  visitsThisMonth,
  visitsDeltaPct,
  serviceRevenue,
  revenueTargetPct,
}: StatsCardsProps) {
  const revenueLabel = `NT$ ${Math.round(serviceRevenue / 1000).toLocaleString()}.${Math.round((serviceRevenue % 1000) / 100)}k`;

  const items: StatItem[] = [
    {
      labelKey: 'metricFollowups',
      icon: '◷',
      value: String(followupsDue),
      note: (
        <>
          <b>{overdueCount} overdue</b> · {upcomingCount} upcoming
        </>
      ),
    },
    {
      labelKey: 'metricReturn',
      icon: '↗',
      value: `${returnRatePct}%`,
      note: (
        <>
          <b>{returnRateDeltaPct >= 0 ? '+' : ''}{returnRateDeltaPct}%</b> vs last month
        </>
      ),
    },
    {
      labelKey: 'metricVisits',
      icon: '＋',
      value: String(visitsThisMonth),
      note: (
        <>
          <b>{visitsDeltaPct >= 0 ? '+' : ''}{visitsDeltaPct}%</b> vs last month
        </>
      ),
    },
    {
      labelKey: 'metricRevenue',
      icon: '$',
      value: revenueLabel,
      note: <>{revenueTargetPct}% of monthly target</>,
    },
  ];

  return (
    <section className="metrics" aria-label={t(lang, 'metricFollowups')}>
      {items.map((item) => (
        <article key={item.labelKey} className="metric">
          <div className="metric-top">
            <span>{t(lang, item.labelKey)}</span>
            <span className="metric-icon" aria-hidden="true">{item.icon}</span>
          </div>
          <div className="metric-value mono">{item.value}</div>
          <div className="metric-foot">{item.note}</div>
        </article>
      ))}
    </section>
  );
}
