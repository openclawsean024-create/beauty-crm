'use client';

import { t, type Lang } from '@/lib/i18n';

interface ReturnRhythmChartProps {
  lang: Lang;
  /** 最近 8 週（由舊到新）的 0–1 比例，由 kpi.weeklyRecallCounts 計算 */
  values: number[];
  /** 對應的原始筆數（顯示在 title 上） */
  counts?: number[];
}

/** 8 週回流節奏長條圖。純 CSS 高度，不使用圖表套件。 */
export default function ReturnRhythmChart({ lang, values, counts }: ReturnRhythmChartProps) {
  const safe = values.map((v) => Math.max(0, Math.min(1, v)));
  const labels = safe.map((_, index) => (index === safe.length - 1 ? 'NOW' : `W-${safe.length - 1 - index}`));
  return (
    <article className="card insight" data-testid="rhythm-chart">
      <div className="insight-head">
        <div>
          <h2>{t(lang, 'insightTitle')}</h2>
          <p className="insight-note">{t(lang, 'insightSubtitle')}</p>
        </div>
      </div>
      <div className="bars" aria-label={t(lang, 'insightTitle')}>
        {safe.map((value, index) => (
          <div key={labels[index]} className="bar-wrap" title={counts ? String(counts[index] ?? 0) : undefined}>
            <div
              className={`bar${index < safe.length - 2 ? ' dim' : ''}`}
              data-count={counts ? counts[index] ?? 0 : undefined}
              style={{ height: `${Math.max(4, value * 100)}%` }}
            />
            <span className="bar-label">{labels[index]}</span>
          </div>
        ))}
      </div>
    </article>
  );
}
