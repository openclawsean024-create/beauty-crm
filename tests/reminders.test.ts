import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { computeReminder, listOverdue, listDueSoon, setOverride } from '@/lib/reminders';
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

describe('reminders — 時區正確性 (Asia/Taipei)', () => {
  // 守護 M1 時區修正：toDateOnly 必須用本地時區輸出 YYYY-MM-DD，
  // 避免舊實作 toISOString().slice(0,10) 在台灣使用者看到的「跨日 off-by-one」。
  beforeAll(() => {
    vi.stubEnv('TZ', 'Asia/Taipei');
  });
  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it('AC: suggestedRecallAt 使用本地時區，不會因 UTC 跨日而顯示錯誤日期', () => {
    const c = mkCustomer('c1');
    // performedAt = 2026-06-30T20:00:00Z
    //   UTC date = 2026-06-30
    //   Taipei   = 2026-07-01 04:00
    // 28 天後 recallDate = 2026-07-28T20:00:00Z
    //   UTC date = 2026-07-28
    //   Taipei   = 2026-07-29 04:00
    // 舊 (toISOString) → '2026-07-28' 對台灣使用者錯
    // 新 (本地時區) → '2026-07-29' 對台灣使用者對
    const t = recordTreatment({
      id: 't1',
      customerId: 'c1',
      category: 'manicure',
      serviceName: 'X',
      price: 1000,
      durationMin: 60,
      performedAt: '2026-06-30T20:00:00Z',
    });
    const r = computeReminder(c, [t], new Date('2026-07-19T00:00:00Z'));
    expect(r.suggestedRecallAt).toBe('2026-07-29');
  });
});

describe('reminders — FR-003 / FR-004 / AC-002 可調週期 + 手動覆寫', () => {
  it('AC-002 / FR-003: computeReminder 接受 customRules 影響 suggestedRecallAt', () => {
    const c = mkCustomer('c1');
    // 6/28 manicure → 預設 28 天 = 7/26；自訂 14 天 = 7/12
    const t = recordTreatment({
      id: 't1', customerId: 'c1', category: 'manicure', serviceName: 'X',
      price: 100, durationMin: 30, performedAt: '2026-06-28T10:00:00Z',
    });
    const base = computeReminder(c, [t], today, 7);
    expect(base.suggestedRecallAt).toBe('2026-07-26');
    const custom = computeReminder(c, [t], today, 7, { manicure: 14 });
    expect(custom.suggestedRecallAt).toBe('2026-07-12');
  });

  it('AC-002 / FR-003: customRules 部分覆寫 — 沒列的 category 用 DEFAULT', () => {
    const c = mkCustomer('c1');
    // 用 eyelash 測試：customRules 只覆寫 manicure
    const t = recordTreatment({
      id: 't1', customerId: 'c1', category: 'eyelash', serviceName: 'X',
      price: 100, durationMin: 30, performedAt: '2026-06-28T10:00:00Z',
    });
    const r = computeReminder(c, [t], today, 7, { manicure: 14 });
    // eyelash 仍用 DEFAULT 21 天 → 7/19
    expect(r.suggestedRecallAt).toBe('2026-07-19');
  });

  it('AC-002 / FR-004: setOverride 設定欄位 + 不可變', () => {
    const c = mkCustomer('c1');
    const t = recordTreatment({
      id: 't1', customerId: 'c1', category: 'manicure', serviceName: 'X',
      price: 100, durationMin: 30, performedAt: '2026-06-28T10:00:00Z',
    });
    const base = computeReminder(c, [t], today);
    expect(base.overrideAt).toBeUndefined();
    expect(base.overriddenBy).toBeUndefined();
    expect(base.overrideReason).toBeUndefined();

    const overridden = setOverride(base, {
      overrideAt: '2026-08-15T00:00:00.000Z',
      overriddenBy: 'designer-A',
      overrideReason: '客戶出國延期',
    });
    expect(overridden.overrideAt).toBe('2026-08-15T00:00:00.000Z');
    expect(overridden.overriddenBy).toBe('designer-A');
    expect(overridden.overrideReason).toBe('客戶出國延期');
    // immutability
    expect(base.overrideAt).toBeUndefined();
    expect(base.overriddenBy).toBeUndefined();
    expect(base).not.toBe(overridden);
  });

  it('AC-002 / FR-004: computeReminder 接受未來 override → suggestedRecallAt 用 overrideAt', () => {
    const c = mkCustomer('c1');
    // today 2026-07-19；6/28 + 28 = 7/26（base 7 天後）
    const t = recordTreatment({
      id: 't1', customerId: 'c1', category: 'manicure', serviceName: 'X',
      price: 100, durationMin: 30, performedAt: '2026-06-28T10:00:00Z',
    });
    const r = computeReminder(c, [t], today, 7, undefined, {
      overrideAt: '2026-08-15T00:00:00.000Z', // 27 天後（未來）
      overriddenBy: 'designer-A',
      overrideReason: '客戶出國',
    });
    expect(r.suggestedRecallAt).toBe('2026-08-15');
    expect(r.overrideAt).toBe('2026-08-15T00:00:00.000Z');
    expect(r.overriddenBy).toBe('designer-A');
    expect(r.daysUntilRecall).toBe(27); // 從 today 算 27 天
  });

  it('AC-002 / FR-004: computeReminder 接受過去 override → 用 base suggestedRecallAt', () => {
    const c = mkCustomer('c1');
    const t = recordTreatment({
      id: 't1', customerId: 'c1', category: 'manicure', serviceName: 'X',
      price: 100, durationMin: 30, performedAt: '2026-06-28T10:00:00Z',
    });
    const r = computeReminder(c, [t], today, 7, undefined, {
      overrideAt: '2026-01-01T00:00:00.000Z', // 過去
      overriddenBy: 'designer-A',
    });
    // 過去 override 不影響計算 → 用 base 7/26
    expect(r.suggestedRecallAt).toBe('2026-07-26');
    // 但 override 紀錄仍保存供 audit
    expect(r.overrideAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('AC-002: setOverride 必填欄位缺失 throw', () => {
    const c = mkCustomer('c1');
    const t = recordTreatment({
      id: 't1', customerId: 'c1', category: 'manicure', serviceName: 'X',
      price: 100, durationMin: 30, performedAt: '2026-06-28T10:00:00Z',
    });
    const base = computeReminder(c, [t], today);
    expect(() => setOverride(base, { overrideAt: '', overriddenBy: 'x' })).toThrow(/overrideAt/);
    expect(() => setOverride(base, { overrideAt: '2026-08-15', overriddenBy: '' })).toThrow(/overriddenBy/);
  });
});