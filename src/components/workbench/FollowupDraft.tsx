// Beauty CRM — 回訪草稿 / 核准 / 同意閘門
// 對應 SPEC §3.4 AC-007 與 PRD/UI-SPEC §3.3。
// 重點: 草稿未核准前不會送出;consent 非 granted 時不出現「核准 / 送出」動作。

'use client';

import { useEffect, useState } from 'react';
import { approveDraft, resetDraft, type FollowupDraft } from '@/lib/followups';
import type { ConsentStatus } from '@/lib/customers';

interface Props {
  draft: FollowupDraft | null;
  consent: ConsentStatus;
  displayName: string;
  lastServiceName?: string;
  /** 成功訊息 (父層 toast) */
  onNotify: (message: string) => void;
}

export default function FollowupDraftSection({
  draft,
  consent,
  displayName,
  lastServiceName,
  onNotify,
}: Props) {
  // 父層 draft 變動時,重置 local 狀態(否則 useState 殘留舊的 draft.status)
  const [local, setLocal] = useState<FollowupDraft | null>(draft);
  useEffect(() => {
    setLocal(draft);
  }, [draft]);

  if (!local) {
    return null;
  }

  const canAct = consent === 'granted';
  const approved = local.status === 'approved';

  // 顯示文字
  const draftLabel =
    consent === 'pending'
      ? '需先取得同意'
      : consent === 'revoked'
        ? '客戶已撤回行銷同意'
        : '回訪草稿 · LINE';

  const statusBadge =
    consent !== 'granted'
      ? { label: '需先同意', tone: 'warn' as const }
      : approved
        ? { label: '已核准', tone: 'ok' as const }
        : { label: '待核准', tone: 'warn' as const };

  const handleApprove = () => {
    if (!canAct) return;
    const next = approveDraft(local);
    setLocal(next);
    onNotify('草稿已核准,尚未送出');
  };

  const handleReset = () => {
    const next = resetDraft(local);
    setLocal(next);
    onNotify('草稿已回到待核准狀態');
  };

  const handleCopy = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(local.body);
        onNotify('草稿已複製到剪貼簿');
      } else {
        onNotify('草稿已準備好,可手動複製');
      }
    } catch {
      onNotify('草稿已準備好,可手動複製');
    }
  };

  return (
    <section className="draft" aria-label="回訪草稿">
      <div className="draft-label">
        <span>{draftLabel}</span>
        <span className={`status ${statusBadge.tone === 'ok' ? 'ok' : 'pending'}`}>
          {statusBadge.label}
        </span>
      </div>
      <div className="draft-copy">{local.body}</div>
      <p className="draft-note">
        ⓘ{' '}
        {approved
          ? '已核准;下一步仍由你決定,不會自動發送。'
          : '這是草稿;按「核准」前,不會送出任何訊息。'}
      </p>
      <div className="draft-actions">
        <button
          type="button"
          className="approve"
          onClick={handleApprove}
          disabled={!canAct || approved}
          aria-label={`核准 ${displayName} 的回訪草稿`}
        >
          ✓ {approved ? '已核准' : '核准草稿'}
        </button>
        <button type="button" className="copy" onClick={handleCopy} aria-label="複製草稿內容">
          複製內容
        </button>
        {approved && (
          <button type="button" className="secondary" onClick={handleReset}>
            回到草稿
          </button>
        )}
        {!canAct && (
          <span className="status revoked" role="status">
            {!lastServiceName ? '需先取得同意' : '需先取得同意'}
          </span>
        )}
      </div>
    </section>
  );
}
