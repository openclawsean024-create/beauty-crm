// Beauty CRM v0.4.0 — Card 元件
// 對齊 DESIGN §3.1
//
// variant: default | image | stat
// - default: 標準白底卡片（border + shadow-sm）
// - image:   圖片卡（padding 0、overflow hidden、image 4:3 比例）
// - stat:    統計卡（padding-lg、文字置中）

import type { CSSProperties, MouseEventHandler, ReactNode } from 'react';

export type CardVariant = 'default' | 'image' | 'stat';

export interface CardProps {
  title?: string;
  subtitle?: string;
  variant?: CardVariant;
  onClick?: () => void;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** 測試用：加 data-testid */
  testId?: string;
}

const baseStyle: CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-light)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow-sm)',
  transition: 'box-shadow var(--duration-fast) var(--ease-standard)',
};

function variantStyle(variant: CardVariant): CSSProperties {
  switch (variant) {
    case 'image':
      return { padding: 0, overflow: 'hidden' };
    case 'stat':
      return { padding: 'var(--space-5)', textAlign: 'center' };
    case 'default':
    default:
      return { padding: 'var(--space-4)' };
  }
}

export default function Card({
  title,
  subtitle,
  variant = 'default',
  onClick,
  children,
  className,
  style,
  testId,
}: CardProps) {
  const isInteractive = Boolean(onClick);
  const composed: CSSProperties = {
    ...baseStyle,
    ...variantStyle(variant),
    cursor: isInteractive ? 'pointer' : undefined,
    ...style,
  };

  const handleClick: MouseEventHandler<HTMLDivElement> | undefined = onClick
    ? () => onClick()
    : undefined;

  const handleKeyDown = onClick
    ? (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }
    : undefined;

  return (
    <div
      data-variant={variant}
      data-testid={testId}
      className={className}
      style={composed}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick && typeof title === 'string' ? title : undefined}
      onMouseEnter={onClick ? (e) => (e.currentTarget.style.boxShadow = 'var(--shadow-md)') : undefined}
      onMouseLeave={onClick ? (e) => (e.currentTarget.style.boxShadow = 'var(--shadow-sm)') : undefined}
    >
      {title && (
        <h3
          style={{
            fontSize: 'var(--text-h3)',
            color: 'var(--text-primary)',
            fontWeight: 600,
            marginBottom: subtitle ? 4 : 8,
          }}
        >
          {title}
        </h3>
      )}
      {subtitle && (
        <p
          style={{
            fontSize: 'var(--text-caption)',
            color: 'var(--text-muted)',
            marginBottom: 8,
          }}
        >
          {subtitle}
        </p>
      )}
      {children}
    </div>
  );
}
