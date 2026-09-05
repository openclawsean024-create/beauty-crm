// Beauty CRM v0.4.0 — Header（desktop 64 / mobile 56）
// 對齊 DESIGN §2.6

'use client';

import Icon from './ui/Icon';
import Avatar from './ui/Avatar';

export interface HeaderProps {
  userName?: string;
  /** 「今日待回訪」客戶數 */
  dueCount?: number;
  /** 「本月壽星」數 */
  birthdayCount?: number;
  /** mobile only：漢堡按鈕 callback */
  onMenuClick?: () => void;
  /** mobile only：通知按鈕 callback */
  onNotificationsClick?: () => void;
}

export default function Header({
  userName = '林心妍',
  dueCount = 0,
  birthdayCount = 0,
  onMenuClick,
  onNotificationsClick,
}: HeaderProps) {
  return (
    <header
      role="banner"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 'var(--z-sticky)' as unknown as number,
        background: 'var(--bg-primary)',
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--space-5)',
        borderBottom: '1px solid var(--border-light)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {onMenuClick && (
          <button
            type="button"
            aria-label="開啟主導覽"
            onClick={onMenuClick}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 8,
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <Icon name="Filter" size={20} />
          </button>
        )}
        <div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>早安，{userName}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            今日有 {dueCount} 位客戶待回訪 · {birthdayCount} 位本月壽星
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {onNotificationsClick && (
          <button
            type="button"
            aria-label="通知"
            onClick={onNotificationsClick}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 8,
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-md)',
              position: 'relative',
            }}
          >
            <Icon name="Bell" size={20} />
            {dueCount > 0 && (
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  width: 8,
                  height: 8,
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--accent-primary)',
                }}
              />
            )}
          </button>
        )}
        <Avatar name={userName} size="md" />
      </div>
    </header>
  );
}
