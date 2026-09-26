'use client';

import { t, type Lang } from '@/lib/i18n';
import { TAB_LABELS, type Tab } from './dashboard-types';

interface MobileBottomNavProps {
  activeTab: Tab;
  lang: Lang;
  onTabChange: (tab: Tab) => void;
}

const MOBILE_TABS: Array<{ id: Tab; icon: string }> = [
  { id: 'today', icon: '⌂' },
  { id: 'clients', icon: '○' },
  { id: 'retention', icon: '◷' },
  { id: 'insights', icon: '↗' },
];

const EN_LABELS: Record<Tab, string> = {
  today: 'Today',
  clients: 'Clients',
  retention: 'Retention',
  insights: 'Insights',
  settings: 'Settings',
};

export default function MobileBottomNav({ activeTab, lang, onTabChange }: MobileBottomNavProps) {
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
          <span aria-hidden="true">{entry.icon}</span>
          <br />
          {lang === 'zh' ? TAB_LABELS[entry.id] : (EN_LABELS[entry.id] ?? t(lang, 'showAll'))}
        </button>
      ))}
    </nav>
  );
}
