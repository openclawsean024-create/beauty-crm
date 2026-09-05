// Beauty CRM — 行銷推播
// 篩選目標客群 + 訊息模板 + 同意狀態過濾

import type { Customer } from './customers';
import type { Treatment } from './treatments';
import { lastTreatment, suggestRecallDays } from './treatments';
import { computeCustomerLTV } from './analytics';
import { tierForSpend } from './tiers';
import { logEvent } from './audit';

export type BroadcastChannel = 'sms' | 'line' | 'email';

export interface BroadcastMessage {
  channel: BroadcastChannel;
  subject?: string; // for email
  body: string;
}

export interface BroadcastTarget {
  customer: Customer;
  reason: string; // 為何被選中（例如 "30 天未回訪"）
  preview: string; // 替換變數後的訊息預覽
  /**
   * 草稿狀態機（FR-005 / AC-007）：
   * - draft: 設計師尚未核准
   * - approved: 設計師已核准，鎖定版本
   * - sent: 已實際發送（時間戳 sentAt）
   * - cancelled: 已取消
   */
  status: BroadcastStatus;
  approvedBy?: string; // 核准者 designerId
  approvedAt?: string; // 核准時間
  sentAt?: string; // 發送時間
}

export type BroadcastStatus = 'draft' | 'approved' | 'sent' | 'cancelled';

const TEMPLATE_VARS = {
  '{{name}}': (c: Customer) => c.name,
  '{{firstName}}': (c: Customer) => c.name.split(/\s+/)[0] ?? c.name,
  '{{lastService}}': (c: Customer, ts: Treatment[]) =>
    lastTreatment(ts, c.id)?.serviceName ?? '—',
  '{{lastVisit}}': (c: Customer, ts: Treatment[]) => {
    const last = lastTreatment(ts, c.id);
    return last ? last.performedAt.slice(0, 10) : '—';
  },
} as const;

export function renderTemplate(
  template: string,
  customer: Customer,
  treatments: Treatment[],
): string {
  let out = template;
  for (const [k, fn] of Object.entries(TEMPLATE_VARS)) {
    out = out.split(k).join(fn(customer, treatments));
  }
  return out;
}

// === 預載訊息模板 ===
export const BUILTIN_TEMPLATES: Record<string, BroadcastMessage> = {
  recall_due: {
    channel: 'line',
    body: '{{firstName}} 您好～上次做的 {{lastService}} 差不多該回來保養囉！\n目前預約時段還有名額，要直接幫您安排嗎？',
  },
  birthday: {
    channel: 'sms',
    body: '{{firstName}} 生日快樂！本月壽星獨享 9 折，歡迎預約唷 🎂',
  },
  vip_upgrade: {
    channel: 'line',
    body: '恭喜 {{firstName}}！您已升級為金卡會員，享有 9 折優惠 + 指定設計師保留 🎉',
  },
  inactive_90d: {
    channel: 'sms',
    body: '{{firstName}} 好久不見～回來保養給您專屬 8 折，歡迎預約！',
  },
};

export function selectByConsent(customers: Customer[]): Customer[] {
  return customers.filter((c) => c.consent === 'granted');
}

// 篩選「過期回訪」客戶
export function selectOverdue(
  customers: Customer[],
  treatments: Treatment[],
  today: Date,
): Customer[] {
  return customers.filter((c) => {
    const last = lastTreatment(treatments, c.id);
    if (!last) return false;
    const performed = new Date(last.performedAt).getTime();
    // DRY: 重用 treatments 模組的 recall 規則，不要自己寫魔術數字
    const recallDays = suggestRecallDays(last.category);
    const recallAt = performed + recallDays * 86_400_000;
    return recallAt < today.getTime();
  });
}

// 篩選「高消費 VIP」
export function selectHighSpenders(
  customers: Customer[],
  treatments: Treatment[],
  thresholdTWD: number = 20_000,
): Customer[] {
  return customers.filter((c) => {
    const ltv = computeCustomerLTV(treatments, c.id);
    return ltv.totalSpent >= thresholdTWD;
  });
}

// 篩選「特定 tier」
export function selectByTier(
  customers: Customer[],
  treatments: Treatment[],
  tierName: 'gold' | 'black' | 'silver',
): Customer[] {
  return customers.filter((c) => {
    const ltv = computeCustomerLTV(treatments, c.id);
    return tierForSpend(ltv.totalSpent).tier === tierName;
  });
}

// 主要 API：給一組客戶 + 模板 → 產出預覽清單（每筆 status 預設 'draft'）
export function buildBroadcast(
  templateKey: keyof typeof BUILTIN_TEMPLATES,
  targetCustomers: Customer[],
  treatments: Treatment[],
): BroadcastTarget[] {
  const tpl = BUILTIN_TEMPLATES[templateKey];
  if (!tpl) throw new Error(`unknown template: ${templateKey}`);
  const reachable = selectByConsent(targetCustomers);
  return reachable.map((c) => ({
    customer: c,
    reason: templateKey,
    preview: renderTemplate(tpl.body, c, treatments),
    status: 'draft',
  }));
}

/**
 * 設計師手動核准草稿（FR-005 / AC-007）。
 *
 * 規則：
 * - 必須是目前 status === 'draft'，否則 throw（已 approved / sent / cancelled 不可重複核准）
 * - 設計師 ID 必填
 * - 不可變：回傳新 BroadcastTarget，原物件 status 不變
 * - 設定 status='approved'、approvedBy=designerId、approvedAt=now
 */
export function approve(target: BroadcastTarget, designerId: string): BroadcastTarget {
  if (!designerId || !designerId.trim()) {
    throw new Error('approve: designerId required');
  }
  if (target.status !== 'draft') {
    throw new Error(
      `approve: cannot approve target in status "${target.status}" (only "draft" is approvable)`,
    );
  }
  const approvedAt = new Date().toISOString();
  const next: BroadcastTarget = {
    ...target,
    status: 'approved',
    approvedBy: designerId,
    approvedAt,
  };
  // DoD-8：核准動作同步上報 audit
  logEvent(
    'broadcast.approved',
    { customerId: target.customer.id, template: target.reason, approvedAt },
    designerId,
  );
  return next;
}

/**
 * 標記已發送（FR-005 / AC-007：核准後才能實際發送）。
 *
 * 規則：
 * - 必須 status === 'approved'，否則 throw（未核准不可送）
 * - 不可變：回傳新 BroadcastTarget，status='sent' + sentAt
 */
export function markSent(
  target: BroadcastTarget,
  sentAt?: string,
): BroadcastTarget {
  if (target.status !== 'approved') {
    throw new Error(
      `markSent: target must be in "approved" status (current: "${target.status}")`,
    );
  }
  const next: BroadcastTarget = {
    ...target,
    status: 'sent',
    sentAt: sentAt ?? new Date().toISOString(),
  };
  // DoD-8：實際發送同步上報 audit
  logEvent(
    'broadcast.sent',
    { customerId: target.customer.id, template: target.reason },
    target.approvedBy ?? 'system',
  );
  return next;
}

/**
 * 送達前最後一次同意檢查（AC-008 / AC-007）。
 *
 * 客戶撤回同意後必須 throw，阻擋實際發送。
 * 即使草稿已 approved，若 customer.consent !== 'granted' 也 throw。
 *
 * 注意：此函式從 v0.2.0 的 boolean 回傳改為 throw，
 * 對應 audit §5 FR-005/AC-007 「approved 草稿被 revoke consent 時 recheckConsentBeforeSend 必須 throw」。
 * 既有 test 已更新為 expect(...).toThrow()。
 */
export function recheckConsentBeforeSend(
  target: BroadcastTarget,
  currentCustomers: Customer[],
): void {
  const live = currentCustomers.find((c) => c.id === target.customer.id);
  if (live?.consent !== 'granted') {
    // DoD-8：阻擋發送（recheck 失敗）同步上報 audit
    logEvent(
      'broadcast.consentRevoked',
      {
        customerId: target.customer.id,
        targetStatus: target.status,
        currentConsent: live?.consent ?? 'unknown',
      },
      'system',
    );
    throw new Error(
      `recheckConsentBeforeSend: customer ${target.customer.id} no longer has marketing consent ` +
        `(target status: ${target.status}, current consent: ${live?.consent ?? 'unknown'}). ` +
        `Block send.`,
    );
  }
}