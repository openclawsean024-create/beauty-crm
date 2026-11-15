'use client';

import { useId } from 'react';
import type { EffectSummary as EffectSummaryData, SkinMetrics } from '@/lib/effects';
import { radarAxes } from '@/lib/effects';
import { t, tf, type Lang, type MessageKey } from '@/lib/i18n';
import { SENSITIVE_MASK } from '@/lib/sensitive';

interface EffectSummaryProps {
  lang: Lang;
  summary: EffectSummaryData | undefined;
  /** S 級內容是否已由使用者明確點擊顯示 */
  revealed: boolean;
}

const METRIC_LABEL: Record<keyof SkinMetrics, MessageKey> = {
  hydration: 'metricHydration',
  pores: 'metricPores',
  evenness: 'metricEvenness',
  smoothness: 'metricSmoothness',
};

/**
 * 本機示意圖：純幾何圖形的內嵌 SVG，不是照片，也不載入任何圖片檔或遠端資源。
 */
function PlaceholderTile({ label, tone, alt }: { label: string; tone: 'before' | 'after'; alt: string }) {
  const id = useId();
  return (
    <figure className="effect-tile" data-testid={`effect-placeholder-${tone}`}>
      <svg viewBox="0 0 120 90" role="img" aria-label={`${alt} · ${label}`}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={tone === 'before' ? 'var(--line)' : 'var(--blue-soft)'} />
            <stop offset="1" stopColor={tone === 'before' ? 'var(--surface-2)' : 'var(--mint)'} />
          </linearGradient>
        </defs>
        <rect width="120" height="90" rx="8" fill={`url(#${id})`} />
        <circle cx="60" cy="40" r="20" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeDasharray="4 4" />
        <path d="M22 76h76" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 5" />
      </svg>
      <figcaption>{label}</figcaption>
    </figure>
  );
}

function Radar({ lang, metrics }: { lang: Lang; metrics: SkinMetrics }) {
  const cx = 60;
  const cy = 60;
  const radius = 44;
  const axes = radarAxes(metrics, cx, cy, radius);
  const outline = radarAxes({ hydration: 100, pores: 0, evenness: 100, smoothness: 100 }, cx, cy, radius);
  const points = (list: typeof axes) => list.map((a) => `${a.x},${a.y}`).join(' ');
  return (
    <svg viewBox="0 0 120 120" className="effect-radar" role="img" aria-label={t(lang, 'effectChange')}>
      <polygon points={points(outline)} fill="none" stroke="var(--line-strong)" strokeWidth="1" />
      {outline.map((a) => (
        <line key={a.key} x1={cx} y1={cy} x2={a.x} y2={a.y} stroke="var(--line)" strokeWidth="1" />
      ))}
      <polygon points={points(axes)} fill="color-mix(in srgb, var(--blue) 22%, transparent)" stroke="var(--blue)" strokeWidth="1.5" />
    </svg>
  );
}

function signed(value: number): string {
  return `${value > 0 ? '+' : ''}${value}`;
}

/**
 * Before/After 效果摘要（S 級）。示意圖永遠可見；指標數字預設遮罩，
 * 需要使用者在敏感資料區塊明確點「顯示」才出現。
 * 文案只描述「店內紀錄的指標變化」，不做任何效果或療效宣稱。
 */
export default function EffectSummary({ lang, summary, revealed }: EffectSummaryProps) {
  if (!summary) {
    return <p className="memory-empty">{t(lang, 'effectNone')}</p>;
  }
  const improvement = summary.improvement;
  const latestMetrics = summary.latest.metrics;
  return (
    <div className="effect-summary">
      <div className="effect-tiles">
        <PlaceholderTile tone="before" label={t(lang, 'effectBefore')} alt={t(lang, 'effectPlaceholderAlt')} />
        <PlaceholderTile tone="after" label={t(lang, 'effectLatest')} alt={t(lang, 'effectPlaceholderAlt')} />
      </div>
      <div className="effect-meta">
        <span data-testid="effect-count">{tf(lang, 'effectCount', { n: summary.count })}</span>
        {improvement ? (
          <span>
            {t(lang, 'effectChange')}{' '}
            <strong className="mono" data-testid="effect-change">
              {revealed ? signed(improvement.overall) : SENSITIVE_MASK}
            </strong>
          </span>
        ) : null}
      </div>
      {revealed && improvement && latestMetrics ? (
        <div className="effect-detail" data-testid="effect-detail">
          <Radar lang={lang} metrics={latestMetrics} />
          <dl>
            {(Object.keys(METRIC_LABEL) as Array<keyof SkinMetrics>).map((key) => (
              <div key={key}>
                <dt>{t(lang, METRIC_LABEL[key])}</dt>
                <dd className="mono">{signed(improvement[key])}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
      <p className="effect-disclaimer">{t(lang, 'effectDisclaimer')}</p>
    </div>
  );
}
