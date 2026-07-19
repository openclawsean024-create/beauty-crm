import { describe, it, expect } from 'vitest';
import {
  recordTreatment,
  treatmentsByCustomer,
  lastTreatment,
  suggestRecallDays,
} from '@/lib/treatments';

const baseDraft = {
  id: 't1',
  customerId: 'c1',
  category: 'manicure' as const,
  serviceName: '凝膠美甲',
  price: 1200,
  durationMin: 90,
  performedAt: '2026-07-01T10:00:00.000Z',
};

describe('treatments — 療程紀錄 domain', () => {
  it('AC: recordTreatment 通過驗證後回傳標準結構', () => {
    const t = recordTreatment(baseDraft);
    expect(t.id).toBe('t1');
    expect(t.serviceName).toBe('凝膠美甲');
    expect(t.price).toBe(1200);
  });

  it('AC: 必填欄位缺失 throw', () => {
    expect(() => recordTreatment({ ...baseDraft, id: '' })).toThrow();
    expect(() => recordTreatment({ ...baseDraft, customerId: '' })).toThrow();
    expect(() => recordTreatment({ ...baseDraft, serviceName: '' })).toThrow();
  });

  it('AC: 價格不可為負、duration 必 > 0', () => {
    expect(() => recordTreatment({ ...baseDraft, price: -1 })).toThrow();
    expect(() => recordTreatment({ ...baseDraft, durationMin: 0 })).toThrow();
  });

  it('AC: 無效時間 throw', () => {
    expect(() => recordTreatment({ ...baseDraft, performedAt: 'not-a-date' })).toThrow();
  });

  it('AC: treatmentsByCustomer 依時間倒序', () => {
    const list = [
      recordTreatment({ ...baseDraft, id: 't1', performedAt: '2026-07-01T10:00:00Z' }),
      recordTreatment({ ...baseDraft, id: 't2', performedAt: '2026-07-10T10:00:00Z' }),
      recordTreatment({ ...baseDraft, id: 't3', performedAt: '2026-06-15T10:00:00Z', customerId: 'c2' }),
    ];
    const mine = treatmentsByCustomer(list, 'c1');
    expect(mine).toHaveLength(2);
    expect(mine[0]!.id).toBe('t2');
    expect(mine[1]!.id).toBe('t1');
  });

  it('AC: lastTreatment 回傳最近一筆', () => {
    const list = [
      recordTreatment({ ...baseDraft, id: 't1', performedAt: '2026-07-01T10:00:00Z' }),
      recordTreatment({ ...baseDraft, id: 't2', performedAt: '2026-07-10T10:00:00Z' }),
    ];
    expect(lastTreatment(list, 'c1')!.id).toBe('t2');
    expect(lastTreatment(list, 'unknown')).toBeUndefined();
  });

  it('AC: 4 大療程類別各有合理回訪天數', () => {
    expect(suggestRecallDays('manicure')).toBe(28);
    expect(suggestRecallDays('eyelash')).toBe(21);
    expect(suggestRecallDays('skincare')).toBe(30);
    expect(suggestRecallDays('hair')).toBe(45);
  });
});