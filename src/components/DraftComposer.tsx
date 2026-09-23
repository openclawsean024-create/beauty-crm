'use client';

interface DraftComposerProps {
  open: boolean;
  draftText: string;
  approved: boolean;
  onApprove: () => void;
  onCopy: () => void;
  onGenerate: () => void;
}

export default function DraftComposer({
  open,
  draftText,
  approved,
  onApprove,
  onCopy,
  onGenerate,
}: DraftComposerProps) {
  if (!open) {
    return (
      <div className="draft" aria-hidden="true" style={{ display: 'none' }}>
        <button type="button" className="ghost" onClick={onGenerate}>
          ＋ 展開回訪草稿
        </button>
      </div>
    );
  }

  return (
    <div className="draft" id="draft">
      <div className="draft-label">
        <span>回訪草稿 · LINE</span>
        <span
          className="status"
          style={{
            color: approved ? 'var(--success)' : 'var(--warning)',
            background: approved ? 'var(--success-soft)' : 'var(--warning-soft)',
          }}
        >
          {approved ? '已核准' : '待核准'}
        </span>
      </div>
      <div className="draft-copy">{draftText || '尚未產生草稿'}</div>
      <div className="draft-note">
        {approved
          ? 'ⓘ 已核准；下一步仍由你決定，不會自動發送。'
          : 'ⓘ 這是草稿；按「核准」前，不會送出任何訊息。'}
      </div>
      <div className="draft-actions">
        <button
          type="button"
          className="approve"
          onClick={onApprove}
          disabled={approved || !draftText}
        >
          ✓ 核准草稿
        </button>
        <button type="button" className="copy" onClick={onCopy} disabled={!draftText}>
          複製內容
        </button>
      </div>
    </div>
  );
}
