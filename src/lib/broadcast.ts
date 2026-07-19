// Beauty CRM — 行銷推播
// 篩選目標客群 + 訊息模板 + 同意狀態過濾

import type { Customer } from './customers';
import type { Treatment } from './treatments';
import { lastTreatment } from './treatments';
import { computeCustomerLTV } from './analytics';
import { tierForSpend } from './tiers';

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
}

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
    const recallDays =
      last.category === 'manicure'
        ? 28
        : last.category === 'eyelash'
          ? 21
          : last.category === 'skincare'
            ? 30
            : 45;
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

// 主要 API：給一組客戶 + 模板 → 產出預覽清單
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
  }));
}

// AC: 客戶撤回同意後，不應再被推播
export function recheckConsentBeforeSend(
  target: BroadcastTarget,
  currentCustomers: Customer[],
): boolean {
  const live = currentCustomers.find((c) => c.id === target.customer.id);
  return live?.consent === 'granted';
}