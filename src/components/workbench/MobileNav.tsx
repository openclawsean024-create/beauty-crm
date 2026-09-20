// Beauty CRM — 行動版底部導覽 (mobile bottom nav)
// 對齊 PRD/UI-SPEC §5 Mobile < 768 規格。

'use client';

interface Props {
  view: string;
  onChange: (next: string) => void;
}

const TABS = [
  { key: 'today', label: '今日', icon: '⌂' },
  { key: 'customers', label: '客戶', icon: '♙' },
  { key: 'reminders', label: '回訪', icon: '◷' },
  { key: 'settings', label: '設定', icon: '⚙' },
];

export default function MobileNav({ view, onChange }: Props) {
  return (
    <nav className="mobile-nav" aria-label="行動版主導覽">
      {TABS.map((t) => (
        <button
          key={t.key}
          type="button"
          className={view === t.key ? 'active' : ''}
          aria-current={view === t.key ? 'page' : undefined}
          onClick={() => onChange(t.key)}
        >
          <span className="nav-icon" aria-hidden="true">{t.icon}</span>
          {t.label}
        </button>
      ))}
    </nav>
  );
}
