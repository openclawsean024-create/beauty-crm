// Beauty CRM — 回訪提醒
// 計算每位客戶的下次回訪日 + 過期提醒清單。

import type { Customer } from './customers';
import type { Treatment } from './treatments';
import { lastTreatment, suggestRecallDays } from './treatments';

export interface Reminder {
  customerId: string;
  lastTreatmentId: string | undefined;
  lastCategory: string | undefined;
  lastPerformedAt: string | undefined;
  suggestedRecallAt: string; // ISO date (YYYY-MM-DD)
  daysUntilRecall: number; // 負 = 過期
  status: 'overdue' | 'due-soon' | 'upcoming' | 'no-history';
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function computeReminder(
  customer: Customer,
  treatments: Treatment[],
  today: Date = new Date(),
  dueSoonDays: number = 7,
): Reminder {
  const last = lastTreatment(treatments, customer.id);
  if (!last) {
    return {
      customerId: customer.id,
      lastTreatmentId: undefined,
      lastCategory: undefined,
      lastPerformedAt: undefined,
      suggestedRecallAt: toDateOnly(today),
      daysUntilRecall: 0,
      status: 'no-history',
    };
  }
  const performed = new Date(last.performedAt);
  const recallDays = suggestRecallDays(last.category);
  const recallDate = new Date(performed.getTime() + recallDays * MS_PER_DAY);
  const daysUntil = Math.round(
    (recallDate.getTime() - today.getTime()) / MS_PER_DAY,
  );
  let status: Reminder['status'];
  if (daysUntil < 0) status = 'overdue';
  else if (daysUntil <= dueSoonDays) status = 'due-soon';
  else status = 'upcoming';
  return {
    customerId: customer.id,
    lastTreatmentId: last.id,
    lastCategory: last.category,
    lastPerformedAt: last.performedAt,
    suggestedRecallAt: toDateOnly(recallDate),
    daysUntilRecall: daysUntil,
    status,
  };
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