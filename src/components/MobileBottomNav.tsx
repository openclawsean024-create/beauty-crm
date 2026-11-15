'use client';

import { t, type Lang } from '@/lib/i18n';
import { TABS, type Tab } from './dashboard-types';

interface MobileBottomNavProps {
  activeTab: Tab;
  lang: Lang;
  onTabChange: (tab: Tab) => void;
}

export default function MobileBottomNav({ activeTab, lang, onTabChange }: MobileBottomNavProps) {
  return (
    <nav className="mobile-nav" aria-label="行動版主導覽">
      {TABS.map((entry) => (
        <button
          key={entry.id}
          type="button"
          className={activeTab === entry.id ? 'active' : ''}
          aria-current={activeTab === entry.id ? 'page' : undefined}
          data-mobile-nav={entry.id}
          onClick={() => onTabChange(entry.id)}
        >
          <span aria-hidden="true">{entry.icon}</span>
          <br />
          {t(lang, entry.labelKey)}
        </button>
      ))}
    </nav>
  );
}
