// Beauty CRM v0.4.0 — Badge 元件
// 對齊 DESIGN §3.4
//
// variant: default | success | warning | danger | info | accent
// size: sm | md

import type { CSSProperties, ReactNode } from 'react';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

function variantColors(v: BadgeVariant): { bg: string; fg: string } {
  switch (v) {
    case 'success':
      return { bg: 'var(--success-bg)', fg: 'var(--success)' };
    case 'warning':
      return { bg: 'var(--warning-bg)', fg: 'var(--warning)' };
    case 'danger':
      return { bg: 'var(--danger-bg)', fg: 'var(--danger)' };
    case 'info':
      return { bg: 'var(--info-bg)', fg: 'var(--info)' };
    case 'accent':
      return { bg: 'var(--accent-bg)', fg: 'var(--accent-primary)' };
    case 'default':
    default:
      return { bg: 'var(--bg-secondary)', fg: 'var(--text-secondary)' };
  }
}

function sizeStyle(s: BadgeSize): CSSProperties {
  if (s === 'sm') {
    return { height: 20, padding: '0 8px', fontSize: 11 };
  }
  return { height: 24, padding: '0 10px', fontSize: 12 };
}

export default function Badge({
  variant = 'default',
  size = 'md',
  children,
  className,
  style,
}: BadgeProps) {
  const colors = variantColors(variant);
  const composed: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: colors.bg,
    color: colors.fg,
    borderRadius: 'var(--radius-full)',
    fontWeight: 600,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    ...sizeStyle(size),
    ...style,
  };
  return (
    <span
      data-variant={variant}
      data-size={size}
      className={className}
      style={composed}
    >
      {children}
    </span>
  );
}
