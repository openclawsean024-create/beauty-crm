// Beauty CRM v0.4.0 — Avatar 元件
// 對齊 DESIGN §3.5
//
// size: sm | md | lg | xl
// fallback: 取 name[0] + hash 5 色輪

import type { CSSProperties } from 'react';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

const FALLBACK_COLORS = [
  '#F5E1D8', // accent-bg
  '#E5EBF0', // info-bg
  '#E8F1E5', // success-bg
  '#FBF1DC', // warning-bg
  '#F8DDD8', // danger-bg
];

const FALLBACK_TEXT_COLORS = [
  '#B85A45',
  '#5A7A8A',
  '#4A8A4A',
  '#C18A2A',
  '#B33A2A',
];

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  return h;
}

function fallbackStyle(name: string): { bg: string; fg: string } {
  const idx = hashName(name) % FALLBACK_COLORS.length;
  return { bg: FALLBACK_COLORS[idx]!, fg: FALLBACK_TEXT_COLORS[idx]! };
}

function sizeStyle(s: AvatarSize): CSSProperties {
  switch (s) {
    case 'sm':
      return { width: 24, height: 24, fontSize: 12 };
    case 'md':
      return { width: 32, height: 32, fontSize: 14 };
    case 'lg':
      return { width: 48, height: 48, fontSize: 18 };
    case 'xl':
      return { width: 80, height: 80, fontSize: 32 };
    default:
      return { width: 32, height: 32, fontSize: 14 };
  }
}

export interface AvatarProps {
  src?: string;
  name: string;
  size?: AvatarSize;
  alt?: string;
  className?: string;
}

export default function Avatar({ src, name, size = 'md', alt, className }: AvatarProps) {
  const sz = sizeStyle(size);
  const init = (name || '?').trim().charAt(0).toUpperCase() || '?';
  const colors = fallbackStyle(name || '?');

  if (src) {
    return (
      <img
        src={src}
        alt={alt ?? name}
        className={className}
        data-size={size}
        style={{
          ...sz,
          borderRadius: 'var(--radius-full)',
          objectFit: 'cover',
          display: 'block',
        }}
      />
    );
  }

  return (
    <span
      role="img"
      aria-label={alt ?? name}
      data-size={size}
      className={className}
      style={{
        ...sz,
        borderRadius: 'var(--radius-full)',
        background: colors.bg,
        color: colors.fg,
        fontWeight: 600,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,
        userSelect: 'none',
      }}
    >
      {init}
    </span>
  );
}
