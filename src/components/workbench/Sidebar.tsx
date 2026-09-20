// Beauty CRM — Sidebar + Topbar (含 mobile menu 觸發)
'use client';

interface SidebarProps {
  view: string;
  onChange: (next: string) => void;
  onMobileMenu: () => void;
}

const NAV = [
  { key: 'today', label: '今日工作台', icon: '⌂' },
  { key: 'customers', label: '客戶', icon: '♙' },
  { key: 'reminders', label: '回訪', icon: '◷' },
  { key: 'insights', label: '洞察', icon: '↗' },
];

export default function Sidebar({ view, onChange, onMobileMenu: _onMobileMenu }: SidebarProps) {
  return (
    <aside className="sidebar" aria-label="主導覽">
      <div className="brand">
        <div className="brand-mark">B</div>
        <div>
          <div className="brand-name">Beauty CRM</div>
          <div className="brand-sub">記得每一位客戶的下一步</div>
        </div>
      </div>
      <div className="nav-label">工作台</div>
      <nav className="nav">
        {NAV.map((item) => (
          <button
            key={item.key}
            type="button"
            className={view === item.key ? 'active' : ''}
            aria-current={view === item.key ? 'page' : undefined}
            onClick={() => onChange(item.key)}
          >
            <span className="nav-icon" aria-hidden="true">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
      <div className="nav-label" style={{ marginTop: 26 }}>管理</div>
      <nav className="nav">
        <button
          type="button"
          className={view === 'settings' ? 'active' : ''}
          aria-current={view === 'settings' ? 'page' : undefined}
          onClick={() => onChange('settings')}
        >
          <span className="nav-icon" aria-hidden="true">⚙</span>
          設定與資料
        </button>
      </nav>
      <div className="sidebar-bottom">
        <div className="profile">
          <div className="avatar">林</div>
          <div>
            <div className="profile-name">林心妍</div>
            <div className="profile-meta">設計師 · Pro 方案</div>
          </div>
        </div>
      </div>
      {/* Mobile menu trigger lives in topbar; sidebar stays hidden < 820px */}
      <span hidden aria-hidden="true" data-mobile-trigger="1" />
    </aside>
  );
}

export function Topbar({ crumb, onMobileMenu, onSearch }: { crumb: string; onMobileMenu: () => void; onSearch?: (q: string) => void }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="mobile-menu"
          aria-label="開啟選單"
          onClick={onMobileMenu}
        >
          ☰
        </button>
        <div className="crumb">
          <strong>{crumb.split(' / ')[0]}</strong>
          {crumb.includes(' / ') && <span>　/　{crumb.split(' / ')[1]}</span>}
        </div>
      </div>
      <div className="top-actions">
        <label className="search" aria-label="搜尋客戶">
          <span aria-hidden="true">⌕</span>
          <input
            placeholder="搜尋客戶、電話…"
            onChange={(e) => onSearch?.(e.target.value)}
          />
        </label>
        <button type="button" className="icon-btn" aria-label="通知">
          ♧<span className="dot" aria-hidden="true" />
        </button>
        <div className="avatar top-avatar" aria-hidden="true">林</div>
      </div>
    </header>
  );
}
