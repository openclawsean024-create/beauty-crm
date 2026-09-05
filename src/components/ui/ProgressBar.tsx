// Beauty CRM v0.4.0 — ProgressBar 元件
// 對齊 DESIGN §3.8
//
// variant: default | success | tier
// 視覺：高度 6px、圓角 full、底色 bg-secondary、fill accent-primary
// tier variant 用漸層

import type { CSSProperties } from 'react';

export type ProgressVariant = 'default' | 'success' | 'tier';

export interface ProgressBarProps {
  value: number;
  max?: number;
  variant?: ProgressVariant;
  showLabel?: boolean;
  ariaLabel?: string;
}

const trackStyle: CSSProperties = {
  position: 'relative',
  width: '100%',
  height: 6,
  borderRadius: 'var(--radius-full)',
  background: 'var(--bg-secondary)',
  overflow: 'hidden',
};

function fillStyle(variant: ProgressVariant, pct: number): CSSProperties {
  const base: CSSProperties = {
    height: '100%',
    width: `${Math.max(0, Math.min(100, pct))}%`,
    borderRadius: 'var(--radius-full)',
    transition: 'width var(--duration-base) var(--ease-standard)',
  };
  switch (variant) {
    case 'success':
      return { ...base, background: 'var(--success)' };
    case 'tier':
      return {
        ...base,
        background: 'linear-gradient(90deg, #E8C5A8, #B85A45)',
      };
    case 'default':
    default:
      return { ...base, background: 'var(--accent-primary)' };
  }
}

export default function ProgressBar({
  value,
  max = 100,
  variant = 'default',
  showLabel,
  ariaLabel,
}: ProgressBarProps) {
  const pct = max === 0 ? 0 : (value / max) * 100;
  const wrapper: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    width: '100%',
  };
  return (
    <div style={wrapper}>
      {showLabel && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 'var(--text-caption)',
            color: 'var(--text-secondary)',
          }}
        >
          <span>{ariaLabel ?? '進度'}</span>
          <span>{Math.round(pct)}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={ariaLabel}
        data-variant={variant}
        style={trackStyle}
      >
        <div style={fillStyle(variant, pct)} />
      </div>
    </div>
  );
}
