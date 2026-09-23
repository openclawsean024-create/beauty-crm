'use client';

import type { Tab } from './dashboard-types';

interface SidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  designerName: string;
  designerInitial: string;
}

const WORKSPACE_ENTRIES: Array<{ id: Tab; label: string; icon: string }> = [
  { id: 'today', label: '今日工作台', icon: '⌂' },
  { id: 'customers', label: '客戶', icon: '♙' },
  { id: 'reminders', label: '回訪', icon: '◷' },
  { id: 'insights', label: '洞察', icon: '↗' },
];

const ADMIN_ENTRIES: Array<{ id: Tab; label: string; icon: string }> = [
  { id: 'settings', label: '設定與資料', icon: '⚙' },
];

export default function Sidebar({
  activeTab,
  onTabChange,
  designerName,
  designerInitial,
}: SidebarProps) {
  return (
    <aside className="sidebar" aria-label="主導覽">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">B</div>
        <div>
          <div className="brand-name">Beauty CRM</div>
          <div className="brand-sub">記得每一位客戶的下一步</div>
        </div>
      </div>

      <div className="nav-label">工作台</div>
      <nav className="nav">
        {WORKSPACE_ENTRIES.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={activeTab === entry.id ? 'active' : ''}
            aria-current={activeTab === entry.id ? 'page' : undefined}
            onClick={() => onTabChange(entry.id)}
          >
            <span className="nav-icon" aria-hidden="true">{entry.icon}</span>
            {entry.label}
          </button>
        ))}
      </nav>

      <div className="nav-label" style={{ marginTop: 26 }}>管理</div>
      <nav className="nav">
        {ADMIN_ENTRIES.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={activeTab === entry.id ? 'active' : ''}
            aria-current={activeTab === entry.id ? 'page' : undefined}
            onClick={() => onTabChange(entry.id)}
          >
            <span className="nav-icon" aria-hidden="true">{entry.icon}</span>
            {entry.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="profile">
          <div className="avatar" aria-hidden="true">{designerInitial}</div>
          <div>
            <div className="profile-name">{designerName}</div>
            <div className="profile-meta">設計師 · Pro 方案</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
