// Beauty CRM v0.4.0 — Skeleton 元件
// 對齊 DESIGN §3.10

import type { CSSProperties } from 'react';

export interface SkeletonProps {
  width?: string | number;
  height: string | number;
  radius?: string;
  count?: number;
  className?: string;
}

function toSize(v: string | number | undefined, fallback: string): string {
  if (v === undefined) return fallback;
  return typeof v === 'number' ? `${v}px` : v;
}

function SkeletonPiece({ width, height, radius, className }: { width?: string | number; height: string | number; radius?: string; className?: string }) {
  const style: CSSProperties = {
    display: 'block',
    width: toSize(width, '100%'),
    height: toSize(height, '12px'),
    borderRadius: radius ?? 'var(--radius-md)',
    background: 'var(--bg-secondary)',
    animation: 'skeleton-pulse 1.5s ease-in-out infinite',
  };
  return <span className={className} style={style} aria-hidden="true" />;
}

export default function Skeleton({ width, height, radius, count = 1, className }: SkeletonProps) {
  if (count <= 1) {
    return <SkeletonPiece width={width} height={height} radius={radius} className={className} />;
  }
  return (
    <span
      className={className}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonPiece key={i} width={width} height={height} radius={radius} />
      ))}
    </span>
  );
}
