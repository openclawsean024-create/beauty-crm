'use client';

interface StatsCardsProps {
  pendingTotal: number;
  overdueCount: number;
  withinThreeDays: number;
  bookedCount: number;
  monthRevenue: number;
  monthRevenueDeltaPct: number;
  bookedRatePct: number;
}

interface StatItem {
  label: string;
  icon: string;
  value: string;
  note: React.ReactNode;
}

export default function StatsCards({
  pendingTotal,
  overdueCount,
  withinThreeDays,
  bookedCount,
  monthRevenue,
  monthRevenueDeltaPct,
  bookedRatePct,
}: StatsCardsProps) {
  const items: StatItem[] = [
    {
      label: '待回訪',
      icon: '◷',
      value: String(pendingTotal),
      note: (
        <>
          <b>{overdueCount} 位逾期</b> · {Math.max(pendingTotal - overdueCount, withinThreeDays)} 位即將到期
        </>
      ),
    },
    {
      label: '3 天內',
      icon: '✓',
      value: String(withinThreeDays),
      note: <>即將到期 · <b>{bookedRatePct}%</b> 已預約</>,
    },
    {
      label: '已預約',
      icon: '▣',
      value: String(bookedCount),
      note: <>本月回流 <b>{bookedRatePct}%</b></>,
    },
    {
      label: '本月營收',
      icon: '$',
      value: monthRevenue.toLocaleString(),
      note: (
        <>
          較上月 <b>{monthRevenueDeltaPct >= 0 ? '+' : ''}{monthRevenueDeltaPct}%</b>
        </>
      ),
    },
  ];

  return (
    <section className="stats" aria-label="今日摘要">
      {items.map((item) => (
        <div key={item.label} className="stat">
          <div className="stat-top">
            <span>{item.label}</span>
            <span className="stat-icon" aria-hidden="true">{item.icon}</span>
          </div>
          <div className="stat-value">{item.value}</div>
          <div className="stat-note">{item.note}</div>
        </div>
      ))}
    </section>
  );
}
