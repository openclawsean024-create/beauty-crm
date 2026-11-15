'use client';

import type { Account, Store } from '@/lib/accounts';
import { t, type Lang } from '@/lib/i18n';
import type { Theme } from '@/lib/persistence';
import SessionSwitcher from './SessionSwitcher';

interface TopBarProps {
  lang: Lang;
  theme: Theme;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onToggleLang: () => void;
  onToggleTheme: () => void;
  accounts: Account[];
  stores: Store[];
  accountId: string;
  storeId: string;
  onAccountChange: (accountId: string) => void;
  onStoreChange: (storeId: string) => void;
  userInitial: string;
}

export default function TopBar({
  lang,
  theme,
  searchValue,
  onSearchChange,
  onToggleLang,
  onToggleTheme,
  accounts,
  stores,
  accountId,
  storeId,
  onAccountChange,
  onStoreChange,
  userInitial,
}: TopBarProps) {
  return (
    <header className="topbar">
      <SessionSwitcher
        lang={lang}
        accounts={accounts}
        stores={stores}
        accountId={accountId}
        storeId={storeId}
        onAccountChange={onAccountChange}
        onStoreChange={onStoreChange}
      />

      <div className="top-actions">
        <label className="command">
          <span aria-hidden="true">⌕</span>
          <input
            id="global-search"
            type="search"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
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

        <div className="user-avatar" aria-hidden="true">{userInitial}</div>
      </div>
    </header>
  );
}
