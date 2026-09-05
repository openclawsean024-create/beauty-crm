// Beauty CRM v0.4.0 — AppShell
// 包 Sidebar（desktop）+ Header + MobileBottomNav（mobile）+ MobileDrawer
//
// 對齊 DESIGN §2.2 / §2.3 / §2.4
//
// 使用方式：
//   import AppShell from '@/components/AppShell';
//   <AppShell>{children}</AppShell>
//
// 也提供 useResponsive 給 page 內用來偵測 viewport。

'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileBottomNav from './MobileBottomNav';
import MobileDrawer from './MobileDrawer';

export type ViewportMode = 'mobile' | 'tablet' | 'desktop';

export function getViewportMode(width: number): ViewportMode {
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

export function useResponsive(): { width: number; mode: ViewportMode; isClient: boolean } {
  const [width, setWidth] = useState<number>(1024); // SSR default desktop
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (typeof window === 'undefined') return;
    const update = () => setWidth(window.innerWidth);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return { width, mode: getViewportMode(width), isClient };
}

export interface AppShellProps {
  children: ReactNode;
  userName?: string;
  userRole?: string;
  dueCount?: number;
  birthdayCount?: number;
}

export default function AppShell({
  children,
  userName,
  userRole,
  dueCount,
  birthdayCount,
}: AppShellProps) {
  const { mode } = useResponsive();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // SSR 預設 desktop layout（避免 hydration mismatch）
  const showSidebar = mode === 'desktop';
  const showBottomNav = mode === 'mobile';
  const showMobileHeader = mode !== 'desktop';
  const showHamburger = mode !== 'desktop';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {showSidebar && <Sidebar userName={userName} userRole={userRole} />}

      <div
        style={{
          marginLeft: showSidebar ? 240 : 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Header
          userName={userName}
          dueCount={dueCount}
          birthdayCount={birthdayCount}
          onMenuClick={showHamburger ? () => setDrawerOpen(true) : undefined}
        />

        <main
          style={{
            flex: 1,
            padding: showSidebar ? 'var(--space-5) var(--space-6)' : 'var(--space-4)',
            paddingBottom: showBottomNav ? 80 : undefined,
            maxWidth: showSidebar ? 1200 : undefined,
            width: '100%',
            margin: showSidebar ? '0 auto' : undefined,
          }}
        >
          {children}
        </main>
      </div>

      {showBottomNav && <MobileBottomNav />}

      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        userName={userName}
        userRole={userRole}
      />
    </div>
  );
}
