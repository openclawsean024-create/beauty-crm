// Beauty CRM v0.4.0 — Sidebar（desktop only）
// 對齊 DESIGN §2.5
//
// 240px 寬，position: fixed，含 logo、nav、user info

'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Icon, { type IconName } from './ui/Icon';
import Avatar from './ui/Avatar';

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: '首頁', icon: 'LayoutDashboard' },
  { href: '/customers', label: '客戶檔案', icon: 'Users' },
  { href: '/reminders', label: '回訪提醒', icon: 'BellRing' },
  { href: '/analytics', label: '消費分析', icon: 'TrendingUp' },
  { href: '/broadcast', label: '行銷推播', icon: 'Send' },
  { href: '/funnel', label: '回流漏斗', icon: 'Filter' },
  { href: '/settings', label: '設定', icon: 'Settings' },
];

const SIDEBAR_STYLE: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  bottom: 0,
  width: 240,
  background: 'var(--sidebar-bg)',
  borderRight: '1px solid var(--sidebar-border)',
  display: 'flex',
  flexDirection: 'column',
  zIndex: 'var(--z-sticky)' as unknown as number,
  fontFamily: 'var(--font-sans)',
};

export default function Sidebar({ userName = '林心妍', userRole = '設計師 · pro' }: { userName?: string; userRole?: string }) {
  const pathname = usePathname() || '/';

  return (
    <aside style={SIDEBAR_STYLE} aria-label="主導覽">
      <div
        style={{
          height: 72,
          padding: '0 var(--space-4)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderBottom: '1px solid var(--sidebar-border)',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'var(--accent-primary)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-inverse)',
            fontWeight: 700,
            fontSize: 16,
          }}
        >
          B
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
            Beauty CRM
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>v0.4.0</div>
        </div>
      </div>

      <nav style={{ padding: 'var(--space-3) var(--space-2)', flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              data-testid={`sidebar-link-${item.href.replace('/', '')}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                height: 44,
                padding: '0 12px',
                margin: '2px 0',
                borderRadius: 'var(--radius-md)',
                background: active ? 'var(--sidebar-active-bg)' : 'transparent',
                color: active ? 'var(--sidebar-active-text)' : 'var(--sidebar-text)',
                fontSize: 14,
                fontWeight: active ? 600 : 500,
                textDecoration: 'none',
                transition: 'background var(--duration-fast) var(--ease-standard)',
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = 'var(--sidebar-hover-bg)';
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = 'transparent';
              }}
            >
              <Icon name={item.icon} size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div
        style={{
          padding: 'var(--space-3) var(--space-4)',
          borderTop: '1px solid var(--sidebar-border)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Avatar name={userName} size="md" />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{userName}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{userRole}</div>
        </div>
      </div>
    </aside>
  );
}
