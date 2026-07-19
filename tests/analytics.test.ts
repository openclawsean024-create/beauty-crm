import { describe, it, expect } from 'vitest';
import { computeRevenueByMonth, computeCustomerLTV, computeAllLTV, topSpenders } from '@/lib/analytics';
import { recordTreatment } from '@/lib/treatments';

const base = {
  id: 't',
  customerId: 'c1',
  category: 'manicure' as const,
  serviceName: 'A',
  price: 1000,
  durationMin: 60,
  performedAt: '2026-07-01T10:00:00Z',
};

describe('analytics — 消費分析', () => {
  it('AC: computeRevenueByMonth 正確分組並依月份排序', () => {
    const list = [
      recordTreatment({ ...base, id: 't1', performedAt: '2026-06-15T10:00:00Z', price: 1000 }),
      recordTreatment({ ...base, id: 't2', performedAt: '2026-06-20T10:00:00Z', price: 1500 }),
      recordTreatment({ ...base, id: 't3', performedAt: '2026-07-01T10:00:00Z', customerId: 'c2', price: 800 }),
    ];
    const rev = computeRevenueByMonth(list);
    expect(rev).toHaveLength(2);
    expect(rev[0]).toEqual({ month: '2026-06', total: 2500, count: 2 });
    expect(rev[1]).toEqual({ month: '2026-07', total: 800, count: 1 });
  });

  it('AC: computeCustomerLTV 正確累計 totalSpent + 平均客單', () => {
    const list = [
      recordTreatment({ ...base, id: 't1', price: 1200, performedAt: '2026-01-15T10:00:00Z' }),
      recordTreatment({ ...base, id: 't2', price: 1800, performedAt: '2026-03-20T10:00:00Z' }),
      recordTreatment({ ...base, id: 't3', price: 2000, performedAt: '2026-05-10T10:00:00Z' }),
      recordTreatment({ ...base, id: 't4', price: 500, performedAt: '2026-06-15T10:00:00Z', customerId: 'c2' }),
    ];
    const ltv = computeCustomerLTV(list, 'c1');
    expect(ltv.totalSpent).toBe(5000);
    expect(ltv.visitCount).toBe(3);
    expect(ltv.averageTicket).toBe(1667); // 5000/3 round
    expect(ltv.firstVisitAt).toBe('2026-01-15T10:00:00Z');
    expect(ltv.lastVisitAt).toBe('2026-05-10T10:00:00Z');
  });

  it('AC: computeCustomerLTV 對無紀錄客戶回零', () => {
    const ltv = computeCustomerLTV([], 'unknown');
    expect(ltv.totalSpent).toBe(0);
    expect(ltv.visitCount).toBe(0);
    expect(ltv.averageTicket).toBe(0);
    expect(ltv.firstVisitAt).toBeUndefined();
  });

  it('AC: computeAllLTV 依 totalSpent 降冪排序', () => {
    const list = [
      recordTreatment({ ...base, id: 'a', customerId: 'c1', price: 5000 }),
      recordTreatment({ ...base, id: 'b', customerId: 'c2', price: 30000 }),
      recordTreatment({ ...base, id: 'c', customerId: 'c3', price: 1200 }),
    ];
    const all = computeAllLTV(list);
    expect(all[0]!.customerId).toBe('c2');
    expect(all[1]!.customerId).toBe('c1');
    expect(all[2]!.customerId).toBe('c3');
  });

  it('AC: topSpenders 限 N 名', () => {
    const list = [
      recordTreatment({ ...base, id: 'a', customerId: 'c1', price: 1000 }),
      recordTreatment({ ...base, id: 'b', customerId: 'c2', price: 2000 }),
      recordTreatment({ ...base, id: 'c', customerId: 'c3', price: 3000 }),
    ];
    expect(topSpenders(list, 2)).toHaveLength(2);
    expect(topSpenders(list, 10)).toHaveLength(3);
  });
});