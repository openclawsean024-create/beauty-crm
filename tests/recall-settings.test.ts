// AC-003：店家可調整 4 類服務的回訪天數，調整後回訪日重算（FR-003）
import { describe, it, expect } from 'vitest';
import { updateRecallSetting } from '@/lib/crm-store';
import { loadCrmState, saveCrmState } from '@/lib/local-store';
import { PermissionError } from '@/lib/permissions';
import { buildRecallQueue } from '@/lib/recall-queue';
import {
  defaultRecallSettings,
  isDefaultRecallSettings,
  normalizeRecallSettings,
  recallDaysFor,
  setRecallDays,
} from '@/lib/recall-settings';
import { computeReminder } from '@/lib/reminders';
import { FIXED_TODAY, MemoryStorage, ctxFor, seedState } from './helpers/crm-fixture';

describe('AC-003 recall-settings — 回訪天數設定', () => {
  it('AC-003: 預設值等於既有 4 類週期（28／21／30／45）', () => {
    expect(defaultRecallSettings()).toEqual({ manicure: 28, eyelash: 21, skincare: 30, hair: 45 });
    expect(isDefaultRecallSettings(defaultRecallSettings())).toBe(true);
  });

  it('AC-003: 只接受 1–365 的整數', () => {
    const base = defaultRecallSettings();
    expect(setRecallDays(base, 'eyelash', 14)).toEqual({ ...base, eyelash: 14 });
    expect(base.eyelash).toBe(21); // 不改動原物件
    for (const bad of [0, -1, 366, 2.5, Number.NaN]) {
      expect(() => setRecallDays(base, 'eyelash', bad)).toThrow();
    }
    expect(() => setRecallDays(base, 'spa' as never, 10)).toThrow();
  });

  it('AC-003: 調整後 computeReminder 的回訪日與逾期天數重算', () => {
    const state = seedState();
    const customer = state.customers.find((c) => c.id === 'cust-a')!;
    const before = computeReminder(customer, state.treatments, FIXED_TODAY, 7, state.recallSettings);
    expect(before).toMatchObject({ suggestedRecallAt: '2026-11-09', daysUntilRecall: -7, status: 'overdue' });

    const settings = setRecallDays(state.recallSettings, 'hair', 60);
    const after = computeReminder(customer, state.treatments, FIXED_TODAY, 7, settings);
    expect(after).toMatchObject({ suggestedRecallAt: '2026-11-24', daysUntilRecall: 8, status: 'upcoming' });
    // 未傳設定時維持預設行為（既有呼叫不受影響）
    expect(computeReminder(customer, state.treatments, FIXED_TODAY).daysUntilRecall).toBe(-7);
  });

  it('AC-003: 店主與店長可調整，設計師被拒；調整後待聯絡清單改變並可保存', () => {
    const state = seedState();
    const queue = (s: typeof state) =>
      buildRecallQueue({ customers: s.customers.filter((c) => c.storeId === 'store-1'), treatments: s.treatments, recallSettings: s.recallSettings, today: FIXED_TODAY })
        .map((r) => r.customer.id);
    expect(queue(state)).toContain('cust-e');

    expect(() => updateRecallSetting(state, 'manicure', 60, ctxFor(state, 'acc-designer-b'))).toThrow(PermissionError);

    const byManager = updateRecallSetting(state, 'manicure', 60, ctxFor(state, 'acc-manager'));
    expect(byManager.recallSettings.manicure).toBe(60);
    expect(queue(byManager)).not.toContain('cust-e'); // 40 天前做的美甲，60 天週期 → 還有 20 天

    const byOwner = updateRecallSetting(byManager, 'eyelash', 30, ctxFor(state, 'acc-owner'));
    const storage = new MemoryStorage();
    saveCrmState(storage, byOwner);
    expect(loadCrmState(storage)?.recallSettings).toEqual({ manicure: 60, eyelash: 30, skincare: 30, hair: 45 });
  });

  it('AC-003: 從 localStorage 還原時，不合法的值回到預設', () => {
    expect(normalizeRecallSettings({ manicure: 35, eyelash: 'x', skincare: 0, hair: 400 })).toEqual({
      manicure: 35,
      eyelash: 21,
      skincare: 30,
      hair: 45,
    });
    expect(normalizeRecallSettings(null)).toEqual(defaultRecallSettings());
    expect(recallDaysFor({ hair: 50 }, 'hair')).toBe(50);
    expect(recallDaysFor(undefined, 'hair')).toBe(45);
  });
});
