// Beauty CRM v0.4.0 — Mobile Bottom Nav（5 個 tab，mobile only）
// 對齊 DESIGN §4.2

'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Icon, { type IconName } from './ui/Icon';

interface MobileNavItem {
  href: string;
  label: string;
  icon: IconName;
}

const ITEMS: MobileNavItem[] = [
  { href: '/dashboard', label: '首頁', icon: 'Home' },
  { href: '/customers', label: '客戶', icon: 'Users' },
  { href: '/reminders', label: '回訪', icon: 'Bell' },
  { href: '/broadcast', label: '推播', icon: 'Send' },
  { href: '/settings', label: '設定', icon: 'Settings' },
];

const NAV_STYLE: React.CSSProperties = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  height: 64,
  background: 'var(--bg-card)',
  borderTop: '1px solid var(--border-light)',
  display: 'flex',
  alignItems: 'stretch',
  zIndex: 'var(--z-sticky)' as unknown as number,
  paddingBottom: 'env(safe-area-inset-bottom)',
};

export default function MobileBottomNav() {
  const pathname = usePathname() || '/';

  return (
    <nav aria-label="行動主導覽" style={NAV_STYLE}>
      {ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            data-testid={`mobile-nav-${item.href.replace('/', '')}`}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              textDecoration: 'none',
              color: active ? 'var(--accent-primary)' : 'var(--text-muted)',
              fontSize: 11,
              fontWeight: active ? 600 : 500,
            }}
          >
            <span
              style={{
                width: 56,
                height: 32,
                borderRadius: 'var(--radius-md)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: active ? 'var(--sidebar-active-bg)' : 'transparent',
              }}
            >
              <Icon name={item.icon} size={20} />
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
