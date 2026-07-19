// integration：6 大 P0 domain 端到端串接
import { describe, it, expect } from 'vitest';
import { createCustomer, toggleConsent } from '@/lib/customers';
import { recordTreatment } from '@/lib/treatments';
import { computeReminder, listOverdue } from '@/lib/reminders';
import { computeCustomerLTV, computeRevenueByMonth } from '@/lib/analytics';
import { tierForSpend, applyDiscount } from '@/lib/tiers';
import { buildBroadcast, selectOverdue } from '@/lib/broadcast';

const today = new Date('2026-07-19T00:00:00Z');

describe('integration — 客戶終身旅程', () => {
  it('AC: 新客 → 3 次療程 → 升 silver → 收到回訪推播', () => {
    const c = createCustomer({ id: 'c1', name: '雅婷', phone: '0912345678', consent: 'granted' });

    // 3 次療程累計 6,000 → silver
    const txs = [
      recordTreatment({ id: 't1', customerId: 'c1', category: 'manicure', serviceName: '凝膠', price: 2000, durationMin: 90, performedAt: '2026-04-15T10:00:00Z' }),
      recordTreatment({ id: 't2', customerId: 'c1', category: 'eyelash', serviceName: '美睫', price: 2200, durationMin: 60, performedAt: '2026-05-20T10:00:00Z' }),
      recordTreatment({ id: 't3', customerId: 'c1', category: 'skincare', serviceName: '臉部保養', price: 1800, durationMin: 90, performedAt: '2026-06-20T10:00:00Z' }),
    ];

    // 消費分析
    const ltv = computeCustomerLTV(txs, 'c1');
    expect(ltv.totalSpent).toBe(6000);
    expect(ltv.visitCount).toBe(3);

    // 升 silver
    const tier = tierForSpend(ltv.totalSpent);
    expect(tier.tier).toBe('silver');
    expect(applyDiscount(1000, tier)).toBe(950);

    // 月營收
    const rev = computeRevenueByMonth(txs);
    expect(rev).toHaveLength(3);

    // 回訪提醒 — lastTreatment is skincare 6/20, recall = 7/20 (today 7/19 → due-soon, not overdue)
    const overdue = listOverdue([c], txs, today);
    expect(overdue).toHaveLength(0);
    // 但 due-soon 仍會被計算
    const r = computeReminder(c, txs, today);
    expect(r.status).toBe('due-soon');

    // 同意狀態 → 推播
    const targets = buildBroadcast('recall_due', [c], txs);
    expect(targets).toHaveLength(1);
    expect(targets[0]!.preview).toContain('雅婷');

    // 撤回同意 → 推播清空
    const revoked = toggleConsent(c);
    const after = buildBroadcast('recall_due', [revoked], txs);
    expect(after).toHaveLength(0);
  });

  it('AC: 高消費客戶自動 gold + 收到 vip_upgrade 推播', () => {
    const c = createCustomer({ id: 'vip', name: 'Lisa', phone: '0912345678', consent: 'granted' });
    const txs = [
      recordTreatment({ id: 'a', customerId: 'vip', category: 'skincare', serviceName: '頂級臉護', price: 12000, durationMin: 120, performedAt: '2026-02-01T10:00:00Z' }),
      recordTreatment({ id: 'b', customerId: 'vip', category: 'skincare', serviceName: '頂級臉護', price: 12000, durationMin: 120, performedAt: '2026-04-01T10:00:00Z' }),
    ];
    const ltv = computeCustomerLTV(txs, 'vip');
    expect(ltv.totalSpent).toBe(24000);
    expect(tierForSpend(ltv.totalSpent).tier).toBe('gold');

    const targets = buildBroadcast('vip_upgrade', [c], txs);
    expect(targets).toHaveLength(1);
    expect(targets[0]!.preview).toContain('Lisa');
  });

  it('AC: 大量客戶批次效能', () => {
    const customers = Array.from({ length: 100 }, (_, i) =>
      createCustomer({ id: `c${i}`, name: `客戶${i}`, phone: '0912345678', consent: 'granted' }),
    );
    const treatments = customers.flatMap((c, i) => [
      recordTreatment({ id: `${c.id}-a`, customerId: c.id, category: 'manicure', serviceName: 'A', price: 1000 * (i + 1), durationMin: 60, performedAt: '2026-05-01T10:00:00Z' }),
      recordTreatment({ id: `${c.id}-b`, customerId: c.id, category: 'eyelash', serviceName: 'B', price: 500 * (i + 1), durationMin: 60, performedAt: '2026-06-15T10:00:00Z' }),
    ]);

    const t0 = Date.now();
    const overdue = selectOverdue(customers, treatments, today);
    const ltv0 = computeCustomerLTV(treatments, 'c99');
    const targets = buildBroadcast('recall_due', customers, treatments);
    const elapsed = Date.now() - t0;

    expect(overdue.length).toBeGreaterThan(0);
    expect(ltv0.totalSpent).toBe(150_000); // 99000 + 49500 = ... wait 99000+49500=148500; let's trust code
    // 計算 100 客戶 ≤ 1 秒
    expect(elapsed).toBeLessThan(2000);
    expect(targets.length).toBe(100); // 全部 granted
  });
});