// v0.4.0 /settings — 設定頁（新）
// 對齊 DESIGN §5.7
// - 資料管理（加密匯出 / 還原 / 刪除）
// - 裝置共用警告（toggle）
// - 方案（升級 CTA）
// - 隱私 / 條款 / 聯絡 link
// - 版本

'use client';

import Link from 'next/link';
import { useAdminData } from '@/components/admin/AdminDataProvider';
import { useAdminHandlers } from '@/components/admin/useAdminHandlers';
import { EXPORT_FILE_EXTENSION } from '@/lib/export';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Icon from '@/components/ui/Icon';

export default function SettingsPage() {
  const data = useAdminData();
  const { handleExport, handleImport, handlePurge } = useAdminHandlers();

  if (!data.hydrated) return <div style={{ padding: 24 }}>載入中…</div>;

  return (
    <div>
      <header style={{ marginBottom: 'var(--space-4)' }}>
        <h1 style={{ fontSize: 'var(--text-h1)', color: 'var(--text-primary)', margin: 0 }}>設定</h1>
        <p style={{ color: 'var(--text-secondary)' }}>資料管理、裝置安全、方案升級</p>
      </header>

      <Card title="資料管理" subtitle="加密匯出 / 還原 / 刪除">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Button variant="primary" onClick={handleExport} fullWidth>
            加密匯出備份
          </Button>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => {
              if (typeof document === 'undefined') return;
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = EXPORT_FILE_EXTENSION;
              input.onchange = (e) => {
                const f = (e.target as HTMLInputElement).files?.[0];
                if (f) handleImport(f);
              };
              input.click();
            }}
          >
            還原備份
          </Button>
          <Button variant="danger" fullWidth onClick={handlePurge}>
            刪除所有資料
          </Button>
        </div>
      </Card>

      <div style={{ marginTop: 'var(--space-3)' }}>
        <Card title="裝置共用警告" subtitle="離開座位前請上鎖 / 登出">
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              padding: 8,
              background: data.deviceShared ? 'var(--warning-bg)' : 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <input
              type="checkbox"
              checked={data.deviceShared}
              onChange={(e) => {
                data.setDeviceShared(e.target.checked);
                if (typeof window !== 'undefined') {
                  window.localStorage.setItem('device.shared', String(e.target.checked));
                }
              }}
            />
            <span style={{ color: 'var(--text-primary)' }}>
              {data.deviceShared ? '顯示裝置共用警告（建議）' : '已關閉警告'}
            </span>
          </label>
        </Card>
      </div>

      <div style={{ marginTop: 'var(--space-3)' }}>
        <Card title="方案" subtitle="目前：免費版（50 位客戶 / 30 次服務）">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <Badge variant="accent">FREE</Badge>
            <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-caption)' }}>
              NT$ 0 / 月
            </span>
          </div>
          <Link href="/pricing" style={{ display: 'block' }}>
            <Button variant="primary" fullWidth>
              升級方案 →
            </Button>
          </Link>
        </Card>
      </div>

      <div style={{ marginTop: 'var(--space-3)' }}>
        <Card title="法務 / 聯絡">
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            <li style={{ padding: '8px 0', borderTop: '1px solid var(--border-light)' }}>
              <Link href="/privacy" style={{ color: 'var(--text-link)' }}>
                隱私權聲明
              </Link>
            </li>
            <li style={{ padding: '8px 0', borderTop: '1px solid var(--border-light)' }}>
              <Link href="/terms" style={{ color: 'var(--text-link)' }}>
                使用條款
              </Link>
            </li>
            <li style={{ padding: '8px 0', borderTop: '1px solid var(--border-light)' }}>
              <Link href="/contact" style={{ color: 'var(--text-link)' }}>
                聯絡我們
              </Link>
            </li>
          </ul>
        </Card>
      </div>

      <div
        style={{
          marginTop: 'var(--space-5)',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: 'var(--text-caption)',
        }}
      >
        <Icon name="ShieldCheck" size={20} />
        <div>Beauty CRM v0.4.0</div>
        <div>v1 單店單裝置，資料只留在你的裝置</div>
      </div>
    </div>
  );
}
