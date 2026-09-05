// Beauty CRM v0.4.0 — Button 元件
// 對齊 DESIGN §3.2
//
// variant: primary | secondary | ghost | danger | icon-only
// size: sm | md | lg

import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon-only';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  ariaLabel?: string;
  children?: ReactNode;
}

function getVariantStyle(variant: ButtonVariant): CSSProperties {
  switch (variant) {
    case 'primary':
      return {
        background: 'var(--accent-primary)',
        color: 'var(--text-inverse)',
        border: '1px solid var(--accent-primary)',
      };
    case 'secondary':
      return {
        background: 'var(--bg-card)',
        color: 'var(--text-secondary)',
        border: '1px solid var(--border-medium)',
      };
    case 'ghost':
      return {
        background: 'transparent',
        color: 'var(--text-secondary)',
        border: '1px solid transparent',
      };
    case 'danger':
      return {
        background: 'transparent',
        color: 'var(--danger)',
        border: '1px solid var(--danger)',
      };
    case 'icon-only':
      return {
        background: 'transparent',
        color: 'var(--text-secondary)',
        border: '1px solid transparent',
        padding: 'var(--space-1)',
        minWidth: 32,
        minHeight: 32,
        borderRadius: 'var(--radius-md)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      };
    default:
      return {};
  }
}

function getSizeStyle(size: ButtonSize): CSSProperties {
  switch (size) {
    case 'sm':
      return { height: 32, padding: '0 12px', fontSize: 13, borderRadius: 'var(--radius-md)' };
    case 'md':
      return { height: 40, padding: '0 16px', fontSize: 14, borderRadius: 'var(--radius-md)' };
    case 'lg':
      return { height: 48, padding: '0 20px', fontSize: 16, borderRadius: 'var(--radius-md)' };
    default:
      return {};
  }
}

export default function Button({
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  fullWidth,
  ariaLabel,
  children,
  style,
  type = 'button',
  className,
  ...rest
}: ButtonProps) {
  const composed: CSSProperties = {
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    fontFamily: 'inherit',
    fontWeight: 500,
    transition: 'all var(--duration-fast) var(--ease-standard)',
    width: fullWidth ? '100%' : undefined,
    ...getVariantStyle(variant),
    ...getSizeStyle(size),
    ...style,
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-busy={loading || undefined}
      data-variant={variant}
      data-size={size}
      data-loading={loading || undefined}
      data-fullwidth={fullWidth || undefined}
      className={className}
      style={composed}
      {...rest}
    >
      {loading ? '處理中…' : children}
    </button>
  );
}
