import { describe, it, expect } from 'vitest';
import { computeReminder, listOverdue, listDueSoon } from '@/lib/reminders';
import { createCustomer } from '@/lib/customers';
import { recordTreatment } from '@/lib/treatments';

const today = new Date('2026-07-19T00:00:00Z');

function mkCustomer(id: string) {
  return createCustomer({ id, name: `C${id}`, phone: '0912345678' });
}

describe('reminders — 回訪提醒', () => {
  it('AC: 沒療程紀錄 → status=no-history', () => {
    const c = mkCustomer('c1');
    const r = computeReminder(c, [], today);
    expect(r.status).toBe('no-history');
    expect(r.daysUntilRecall).toBe(0);
  });

  it('AC: manicure 在 28 天後到期 → 7/19 為 21 天後到期算 due-soon', () => {
    const c = mkCustomer('c1');
    // performed 2026-06-28 → recall 2026-07-26 → today 7/19 → +7 days
    const t = recordTreatment({
      id: 't1',
      customerId: 'c1',
      category: 'manicure',
      serviceName: '凝膠',
      price: 1200,
      durationMin: 90,
      performedAt: '2026-06-28T10:00:00Z',
    });
    const r = computeReminder(c, [t], today, 7);
    expect(r.status).toBe('due-soon');
    expect(r.suggestedRecallAt).toBe('2026-07-26');
  });

  it('AC: 過期 5 天 → overdue', () => {
    const c = mkCustomer('c1');
    // eyelash recall = 21 天 → performed 2026-06-13 → recall 2026-07-04 → 7/19 已過 15 天
    const t = recordTreatment({
      id: 't1',
      customerId: 'c1',
      category: 'eyelash',
      serviceName: '美睫',
      price: 1500,
      durationMin: 60,
      performedAt: '2026-06-13T10:00:00Z',
    });
    const r = computeReminder(c, [t], today);
    expect(r.status).toBe('overdue');
    expect(r.daysUntilRecall).toBeLessThan(0);
  });

  it('AC: listOverdue 只回 overdue 並依過期天數排序', () => {
    const c1 = mkCustomer('c1');
    const c2 = mkCustomer('c2');
    const c3 = mkCustomer('c3');
    const treatments = [
      // c1 manicure 5/20 + 28 = 6/17, today 7/19 → overdue -32 days
      recordTreatment({ id: 'a', customerId: 'c1', category: 'manicure', serviceName: 'A', price: 1, durationMin: 60, performedAt: '2026-05-20T10:00:00Z' }),
      // c2 eyelash 5/30 + 21 = 6/20, today 7/19 → overdue -29 days
      recordTreatment({ id: 'b', customerId: 'c2', category: 'eyelash', serviceName: 'B', price: 1, durationMin: 60, performedAt: '2026-05-30T10:00:00Z' }),
      // c3 hair 7/15 + 45 = 8/29, today 7/19 → +41 upcoming
      recordTreatment({ id: 'c', customerId: 'c3', category: 'hair', serviceName: 'C', price: 1, durationMin: 60, performedAt: '2026-07-15T10:00:00Z' }),
    ];
    const overdue = listOverdue([c1, c2, c3], treatments, today);
    expect(overdue).toHaveLength(2);
    expect(overdue[0]!.customerId).toBe('c1'); // 過期最久優先
    expect(overdue[1]!.customerId).toBe('c2');
  });

  it('AC: listDueSoon 含 overdue + due-soon', () => {
    const c1 = mkCustomer('c1');
    const c2 = mkCustomer('c2');
    const c3 = mkCustomer('c3');
    const treatments = [
      recordTreatment({ id: 'a', customerId: 'c1', category: 'manicure', serviceName: 'A', price: 1, durationMin: 60, performedAt: '2026-05-20T10:00:00Z' }),
      recordTreatment({ id: 'b', customerId: 'c2', category: 'eyelash', serviceName: 'B', price: 1, durationMin: 60, performedAt: '2026-07-10T10:00:00Z' }),
      recordTreatment({ id: 'c', customerId: 'c3', category: 'hair', serviceName: 'C', price: 1, durationMin: 60, performedAt: '2026-07-15T10:00:00Z' }),
    ];
    const due = listDueSoon([c1, c2, c3], treatments, today, 14);
    // c1 overdue, c2 due-soon (recall 7/31, today 7/19 → 12 days)
    // c3 hair recall 45 days, 7/15+45 = 8/29 → 41 days upcoming
    expect(due.map((d) => d.customerId).sort()).toEqual(['c1', 'c2']);
  });
});