'use client';

import type { FollowupStatus } from '@/lib/followups';
import { t, type Lang, type MessageKey } from '@/lib/i18n';

interface DraftComposerProps {
  lang: Lang;
  open: boolean;
  status: FollowupStatus;
  body: string;
  onBodyChange: (value: string) => void;
  onToggle: () => void;
  onApprove: () => void;
  onCopy: () => void;
  onDryRun: () => void;
}

const STATUS_LABEL: Record<FollowupStatus, MessageKey> = {
  draft: 'draftStatusDraft',
  approved: 'draftStatusApproved',
  sent: 'draftStatusSent',
};

/**
 * 回訪草稿。
 * - 編輯會立即保存；已核准的草稿被改動後退回「草稿」，需重新核准。
 * - 「核准」不等於發送。M1 的 LINE 提醒只有 dry-run：產生訊息內容與收件者，
 *   寫入本機紀錄，不會真的送出任何訊息。
 */
export default function DraftComposer({
  lang,
  open,
  status,
  body,
  onBodyChange,
  onToggle,
  onApprove,
  onCopy,
  onDryRun,
}: DraftComposerProps) {
  return (
    <div className={`draft${open ? ' open' : ''}`} id="draft">
      <button type="button" className="draft-toggle" id="draft-toggle" onClick={onToggle} aria-expanded={open}>
        <span>
          <strong>{t(lang, 'draftTitle')}</strong>
          <br />
          <span>{t(lang, 'draftSubtitle')}</span>
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
        <div className="draft-note">
          <span className={`status ${status === 'draft' ? 'soon' : 'ok'}`} data-testid="draft-status" data-status={status}>
            {t(lang, STATUS_LABEL[status])}
          </span>{' '}
          {t(lang, 'draftNote')}
        </div>
        <div className="draft-actions">
          <button
            type="button"
            className="button primary"
            id="approve-draft"
            onClick={onApprove}
            disabled={status !== 'draft' || !body.trim()}
          >
            {t(lang, 'approve')}
          </button>
          <button type="button" className="button secondary" id="copy-draft" onClick={onCopy} disabled={!body.trim()}>
            {t(lang, 'copy')}
          </button>
        </div>
        <div className="draft-actions">
          <button
            type="button"
            className="button secondary"
            id="line-dry-run"
            data-testid="line-dry-run"
            onClick={onDryRun}
            disabled={status !== 'approved'}
          >
            {t(lang, 'lineDryRun')}
          </button>
        </div>
        <p className="draft-note">{t(lang, 'lineDryRunNote')}</p>
      </div>
    </div>
  );
}
