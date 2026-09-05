// 測試 DoD-8 audit log：logEvent / getEvents / 不可變 / filter / clearEvents。
// 純函數 + 隔離測試（每個 it 用 describe.beforeEach 清空，避免事件污染）。

import { describe, it, expect, beforeEach } from 'vitest';
import { logEvent, getEvents, getAllEvents, clearEvents } from '@/lib/audit';

describe('audit — logEvent（DoD-8）', () => {
  beforeEach(() => {
    clearEvents();
  });

  it('AC: logEvent 必填 type + actor，缺一 throw', () => {
    expect(() => logEvent('' as unknown as 'treatment.recorded', {}, 'designer-amy')).toThrow(/type/);
    expect(() => logEvent('treatment.recorded', {}, '')).toThrow(/actor/);
    expect(() => logEvent('treatment.recorded', {}, '   ')).toThrow(/actor/);
  });

  it('AC: logEvent 回傳新 AuditEvent，欄位齊全', () => {
    const ev = logEvent(
      'treatment.recorded',
      { treatmentId: 't1', price: 1200 },
      'designer-amy',
    );
    expect(ev.id).toMatch(/^evt-/);
    expect(ev.type).toBe('treatment.recorded');
    expect(ev.actor).toBe('designer-amy');
    expect(ev.payload.treatmentId).toBe('t1');
    expect(ev.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('AC: logEvent 不可變 — getAllEvents 回傳新陣列', () => {
    logEvent('treatment.recorded', { id: 't1' }, 'd1');
    const a = getAllEvents();
    const b = getAllEvents();
    expect(a).not.toBe(b); // 新陣列
    expect(a).toHaveLength(1);
    expect(b).toHaveLength(1);
  });
});

describe('audit — getEvents filter', () => {
  beforeEach(() => {
    clearEvents();
  });

  it('AC: filter by type 精準命中', () => {
    logEvent('treatment.recorded', { x: 1 }, 'd1');
    logEvent('broadcast.approved', { x: 2 }, 'd1');
    logEvent('treatment.recorded', { x: 3 }, 'd2');
    const only = getEvents({ type: 'treatment.recorded' });
    expect(only).toHaveLength(2);
    expect(only.every((e) => e.type === 'treatment.recorded')).toBe(true);
  });

  it('AC: filter by actor 精準命中', () => {
    logEvent('treatment.recorded', {}, 'd1');
    logEvent('treatment.recorded', {}, 'd2');
    const d1Events = getEvents({ actor: 'd1' });
    expect(d1Events).toHaveLength(1);
    expect(d1Events[0]!.actor).toBe('d1');
  });

  it('AC: filter by since 只回傳該時間點之後', async () => {
    const before = new Date().toISOString();
    await new Promise((r) => setTimeout(r, 5));
    logEvent('treatment.recorded', {}, 'd1');
    const after = getEvents({ since: before });
    expect(after).toHaveLength(1);
    expect(after[0]!.at >= before).toBe(true);
  });

  it('AC: 多條件 filter 全部成立才命中', () => {
    logEvent('treatment.recorded', {}, 'd1');
    logEvent('treatment.recorded', {}, 'd2');
    logEvent('broadcast.approved', {}, 'd1');
    const filtered = getEvents({ type: 'treatment.recorded', actor: 'd1' });
    expect(filtered).toHaveLength(1);
  });

  it('AC: 無 filter → 回傳全部', () => {
    logEvent('treatment.recorded', {}, 'd1');
    logEvent('broadcast.approved', {}, 'd1');
    expect(getEvents()).toHaveLength(2);
  });
});

describe('audit — clearEvents', () => {
  beforeEach(() => {
    clearEvents();
  });

  it('AC: clearEvents 清空 in-memory log', () => {
    logEvent('treatment.recorded', {}, 'd1');
    logEvent('broadcast.approved', {}, 'd1');
    expect(getAllEvents()).toHaveLength(2);
    clearEvents();
    expect(getAllEvents()).toHaveLength(0);
  });
});

describe('audit — 整合：recordTreatment / approve / purge 觸發 audit', () => {
  beforeEach(() => {
    clearEvents();
  });

  it('AC: recordTreatment 會 log "treatment.recorded" event', async () => {
    const { recordTreatment } = await import('@/lib/treatments');
    recordTreatment({
      id: 't1',
      customerId: 'c1',
      category: 'manicure',
      serviceName: '凝膠美甲',
      price: 1200,
      durationMin: 90,
      performedAt: '2026-08-15T10:00:00Z',
      designerId: 'designer-amy',
    });
    const evs = getEvents({ type: 'treatment.recorded' });
    expect(evs).toHaveLength(1);
    expect(evs[0]!.actor).toBe('designer-amy');
    expect(evs[0]!.payload.treatmentId).toBe('t1');
  });
});
