// Beauty CRM — 消費分析
// 純函式：所有金額皆為正數（TWD 金額 magnitude）

import type { Treatment } from './treatments';

export interface RevenueByMonth {
  month: string; // YYYY-MM
  total: number; // TWD (positive)
  count: number;
}

export interface CustomerLTV {
  customerId: string;
  totalSpent: number; // TWD (positive)
  visitCount: number;
  averageTicket: number; // TWD
  firstVisitAt: string | undefined;
  lastVisitAt: string | undefined;
}

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function computeRevenueByMonth(
  treatments: Treatment[],
): RevenueByMonth[] {
  const map = new Map<string, { total: number; count: number }>();
  for (const t of treatments) {
    const key = monthKey(t.performedAt);
    const cur = map.get(key) ?? { total: 0, count: 0 };
    cur.total += t.price;
    cur.count += 1;
    map.set(key, cur);
  }
  return Array.from(map.entries())
    .map(([month, v]) => ({ month, total: v.total, count: v.count }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export function computeCustomerLTV(
  treatments: Treatment[],
  customerId: string,
): CustomerLTV {
  const mine = treatments.filter((t) => t.customerId === customerId);
  const totalSpent = mine.reduce((s, t) => s + t.price, 0);
  const visitCount = mine.length;
  const sorted = mine
    .map((t) => t.performedAt)
    .sort((a, b) => a.localeCompare(b));
  return {
    customerId,
    totalSpent,
    visitCount,
    averageTicket: visitCount === 0 ? 0 : Math.round(totalSpent / visitCount),
    firstVisitAt: sorted[0],
    lastVisitAt: sorted[sorted.length - 1],
  };
}

export function computeAllLTV(treatments: Treatment[]): CustomerLTV[] {
  const ids = Array.from(new Set(treatments.map((t) => t.customerId)));
  return ids
    .map((id) => computeCustomerLTV(treatments, id))
    .sort((a, b) => b.totalSpent - a.totalSpent); // 高消費優先
}

export function topSpenders(
  treatments: Treatment[],
  limit: number = 10,
): CustomerLTV[] {
  return computeAllLTV(treatments).slice(0, limit);
}