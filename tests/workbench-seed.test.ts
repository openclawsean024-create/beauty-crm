// Beauty CRM — workbench seed 一致性測試
// 驗證 seed 客戶與療程的數量、同意狀態分佈,確保 demo 資料能展示
// queue/memory/funnel/next-action 4 種主要狀態。

import { describe, it, expect } from 'vitest';
import { getSeedCustomers, getSeedTreatments, TODAY_FIXED } from '@/components/workbench/seed';
import { listOverdue, listDueSoon } from '@/lib/reminders';
import type { Customer } from '@/lib/customers';
import type { Treatment } from '@/lib/treatments';

describe('workbench seed', () => {
  it('AC: 4 位 seed 客戶覆蓋 3 種 consent (granted × 2 / pending / revoked)', () => {
    const cs = getSeedCustomers();
    expect(cs).toHaveLength(4);
    expect(cs.filter((c) => c.consent === 'granted')).toHaveLength(2);
    expect(cs.filter((c) => c.consent === 'pending')).toHaveLength(1);
    expect(cs.filter((c) => c.consent === 'revoked')).toHaveLength(1);
  });

  it('AC: 4 筆 seed 療程分別屬於 4 種類別', () => {
    const ts = getSeedTreatments();
    expect(ts).toHaveLength(4);
    const cats = new Set(ts.map((t) => t.category));
    expect(cats).toEqual(new Set(['manicure', 'eyelash', 'skincare', 'hair']));
  });

  it('AC: TODAY_FIXED 為 2026-09-21,讓 demo 同時出現 overdue + due-soon', () => {
    expect(TODAY_FIXED.toISOString().slice(0, 10)).toBe('2026-09-21');
    const cs = getSeedCustomers() as unknown as Customer[];
    const ts = getSeedTreatments() as unknown as Treatment[];
    const overdue = listOverdue(cs, ts, TODAY_FIXED);
    const dueSoon = listDueSoon(cs, ts, TODAY_FIXED, 7);
    expect(overdue.length).toBeGreaterThan(0);
    expect(dueSoon.length).toBeGreaterThan(0);
    expect(dueSoon.length).toBeGreaterThanOrEqual(overdue.length);
  });

  it('AC: seed 客戶都有 displayName + initials', () => {
    for (const c of getSeedCustomers()) {
      expect(c.displayName).toBeTruthy();
      expect(c.initials).toBeTruthy();
    }
  });

  it('AC: seed 療程都帶 productIngredients 與 allergyDescription', () => {
    for (const t of getSeedTreatments()) {
      expect(Array.isArray(t.productIngredients)).toBe(true);
      expect(t.allergyDescription).toBeTruthy();
      expect(t.noteSummary).toBeTruthy();
    }
  });
});
