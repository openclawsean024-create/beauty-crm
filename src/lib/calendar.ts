// Beauty CRM — 月曆格計算
// 併自 beauty-crm-concierge `app/booking/page.tsx` 的 buildMonthGrid（SPEC §10.1 #6）。
// 只用於顯示「回訪日／預約日」月檢視，不做排程。

export interface MonthCell {
  /** 幾號；月初與月底補白格為 null */
  date: number | null;
  /** YYYY-MM-DD；補白格為 null */
  iso: string | null;
}

/**
 * 產生以週日為起始、每列 7 格的月曆格。
 * @param year 西元年
 * @param month 0-based 月份（0 = 一月）
 */
export function buildMonthGrid(year: number, month: number): MonthCell[] {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 0 || month > 11) {
    throw new Error('invalid year/month');
  }
  const startDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: MonthCell[] = [];
  for (let i = 0; i < startDay; i += 1) cells.push({ date: null, iso: null });
  for (let d = 1; d <= daysInMonth; d += 1) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ date: d, iso });
  }
  while (cells.length % 7 !== 0) cells.push({ date: null, iso: null });
  return cells;
}

export type CalendarMarkKind = 'recall' | 'appointment';

export interface CalendarMark {
  iso: string;
  kind: CalendarMarkKind;
}

export interface MarkedMonthCell extends MonthCell {
  recallCount: number;
  appointmentCount: number;
  isToday: boolean;
}

/** 把回訪日／預約日標到月曆格上。不在該月的標記會被忽略。 */
export function markMonthGrid(cells: MonthCell[], marks: CalendarMark[], today?: string): MarkedMonthCell[] {
  const recall = new Map<string, number>();
  const appointment = new Map<string, number>();
  for (const mark of marks) {
    const target = mark.kind === 'recall' ? recall : appointment;
    target.set(mark.iso, (target.get(mark.iso) ?? 0) + 1);
  }
  return cells.map((cell) => ({
    ...cell,
    recallCount: cell.iso ? recall.get(cell.iso) ?? 0 : 0,
    appointmentCount: cell.iso ? appointment.get(cell.iso) ?? 0 : 0,
    isToday: cell.iso !== null && cell.iso === today,
  }));
}

/** 上／下個月（處理跨年）。 */
export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}
