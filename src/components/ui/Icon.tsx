// Beauty CRM v0.4.0 — Icon 元件（inline SVG，抄自 Lucide MIT，無新 dep）
//
// 規格（DESIGN §3.11）：
// - viewBox="0 0 24 24"、stroke="currentColor"、fill="none"、
//   stroke-linecap="round"、stroke-linejoin="round"
// - 顏色 currentColor，stroke 1.5–2
// - IconName union type + ICONS: Record<IconName, string> 集中管理
//
// 路徑取自 https://lucide.dev icons（MIT License）
// 我們不用 lucide-react dep，直接 inline SVG path。

import type { SVGProps } from 'react';

export type IconName =
  | 'LayoutDashboard'
  | 'Users'
  | 'BellRing'
  | 'TrendingUp'
  | 'Send'
  | 'Filter'
  | 'Settings'
  | 'Home'
  | 'Bell'
  | 'ShieldCheck'
  | 'MessageSquare'
  | 'Plus'
  | 'Check'
  | 'X';

/**
 * Lucide MIT SVG paths（24×24 grid）。
 * 出處：https://lucide.dev（MIT License）。
 * 只收錄 v0.4.0 導覽需要的 14 個 icon；要新增時直接補 union + path 即可。
 */
export const ICONS: Record<IconName, string> = {
  LayoutDashboard:
    '<rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" />',
  Users:
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />',
  BellRing:
    '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /><path d="M4 2C2.8 3.7 2 5.7 2 8" /><path d="M20 2c1.2 1.7 2 3.7 2 6" />',
  TrendingUp:
    '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />',
  Send: '<path d="M22 2 11 13" /><path d="M22 2 15 22 11 13 2 9z" />',
  Filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />',
  Settings:
    '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" />',
  Home: '<path d="M3 9 12 2 21 9v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />',
  Bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />',
  ShieldCheck:
    '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" />',
  MessageSquare: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />',
  Plus: '<line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />',
  Check: '<polyline points="20 6 9 17 4 12" />',
  X: '<line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />',
};

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export default function Icon({
  name,
  size = 20,
  strokeWidth = 1.75,
  className,
  ...rest
}: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      data-icon={name}
      {...rest}
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
    />
  );
}
