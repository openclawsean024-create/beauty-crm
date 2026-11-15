'use client';

import { t, type Lang } from '@/lib/i18n';
import { TABS, type Tab } from './dashboard-types';

interface SidebarProps {
  lang: Lang;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  userInitial: string;
}

/** 窄版圖示導覽列（76px）。 */
export default function Sidebar({ lang, activeTab, onTabChange, userInitial }: SidebarProps) {
  const primary = TABS.filter((entry) => entry.id !== 'settings');
  const secondary = TABS.filter((entry) => entry.id === 'settings');
  const renderButton = (entry: (typeof TABS)[number]) => (
    <button
      key={entry.id}
      type="button"
      title={t(lang, entry.labelKey)}
      aria-label={t(lang, entry.labelKey)}
      aria-current={activeTab === entry.id ? 'page' : undefined}
      className={`rail-button${activeTab === entry.id ? ' active' : ''}`}
      data-nav={entry.id}
      onClick={() => onTabChange(entry.id)}
    >
      <span aria-hidden="true">{entry.icon}</span>
    </button>
  );
  return (
    <aside className="rail" aria-label="主導覽">
      <div className="logo" aria-label="Ritual">R.</div>
      <nav className="rail-nav" aria-label="主要工作區">{primary.map(renderButton)}</nav>
      <div className="rail-spacer" aria-hidden="true" />
      <nav className="rail-nav" aria-label="其他">{secondary.map(renderButton)}</nav>
      <div className="rail-avatar" aria-hidden="true" style={{ marginTop: 12 }}>
        {userInitial}
      </div>
    </aside>
  );
}
