'use client';

import { TAB_LABELS, type Tab } from './dashboard-types';

interface MobileBottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const MOBILE_TABS: Array<{ id: Tab; icon: string }> = [
  { id: 'today', icon: '⌂' },
  { id: 'customers', icon: '♙' },
  { id: 'reminders', icon: '◷' },
  { id: 'settings', icon: '⚙' },
];

export default function MobileBottomNav({ activeTab, onTabChange }: MobileBottomNavProps) {
  return (
    <nav className="mobile-nav" aria-label="行動版主導覽">
      {MOBILE_TABS.map((entry) => (
        <button
          key={entry.id}
          type="button"
          className={activeTab === entry.id ? 'active' : ''}
          aria-current={activeTab === entry.id ? 'page' : undefined}
          onClick={() => onTabChange(entry.id)}
        >
          <span className="nav-icon" aria-hidden="true">{entry.icon}</span>
          {TAB_LABELS[entry.id]}
        </button>
      ))}
    </nav>
  );
}
