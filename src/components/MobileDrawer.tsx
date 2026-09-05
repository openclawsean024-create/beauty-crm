// Beauty CRM v0.4.0 — Mobile Drawer（漢堡點開，從左滑入）
// 對齊 DESIGN §2.4

'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect } from 'react';
import Icon, { type IconName } from './ui/Icon';
import Avatar from './ui/Avatar';

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

const ITEMS: NavItem[] = [
  { href: '/dashboard', label: '首頁', icon: 'LayoutDashboard' },
  { href: '/customers', label: '客戶檔案', icon: 'Users' },
  { href: '/reminders', label: '回訪提醒', icon: 'BellRing' },
  { href: '/analytics', label: '消費分析', icon: 'TrendingUp' },
  { href: '/broadcast', label: '行銷推播', icon: 'Send' },
  { href: '/funnel', label: '回流漏斗', icon: 'Filter' },
  { href: '/settings', label: '設定', icon: 'Settings' },
];

export interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  userName?: string;
  userRole?: string;
}

const BACKDROP_STYLE: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'var(--bg-overlay)',
  zIndex: 'var(--z-modal-backdrop)' as unknown as number,
  animation: 'fadeIn var(--duration-base) var(--ease-standard)',
};

const PANEL_STYLE: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  bottom: 0,
  width: 280,
  background: 'var(--bg-card)',
  zIndex: 'var(--z-modal)' as unknown as number,
  display: 'flex',
  flexDirection: 'column',
  boxShadow: 'var(--shadow-lg)',
  animation: 'slideInLeft var(--duration-base) var(--ease-standard)',
};

export default function MobileDrawer({ open, onClose, userName = '林心妍', userRole = '設計師 · pro' }: MobileDrawerProps) {
  const pathname = usePathname() || '/';

  // ESC 關閉
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', onKey);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', onKey);
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div aria-hidden="true" onClick={onClose} style={BACKDROP_STYLE} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="主導覽"
        style={PANEL_STYLE}
      >
        <div
          style={{
            padding: 'var(--space-4)',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar name={userName} size="md" />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{userName}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{userRole}</div>
            </div>
          </div>
          <button
            type="button"
            aria-label="關閉主導覽"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 8,
              cursor: 'pointer',
              color: 'var(--text-muted)',
            }}
          >
            <Icon name="X" size={20} />
          </button>
        </div>

        <nav style={{ padding: 'var(--space-3) var(--space-2)', flex: 1 }}>
          {ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                onClick={onClose}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  height: 44,
                  padding: '0 12px',
                  margin: '2px 0',
                  borderRadius: 'var(--radius-md)',
                  background: active ? 'var(--sidebar-active-bg)' : 'transparent',
                  color: active ? 'var(--sidebar-active-text)' : 'var(--text-primary)',
                  fontSize: 14,
                  fontWeight: active ? 600 : 500,
                  textDecoration: 'none',
                }}
              >
                <Icon name={item.icon} size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
