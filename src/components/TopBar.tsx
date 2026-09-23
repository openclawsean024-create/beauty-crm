'use client';

import { TAB_LABELS, type Tab } from './dashboard-types';

interface TopBarProps {
  activeTab: Tab;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onMenuClick: () => void;
  designerInitial: string;
  notificationCount: number;
}

export default function TopBar({
  activeTab,
  searchValue,
  onSearchChange,
  onMenuClick,
  designerInitial,
  notificationCount,
}: TopBarProps) {
  const today = new Date();
  const dateLabel = `${today.getFullYear()} 年 ${today.getMonth() + 1} 月 ${today.getDate()} 日`;
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="mobile-menu"
          aria-label="開啟選單"
          onClick={onMenuClick}
        >
          ☰
        </button>
        <div className="crumb">
          <strong>{TAB_LABELS[activeTab]}</strong>
          <span>　/　{dateLabel}</span>
        </div>
      </div>
      <div className="top-actions">
        <label className="search" aria-label="搜尋客戶">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="搜尋客戶、電話…"
          />
        </label>
        <button type="button" className="icon-btn" aria-label={`通知 ${notificationCount} 則`}>
          <span aria-hidden="true">♧</span>
          {notificationCount > 0 ? <span className="dot" aria-hidden="true" /> : null}
        </button>
        <div className="avatar top-avatar" aria-hidden="true">{designerInitial}</div>
      </div>
    </header>
  );
}
