'use client';

import type { Customer } from '@/lib/customers';
import type { Treatment } from '@/lib/treatments';
import { lastTreatment } from '@/lib/treatments';
import { progressToNextTier } from '@/lib/tiers';
import { computeCustomerLTV } from '@/lib/analytics';
import BroadcastGuard from './BroadcastGuard';

interface CustomerMemoryPanelProps {
  customer: Customer | null;
  treatments: Treatment[];
  nextActionLabel: string;
  onGenerateDraft: () => void;
  onAddTreatment: () => void;
}

function customerInitial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  return trimmed[0]!.toUpperCase();
}

function formatPhone(phone: string): string {
  if (phone.length === 10) return `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
  return phone;
}

export default function CustomerMemoryPanel({
  customer,
  treatments,
  nextActionLabel,
  onGenerateDraft,
  onAddTreatment,
}: CustomerMemoryPanelProps) {
  if (!customer) {
    return (
      <aside className="panel memory" aria-live="polite">
        <div className="memory-cover">
          <div className="eyebrow">CUSTOMER MEMORY</div>
          <div style={{ color: 'var(--brand-dark)', fontSize: 12, fontWeight: 700 }}>
            從左邊選擇一位客戶，查看完整記憶
          </div>
        </div>
        <div className="memory-main">
          <p style={{ color: 'var(--muted)' }}>尚未選取客戶</p>
        </div>
      </aside>
    );
  }

  const last = lastTreatment(treatments, customer.id);
  const ltv = computeCustomerLTV(treatments, customer.id);
  const tierProgress = progressToNextTier(ltv.totalSpent);

  // VIP trigger reason — explainable, not a black-box badge (SPEC AC-009)
  const reasonText = tierProgress.next
    ? `累計 NT$ ${ltv.totalSpent.toLocaleString()}，距離 ${tierProgress.next.label} 還差 NT$ ${tierProgress.remaining.toLocaleString()}`
    : `累計 NT$ ${ltv.totalSpent.toLocaleString()}，已達最高 ${tierProgress.current.label}`;

  const allergyText =
    customer.allergies.length > 0
      ? customer.allergies.join('、')
      : '目前沒有已知過敏紀錄';

  const tags = [...customer.tags];
  if (customer.consent === 'granted') tags.push('已同意聯絡');
  if (customer.consent === 'pending') tags.push('待確認同意');
  if (customer.consent === 'revoked') tags.push('不同意行銷');

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
          <div className="memory-avatar" aria-hidden="true">{customerInitial(customer.name)}</div>
          <div>
            <div className="memory-name">{customer.name}</div>
            <div className="memory-phone">
              {formatPhone(customer.phone)}　·　最後服務 {last ? last.performedAt.slice(5).replace('-', '/') : '—'}
            </div>
          </div>
        </div>

        <div className="memory-tags" data-testid="memory-tags">
          {tags.length === 0 ? <span className="tag neutral">無標籤</span> : tags.map((tag, index) => (
            <span key={`${tag}-${index}`} className={`tag${index >= 2 ? ' neutral' : ''}`}>{tag}</span>
          ))}
        </div>

        <div className="alert" role={customer.allergies.length > 0 ? 'alert' : 'status'}>
          <strong aria-hidden="true">!</strong>
          <span>{allergyText}</span>
        </div>

        <dl className="memory-list">
          <div className="memory-item">
            <dt>上次備註</dt>
            <dd>{customer.notes ?? (last?.notes ?? '—')}</dd>
          </div>
          <div className="memory-item">
            <dt>偏好</dt>
            <dd>{customer.preferences.length > 0 ? customer.preferences.join('、') : '—'}</dd>
          </div>
          <div className="memory-item">
            <dt>VIP 依據</dt>
            <dd>
              <span>{reasonText}</span>
              <br />
              <span className="reason">可解釋，不是黑箱分數</span>
            </dd>
          </div>
          <div className="memory-item">
            <dt>下一步</dt>
            <dd style={{ color: 'var(--brand)' }}>{nextActionLabel}</dd>
          </div>
        </dl>

        <div className="memory-actions">
          <BroadcastGuard consent={customer.consent} ready>
            <button type="button" className="primary" onClick={onGenerateDraft}>
              產生回訪草稿
            </button>
          </BroadcastGuard>
          <button type="button" className="secondary" onClick={onAddTreatment}>
            新增服務紀錄
          </button>
        </div>
      </div>
    </aside>
  );
}
