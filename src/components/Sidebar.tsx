'use client';

import { type Tab } from './dashboard-types';

interface SidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  designerInitial: string;
}

const PRIMARY_ENTRIES: Array<{ id: Tab; label: string; icon: string }> = [
  { id: 'today', label: '今日', icon: '⌂' },
  { id: 'clients', label: '客戶', icon: '○' },
  { id: 'retention', label: '回訪', icon: '◷' },
  { id: 'insights', label: '洞察', icon: '↗' },
];

const SECONDARY_ENTRIES: Array<{ id: Tab; label: string; icon: string }> = [
  { id: 'settings', label: '設定', icon: '⚙' },
];

/**
 * v3 narrow icon rail (76px) — Ritual brand.
 * Replaces the v2 240px dark sidebar with a compact, icon-first nav.
 */
export default function Sidebar({
  activeTab,
  onTabChange,
  designerInitial,
}: SidebarProps) {
  return (
    <aside className="rail" aria-label="主導覽">
      <div className="logo" aria-label="Ritual">R.</div>

      <nav className="rail-nav" aria-label="主要工作區">
        {PRIMARY_ENTRIES.map((entry) => (
          <button
            key={entry.id}
            type="button"
            title={entry.label}
            aria-label={entry.label}
            aria-current={activeTab === entry.id ? 'page' : undefined}
            className={`rail-button${activeTab === entry.id ? ' active' : ''}`}
            data-nav={entry.id}
            onClick={() => onTabChange(entry.id)}
          >
            <span aria-hidden="true">{entry.icon}</span>
          </button>
        ))}
      </nav>

      <div className="rail-spacer" aria-hidden="true" />

      <nav className="rail-nav" aria-label="其他">
        {SECONDARY_ENTRIES.map((entry) => (
          <button
            key={entry.id}
            type="button"
            title={entry.label}
            aria-label={entry.label}
            aria-current={activeTab === entry.id ? 'page' : undefined}
            className={`rail-button${activeTab === entry.id ? ' active' : ''}`}
            data-nav={entry.id}
            onClick={() => onTabChange(entry.id)}
          >
            <span aria-hidden="true">{entry.icon}</span>
          </button>
        ))}
      </nav>

      <div className="rail-avatar" aria-label="設計師" style={{ marginTop: 12 }}>
        {designerInitial}
      </div>
    </aside>
  );
}
