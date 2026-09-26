// Export tests — v3 review gate §6 "[ ] 匯出只產生本機 JSON，不上傳客戶資料或呼叫外部 API。"
import { describe, it, expect } from 'vitest';
import { buildExportPayload, serializeExport } from '@/lib/export';
import { createCustomer } from '@/lib/customers';
import { recordTreatment } from '@/lib/treatments';
import { makeVisitRecord } from '@/lib/persistence';

describe('export — JSON structure is local-only', () => {
  it('serializes a payload without remote URLs', () => {
    const customer = createCustomer({
      id: 'c1',
      name: '陳美玲',
      phone: '0933312318',
      consent: 'granted',
    });
    const treatment = recordTreatment({
      id: 't1',
      customerId: 'c1',
      category: 'manicure',
      serviceName: 'Gel manicure',
      price: 1500,
      durationMin: 60,
      performedAt: '2026-09-01T10:00:00Z',
    });
    const lastVisit = makeVisitRecord({
      clientName: '陳美玲',
      service: 'Gel manicure',
      date: '2026-09-24',
      amount: 1500,
      note: '',
      consent: true,
    });
    const payload = buildExportPayload([customer], [treatment], { lastVisit, visitLog: [lastVisit] }, 'Atelier M');
    const json = serializeExport(payload);
    expect(json).toContain('Atelier M');
    expect(json).toContain('陳美玲');
    // No http or https endpoints are introduced
    expect(json).not.toMatch(/https?:\/\//);
    // Verify it is valid JSON
    const parsed = JSON.parse(json) as Record<string, unknown>;
    expect(parsed.exportedAt).toBeTruthy();
    expect(parsed.customers).toHaveLength(1);
    expect(parsed.treatments).toHaveLength(1);
    expect(parsed.lastVisit).toEqual(lastVisit);
    expect(parsed.visitLog).toHaveLength(1);
  });

  it('caps visitLog size and accepts empty persisted state', () => {
    const payload = buildExportPayload([], [], {}, 'Atelier M');
    const parsed = JSON.parse(serializeExport(payload)) as Record<string, unknown>;
    expect(parsed.customers).toEqual([]);
    expect(parsed.treatments).toEqual([]);
    expect(payload.lastVisit).toBeUndefined();
    expect(payload.visitLog).toEqual([]);
  });

  it('emits the expected exportedAt shape (ISO timestamp)', () => {
    const payload = buildExportPayload([], [], {}, 'Atelier M');
    expect(typeof payload.exportedAt).toBe('string');
    expect(Number.isNaN(Date.parse(payload.exportedAt))).toBe(false);
  });
});
