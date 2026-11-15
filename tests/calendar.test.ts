// AC-001：月曆格計算 — 併自 concierge booking 頁的 buildMonthGrid（SPEC §10.1 #6）
import { describe, it, expect } from 'vitest';
import { buildMonthGrid, markMonthGrid, shiftMonth } from '@/lib/calendar';
import { addDays, diffDays, isDateOnly, isTimeOfDay, parseDateOnly, toDateOnly } from '@/lib/dates';

describe('AC-001 calendar — 月曆格計算', () => {
  it('AC-001: 2026 年 11 月從週日開始，30 天，補滿到 7 的倍數', () => {
    const cells = buildMonthGrid(2026, 10);
    expect(cells).toHaveLength(35);
    expect(cells[0]).toEqual({ date: 1, iso: '2026-11-01' });
    expect(cells[29]).toEqual({ date: 30, iso: '2026-11-30' });
    expect(cells.slice(30).every((c) => c.date === null && c.iso === null)).toBe(true);
  });

  it('AC-001: 月初不在週日時前面補白格', () => {
    const cells = buildMonthGrid(2026, 11); // 2026-12-01 是週二
    expect(cells.slice(0, 2)).toEqual([{ date: null, iso: null }, { date: null, iso: null }]);
    expect(cells[2]).toEqual({ date: 1, iso: '2026-12-01' });
    expect(cells.length % 7).toBe(0);
    expect(cells.filter((c) => c.date !== null)).toHaveLength(31);
  });

  it('AC-001: 閏年 2 月 29 天、平年 28 天', () => {
    expect(buildMonthGrid(2028, 1).filter((c) => c.date !== null)).toHaveLength(29);
    expect(buildMonthGrid(2027, 1).filter((c) => c.date !== null)).toHaveLength(28);
  });

  it('AC-001: 月份超出範圍時 throw', () => {
    expect(() => buildMonthGrid(2026, 12)).toThrow();
    expect(() => buildMonthGrid(2026, -1)).toThrow();
  });

  it('AC-001: 把回訪日與預約日標到月曆格', () => {
    const marked = markMonthGrid(
      buildMonthGrid(2026, 10),
      [
        { iso: '2026-11-16', kind: 'recall' },
        { iso: '2026-11-16', kind: 'recall' },
        { iso: '2026-11-16', kind: 'appointment' },
        { iso: '2026-11-20', kind: 'appointment' },
        { iso: '2026-12-01', kind: 'recall' },
      ],
      '2026-11-16',
    );
    const day16 = marked.find((c) => c.iso === '2026-11-16')!;
    expect(day16).toMatchObject({ recallCount: 2, appointmentCount: 1, isToday: true });
    expect(marked.find((c) => c.iso === '2026-11-20')).toMatchObject({ recallCount: 0, appointmentCount: 1, isToday: false });
    expect(marked.reduce((sum, c) => sum + c.recallCount, 0)).toBe(2);
  });

  it('AC-001: 上下個月會跨年', () => {
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
  });

  it('AC-001: 本地日期工具不經過 UTC', () => {
    expect(isDateOnly('2026-11-16')).toBe(true);
    expect(isDateOnly('2026-02-30')).toBe(false);
    expect(isDateOnly('2026/11/16')).toBe(false);
    expect(toDateOnly(parseDateOnly('2026-11-16'))).toBe('2026-11-16');
    expect(toDateOnly(new Date(2026, 10, 16, 23, 59))).toBe('2026-11-16');
    expect(diffDays('2026-11-16', '2026-12-01')).toBe(15);
    expect(diffDays('2026-12-01', '2026-11-16')).toBe(-15);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(isTimeOfDay('09:30')).toBe(true);
    expect(isTimeOfDay('24:00')).toBe(false);
  });
});
