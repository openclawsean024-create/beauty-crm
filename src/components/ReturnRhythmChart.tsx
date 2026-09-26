'use client';

import { t, type Lang } from '@/lib/i18n';

interface ReturnRhythmChartProps {
  lang: Lang;
  /** Last 8 weeks, oldest first. Values are 0-1 ratios. */
  values: number[];
}

/**
 * 8-week return-rhythm bar chart (UI-SPEC v1.1 §6, prototype §insight).
 * Pure SVG-free; CSS height-based bars keep DOM count low.
 * Last two bars (W-1, NOW) are highlighted; older weeks are dim.
 */
export default function ReturnRhythmChart({ lang, values }: ReturnRhythmChartProps) {
  const safe = (values.length === 8 ? values : [
    0.32, 0.45, 0.38, 0.54, 0.61, 0.70, 0.84, 1.0,
  ]).map((v) => Math.max(0, Math.min(1, v)));
  const labels = ['W-7', 'W-6', 'W-5', 'W-4', 'W-3', 'W-2', 'W-1', 'NOW'];
  const month = (() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const mon = d.toLocaleString(lang === 'zh' ? 'zh-Hant-TW' : 'en-US', { month: 'short' }).toUpperCase();
    return `${mon} ${yyyy}`;
  })();
  return (
    <article className="card insight">
      <div className="insight-head">
        <div>
          <h2>{t(lang, 'insightTitle')}</h2>
          <p className="insight-note">{t(lang, 'insightSubtitle')}</p>
        </div>
        <span className="mono" style={{ color: 'var(--muted)', fontSize: 10 }}>{month}</span>
      </div>
      <div className="bars" aria-label={t(lang, 'insightTitle')}>
        {safe.map((value, index) => (
          <div key={labels[index]} className="bar-wrap">
            <div
              className={`bar${index < safe.length - 2 ? ' dim' : ''}`}
              style={{ height: `${Math.max(8, value * 100)}%` }}
            />
            <span className="bar-label">{labels[index]}</span>
          </div>
        ))}
      </div>
    </article>
  );
}
