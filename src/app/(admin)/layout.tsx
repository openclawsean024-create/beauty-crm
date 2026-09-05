// v0.4.0：admin 區 layout，包 AppShell + AdminDataProvider
//
// 為什麼用 route group (admin)？
// - 7 個 admin page（dashboard/customers/.../settings）需要共用 state
// - route group 不影響 URL（/dashboard、/customers 仍各自獨立）
// - 集中包 AppShell + AdminDataProvider，page 內只用「內容」

import type { ReactNode } from 'react';
import AppShell from '@/components/AppShell';
import { AdminDataProvider } from '@/components/admin/AdminDataProvider';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminDataProvider>
      <AppShell>{children}</AppShell>
    </AdminDataProvider>
  );
}
