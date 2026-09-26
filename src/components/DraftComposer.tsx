'use client';

import { t, type Lang } from '@/lib/i18n';

interface DraftComposerProps {
  lang: Lang;
  open: boolean;
  approved: boolean;
  body: string;
  onBodyChange: (value: string) => void;
  onToggle: () => void;
  onApprove: () => void;
  onCopy: () => void;
}

/**
 * In-card contact draft.
 * - Toggles open / collapsed; never auto-sends.
 * - Body is editable so the designer can refine before approving.
 * - Approve only marks "ready to send"; UI-SPEC v1.1 §3.3 makes this explicit
 *   ("Approve for sending"  ≠  "send automatically").
 */
export default function DraftComposer({
  lang,
  open,
  approved,
  body,
  onBodyChange,
  onToggle,
  onApprove,
  onCopy,
}: DraftComposerProps) {
  return (
    <div className={`draft${open ? ' open' : ''}`} id="draft">
      <button type="button" className="draft-toggle" id="draft-toggle" onClick={onToggle}>
        <span>
          <strong data-i18n="draftTitle">{t(lang, 'draftTitle')}</strong>
          <br />
          <span data-i18n="draftSubtitle">{t(lang, 'draftSubtitle')}</span>
        </span>
        <span id="draft-icon" aria-hidden="true">{open ? '−' : '＋'}</span>
      </button>
      <div className="draft-body">
        <textarea
          id="draft-copy"
          value={body}
          onChange={(event) => onBodyChange(event.target.value)}
          aria-label={t(lang, 'draftTitle')}
          rows={4}
        />
        <div className="draft-note" data-i18n="draftNote">
          {t(lang, 'draftNote')}
          {approved ? (
            <span style={{ marginLeft: 8, color: 'var(--mint-ink)' }}>
              {lang === 'zh' ? '（已標記為待發送）' : '(marked ready to send)'}
            </span>
          ) : null}
        </div>
        <div className="draft-actions">
          <button
            type="button"
            className="button primary"
            id="approve-draft"
            data-i18n="approve"
            onClick={onApprove}
            disabled={approved || !body.trim()}
          >
            {t(lang, 'approve')}
          </button>
          <button
            type="button"
            className="button secondary"
            id="copy-draft"
            data-i18n="copy"
            onClick={onCopy}
            disabled={!body.trim()}
          >
            {t(lang, 'copy')}
          </button>
        </div>
      </div>
    </div>
  );
}
