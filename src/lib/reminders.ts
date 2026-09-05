// Beauty CRM — 回訪提醒
// 計算每位客戶的下次回訪日 + 過期提醒清單。

import type { Customer } from './customers';
import type { Treatment, TreatmentCategory } from './treatments';
import { lastTreatment, suggestRecallDays } from './treatments';
import type { FunnelStage } from './funnel';

export interface Reminder {
  customerId: string;
  lastTreatmentId: string | undefined;
  lastCategory: string | undefined;
  lastPerformedAt: string | undefined;
  suggestedRecallAt: string; // ISO date (YYYY-MM-DD)
  daysUntilRecall: number; // 負 = 過期
  status: 'overdue' | 'due-soon' | 'upcoming' | 'no-history';
  /**
   * 設計師手動覆寫（FR-004 / AC-002）：
   * - overrideAt: 覆寫後的回訪日（ISO date）
   * - overriddenBy: 覆寫者 designerId
   * - overrideReason: 覆寫理由（客戶出國 / 預約延後等）
   * - 全部 optional；未覆寫時不影響 computeReminder 預設行為
   */
  overrideAt?: string;
  overriddenBy?: string;
  overrideReason?: string;
  /**
   * 回流漏斗階段（FR-008）。
   * - 由 contactLog / apptLog 推導，非持久化欄位
   * - 留 optional 以維持向後相容（既有 test 仍 PASS）
   * - Dashboard 漏斗 tab 計算後填入，不污染 computeReminder 既有路徑
   */
  funnelStage?: FunnelStage;
}

export interface OverrideOptions {
  overrideAt: string;
  overriddenBy: string;
  overrideReason?: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// 使用本地時區輸出 YYYY-MM-DD。
// 不能用 toISOString().slice(0,10) — 那是 UTC，對台灣使用者（UTC+8）會在跨日時 off-by-one。
function toDateOnly(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * 設定 / 更新設計師手動覆寫（FR-004 / AC-002）。
 * 純函數：回傳新 Reminder，原 reminder 物件不變。
 *
 * 必填：overrideAt、overriddenBy。overrideReason 可選。
 */
export function setOverride(reminder: Reminder, opts: OverrideOptions): Reminder {
  if (!opts.overrideAt) {
    throw new Error('setOverride: overrideAt required');
  }
  if (!opts.overriddenBy || !opts.overriddenBy.trim()) {
    throw new Error('setOverride: overriddenBy required');
  }
  return {
    ...reminder,
    overrideAt: opts.overrideAt,
    overriddenBy: opts.overriddenBy,
    overrideReason: opts.overrideReason,
  };
}

export function computeReminder(
  customer: Customer,
  treatments: Treatment[],
  today: Date = new Date(),
  dueSoonDays: number = 7,
  customRules?: Partial<Record<TreatmentCategory, number>>,
  override?: OverrideOptions,
): Reminder {
  const last = lastTreatment(treatments, customer.id);
  const baseNoHistory: Reminder = {
    customerId: customer.id,
    lastTreatmentId: undefined,
    lastCategory: undefined,
    lastPerformedAt: undefined,
    suggestedRecallAt: toDateOnly(today),
    daysUntilRecall: 0,
    status: 'no-history',
  };
  if (!last) {
    return override ? setOverride(baseNoHistory, override) : baseNoHistory;
  }
  const performed = new Date(last.performedAt);
  const recallDays = suggestRecallDays(last.category, customRules);
  const baseRecallDate = new Date(performed.getTime() + recallDays * MS_PER_DAY);

  // FR-004 / AC-002：若 override 存在且為未來時間，用 overrideAt 取代 baseRecallDate
  let effectiveRecallDate: Date = baseRecallDate;
  if (override) {
    const overrideTime = new Date(override.overrideAt);
    if (overrideTime.getTime() > today.getTime()) {
      effectiveRecallDate = overrideTime;
    }
  }

  const daysUntil = Math.round(
    (effectiveRecallDate.getTime() - today.getTime()) / MS_PER_DAY,
  );
  let status: Reminder['status'];
  if (daysUntil < 0) status = 'overdue';
  else if (daysUntil <= dueSoonDays) status = 'due-soon';
  else status = 'upcoming';

  const base: Reminder = {
    customerId: customer.id,
    lastTreatmentId: last.id,
    lastCategory: last.category,
    lastPerformedAt: last.performedAt,
    suggestedRecallAt: toDateOnly(effectiveRecallDate),
    daysUntilRecall: daysUntil,
    status,
  };
  return override ? setOverride(base, override) : base;
}

export function listOverdue(
  customers: Customer[],
  treatments: Treatment[],
  today: Date = new Date(),
): Reminder[] {
  return customers
    .map((c) => computeReminder(c, treatments, today))
    .filter((r) => r.status === 'overdue')
    .sort((a, b) => a.daysUntilRecall - b.daysUntilRecall); // 過期最久優先
}

export function listDueSoon(
  customers: Customer[],
  treatments: Treatment[],
  today: Date = new Date(),
  withinDays: number = 7,
): Reminder[] {
  return customers
    .map((c) => computeReminder(c, treatments, today, withinDays))
    .filter((r) => r.status === 'due-soon' || r.status === 'overdue')
    .sort((a, b) => a.daysUntilRecall - b.daysUntilRecall);
}