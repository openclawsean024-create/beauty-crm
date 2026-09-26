'use client';

import { TAB_LABELS, type Tab } from './dashboard-types';
import { t, type Lang } from '@/lib/i18n';
import type { Theme } from '@/lib/persistence';
import WorkspaceSwitcher from './WorkspaceSwitcher';

interface TopBarProps {
  activeTab: Tab;
  lang: Lang;
  theme: Theme;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchFocus?: () => void;
  onToggleLang: () => void;
  onToggleTheme: () => void;
  designerInitial: string;
}

export default function TopBar({
  activeTab,
  lang,
  theme,
  searchValue,
  onSearchChange,
  onSearchFocus,
  onToggleLang,
  onToggleTheme,
  designerInitial,
}: TopBarProps) {
  return (
    <header className="topbar">
      <div className="workspace-switcher">
        <WorkspaceSwitcher lang={lang} />
        <span style={{ color: 'var(--muted)', fontWeight: 500 }} aria-hidden="true">　/　{TAB_LABELS[activeTab]}</span>
      </div>

      <div className="top-actions">
        <label className="command">
          <span aria-hidden="true">⌕</span>
          <input
            id="global-search"
            type="search"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            onFocus={onSearchFocus}
            placeholder={t(lang, 'commandSearchPlaceholder')}
            aria-label={t(lang, 'searchAria')}
          />
          <span className="shortcut" aria-hidden="true">/</span>
        </label>

        <button
          type="button"
          className="top-button"
          id="lang-toggle"
          onClick={onToggleLang}
          aria-label="Switch language"
        >
          {t(lang, 'langToggle')}
        </button>
        <button
          type="button"
          className="top-button"
          id="theme-toggle"
          onClick={onToggleTheme}
          aria-label={t(lang, 'themeToggle')}
        >
          <span aria-hidden="true">{theme === 'dark' ? '☀' : '◐'}</span>
        </button>

        <div className="user-avatar" aria-hidden="true">{designerInitial}</div>
      </div>
    </header>
  );
}
