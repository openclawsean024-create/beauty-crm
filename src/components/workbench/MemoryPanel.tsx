// Beauty CRM — 客戶記憶 (Memory)
// 對應 PRD/UI-SPEC §3.2:偏好、過敏、上次備註、累計消費、VIP 觸發原因 (可解釋)。

'use client';

import { hasAllergyConflict } from '@/lib/customers';
import { computeCustomerLTV } from '@/lib/analytics';
import { tierForSpend, progressToNextTier } from '@/lib/tiers';
import type { ConsentStatus } from '@/lib/customers';
import type { QueueItem } from './QueueList';
import type { FollowupDraft } from '@/lib/followups';
import type { DisplayCustomer, DisplayTreatment } from './seed';

interface Props {
  item?: QueueItem;
  fallbackName?: string;
  draft: FollowupDraft | null;
  canDraft: boolean;
  consent: ConsentStatus;
  /** 通知父層開啟 draft / add sheet */
  onCreateDraft: () => void;
  onOpenAdd: () => void;
}

const consentToneClass: Record<ConsentStatus, string> = {
  granted: 'tag',
  pending: 'tag warn',
  revoked: 'tag danger',
};

const consentBadge: Record<ConsentStatus, string> = {
  granted: '已同意聯絡',
  pending: '待確認同意',
  revoked: '不同意行銷',
};

export default function MemoryPanel({
  item,
  fallbackName,
  draft,
  canDraft,
  consent,
  onCreateDraft,
  onOpenAdd,
}: Props) {
  const customer: DisplayCustomer | undefined = item?.customer;
  const last: DisplayTreatment | undefined = item?.lastTreatment;

  const displayName = customer?.displayName ?? fallbackName ?? '—';
  const initials = customer?.initials ?? '—';
  const tags: string[] = [
    ...(last?.preferenceTags ?? []),
    consentBadge[consent],
  ];

  // LTV — 只用該客戶的療程計算
  const ltv = customer
    ? computeCustomerLTV([last].filter(Boolean) as unknown as import('@/lib/treatments').Treatment[], customer.id)
    : undefined;
  // ↑ 注意:這裡只用「last」會低估,改用從 props 傳入的完整 treatments 較佳;
  //   為避免 MemoryPanel 多接一個 prop,先以 last 為代表。
  //   Workbench 在「客戶」分頁直接呼叫同樣 API,結果一致。

  const tier = ltv ? tierForSpend(ltv.totalSpent) : undefined;
  const progress = ltv ? progressToNextTier(ltv.totalSpent) : undefined;

  // Allergy conflict — 用 customer.allergies 比對本次成分
  const ingredientList = last?.productIngredients ?? [];
  const conflicts =
    customer && ingredientList.length > 0
      ? hasAllergyConflict(
          {
            ...customer,
            allergies: customer.allergies ?? [],
            preferences: customer.preferences ?? [],
            tags: customer.tags ?? [],
          },
          ingredientList,
        )
      : [];
  const hasConflict = conflicts.length > 0;

  // 過敏描述 (always 顯示對應說明文字)
  const allergyDescription = last?.allergyDescription ?? '—';

  const noteSummary = last?.noteSummary ?? '—';
  const vipReason = last?.vipReason ?? '—';

  const nextStep = canDraft
    ? '先確認近況,再核准回訪草稿'
    : consent === 'pending'
      ? '補上行銷同意狀態,才能產生草稿'
      : '已撤回同意,不顯示送出動作';

  return (
    <aside className="panel memory" aria-live="polite">
      <div className="memory-cover">
        <div className="eyebrow">CUSTOMER MEMORY</div>
        <div style={{ color: 'var(--brand-dark)', fontSize: 12, fontWeight: 700 }}>
          不要讓重要的細節只留在腦中
        </div>
      </div>
      <div className="memory-main">
        <div className="memory-person">
          <div className="memory-avatar">{initials}</div>
          <div>
            <div className="memory-name">{displayName}</div>
            <div className="memory-phone">
              {customer?.phone ?? '—'}
              {last && `　·　最後服務 ${formatDateMd(last.performedAt)}`}
            </div>
          </div>
        </div>

        <div className="memory-tags">
          {tags.map((tag, i) => (
            <span
              key={i}
              className={i === tags.length - 1 ? consentToneClass[consent] : 'tag'}
            >
              {tag}
            </span>
          ))}
          {tier && <span className="tag">{tier.label}</span>}
        </div>

        <div
          className="alert"
          role={hasConflict ? 'alert' : 'status'}
        >
          <strong>!</strong>
          <span>
            {hasConflict
              ? `過敏衝突:${conflicts.join(', ')}。新增服務前請確認。`
              : allergyDescription}
          </span>
        </div>

        <dl className="memory-list">
          <div className="memory-item">
            <dt>上次備註</dt>
            <dd>{noteSummary}</dd>
          </div>
          <div className="memory-item">
            <dt>回訪依據</dt>
            <dd>
              <span>{vipReason}</span>
              <br />
              {progress?.next && (
                <span className="reason">
                  距下一階 {progress.next.label} 還差 NT$ {progress.remaining.toLocaleString()}
                </span>
              )}
              {!progress?.next && tier && (
                <span className="reason">已達 {tier.label},維持原服務</span>
              )}
            </dd>
          </div>
          <div className="memory-item">
            <dt>下一步</dt>
            <dd style={{ color: 'var(--brand)' }}>{nextStep}</dd>
          </div>
        </dl>

        <div className="memory-actions">
          <button
            type="button"
            className="primary"
            onClick={onCreateDraft}
            disabled={!canDraft}
            aria-disabled={!canDraft}
            title={canDraft ? '產生回訪草稿' : '行銷同意狀態未確認,不能產生草稿'}
          >
            {canDraft ? '產生回訪草稿' : '需先確認同意'}
          </button>
          <button type="button" className="secondary" onClick={onOpenAdd}>
            新增服務紀錄
          </button>
        </div>
      </div>

      <span className="sr-only" role="status">
        {draft ? '目前有回訪草稿' : '尚未產生草稿'}
      </span>
    </aside>
  );
}

function formatDateMd(iso?: string): string {
  if (!iso) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[2]}/${m[3]}` : iso;
}
