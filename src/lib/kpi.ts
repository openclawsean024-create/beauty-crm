// Beauty CRM — 今日工作台 KPI（由資料計算，不寫死）
// 定義：
// - 本月服務次數／服務額：performedAt 落在 today 所在月份（本地日期）的療程。
// - 與上月比較：百分比變化；上月為 0 時回傳 null（畫面顯示「—」）。
// - 近 30 日回訪率：近 30 天內的服務中，該客戶在此之前已有服務紀錄的比例。
//   與前一個 30 天區間比較，單位為百分點；任一區間沒有服務時為 null。
// - 回流節奏：最近 N 週，每週「建議回訪日落在該週」的服務數。

import { addDays, diffDays, toDateOnly } from './dates';
import type { RecallSettings } from './recall-settings';
import { recallDaysFor } from './recall-settings';
import type { Treatment } from './treatments';

export interface KpiSummary {
  visitsThisMonth: number;
  visitsDeltaPct: number | null;
  revenueThisMonth: number;
  revenueDeltaPct: number | null;
  returnRatePct: number | null;
  returnRateDeltaPts: number | null;
}

function localDate(iso: string): string {
  return toDateOnly(new Date(iso));
}

function monthOf(dateOnly: string): string {
  return dateOnly.slice(0, 7);
}

function previousMonth(month: string): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** 區間 (startExclusive, endInclusive] 內的回訪率；沒有服務時為 null。 */
function returnRate(treatments: Treatment[], startExclusive: string, endInclusive: string): number | null {
  const firstVisit = new Map<string, string>();
  for (const t of treatments) {
    const prev = firstVisit.get(t.customerId);
    if (!prev || t.performedAt < prev) firstVisit.set(t.customerId, t.performedAt);
  }
  let total = 0;
  let returning = 0;
  for (const t of treatments) {
    const day = localDate(t.performedAt);
    if (day <= startExclusive || day > endInclusive) continue;
    total += 1;
    if ((firstVisit.get(t.customerId) ?? t.performedAt) < t.performedAt) returning += 1;
  }
  return total === 0 ? null : Math.round((returning / total) * 100);
}

export function computeKpis(treatments: Treatment[], today: Date): KpiSummary {
  const todayIso = toDateOnly(today);
  const thisMonth = monthOf(todayIso);
  const lastMonth = previousMonth(thisMonth);

  let visitsThis = 0;
  let visitsLast = 0;
  let revenueThis = 0;
  let revenueLast = 0;
  for (const t of treatments) {
    const month = monthOf(localDate(t.performedAt));
    if (month === thisMonth) {
      visitsThis += 1;
      revenueThis += t.price;
    } else if (month === lastMonth) {
      visitsLast += 1;
      revenueLast += t.price;
    }
  }

  const current = returnRate(treatments, addDays(todayIso, -30), todayIso);
  const previous = returnRate(treatments, addDays(todayIso, -60), addDays(todayIso, -30));

  return {
    visitsThisMonth: visitsThis,
    visitsDeltaPct: pctChange(visitsThis, visitsLast),
    revenueThisMonth: revenueThis,
    revenueDeltaPct: pctChange(revenueThis, revenueLast),
    returnRatePct: current,
    returnRateDeltaPts: current === null || previous === null ? null : current - previous,
  };
}

/**
 * 最近 `weeks` 週（由舊到新，最後一格為含 today 的這 7 天），
 * 每週建議回訪日落在該週的服務數。
 */
export function weeklyRecallCounts(
  treatments: Treatment[],
  today: Date,
  recallSettings?: Partial<RecallSettings>,
  weeks: number = 8,
): number[] {
  const todayIso = toDateOnly(today);
  const counts = new Array<number>(weeks).fill(0);
  for (const t of treatments) {
    const recallAt = addDays(localDate(t.performedAt), recallDaysFor(recallSettings, t.category));
    const daysAgo = diffDays(recallAt, todayIso); // 0 = 今天、正數 = 過去
    if (daysAgo < 0) continue;
    const weekIndex = weeks - 1 - Math.floor(daysAgo / 7);
    if (weekIndex >= 0) counts[weekIndex] = (counts[weekIndex] ?? 0) + 1;
  }
  return counts;
}

/** 轉成 0–1 的長條高度比例；全部為 0 時回傳全 0。 */
export function normalizeCounts(counts: number[]): number[] {
  const max = Math.max(0, ...counts);
  return counts.map((c) => (max === 0 ? 0 : c / max));
}
