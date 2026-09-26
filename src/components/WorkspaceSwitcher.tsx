'use client';

import { t, type Lang } from '@/lib/i18n';

interface WorkspaceSwitcherProps {
  lang: Lang;
}

/**
 * Static "Atelier M · personal studio" workspace indicator (prototype scope).
 * The prototype reserves the switcher dropdown for a future multi-tenant
 * build; v1 just exposes a click handler that surfaces a toast.
 */
export default function WorkspaceSwitcher({ lang }: WorkspaceSwitcherProps) {
  return (
    <button
      type="button"
      className="workspace-switcher"
      aria-label={t(lang, 'workspaceSwitcherAria')}
      style={{ background: 'transparent' }}
    >
      <span className="workspace-dot" aria-hidden="true" />
      <span>
        {t(lang, 'workspaceLabel')}
        <small>{t(lang, 'workspaceSubLabel')}</small>
      </span>
      <span aria-hidden="true" style={{ color: 'var(--muted)', fontSize: 12 }}>⌄</span>
    </button>
  );
}
