// AC-006：店主可刪除單一客戶（連同全部相關資料與 localStorage），以及清除本機全部資料。
import { describe, it, expect } from 'vitest';
import {
  CrmError,
  addAppointment,
  approveCustomerDraft,
  deleteCustomer,
  markContacted,
  saveDraft,
  sendReminder,
} from '@/lib/crm-store';
import { createDryRunLineAdapter } from '@/lib/line-reminder';
import {
  ALL_LOCAL_KEYS,
  CRM_DATA_KEY,
  CRM_SENSITIVE_KEY,
  clearLocalData,
  decodeVault,
  loadCrmState,
  saveCrmState,
} from '@/lib/local-store';
import { PERSISTENCE_KEY, appendVisit, makeVisitRecord, removeVisitsForClient } from '@/lib/persistence';
import { buildEmptyDemoState } from '@/lib/seed';
import { PermissionError } from '@/lib/permissions';
import { FIXED_TODAY, MemoryStorage, ctxFor, seedState } from './helpers/crm-fixture';

/** 讓 cust-a 在每一種資料表裡都有紀錄。 */
function fullyPopulated() {
  let state = seedState();
  const ctx = ctxFor(state, 'acc-designer-a');
  state = saveDraft(state, 'cust-a', '示範客戶 A 您好', ctx);
  state = approveCustomerDraft(state, 'cust-a', ctx);
  state = sendReminder(state, 'cust-a', createDryRunLineAdapter({ now: () => FIXED_TODAY }), ctx).state;
  state = saveDraft(state, 'cust-a', '示範客戶 A 您好（第二版）', ctx);
  state = markContacted(state, { id: 'k-a', customerId: 'cust-a', channel: 'phone' }, ctx);
  state = addAppointment(state, { id: 'ap-a', customerId: 'cust-a', designerId: 'acc-designer-a', date: '2026-11-25', time: '10:00' }, ctx);
  return state;
}

describe('AC-006 customer-delete — 刪除單一客戶', () => {
  it('AC-006: 連同療程、預約、套票、效果、草稿、聯絡、發送與同意紀錄一併移除', () => {
    const state = fullyPopulated();
    const has = (s: typeof state) => ({
      customers: s.customers.filter((c) => c.id === 'cust-a').length,
      treatments: s.treatments.filter((r) => r.customerId === 'cust-a').length,
      packages: s.packages.filter((r) => r.customerId === 'cust-a').length,
      appointments: s.appointments.filter((r) => r.customerId === 'cust-a').length,
      effects: s.effects.filter((r) => r.customerId === 'cust-a').length,
      drafts: s.drafts.filter((r) => r.customerId === 'cust-a').length,
      contactLog: s.contactLog.filter((r) => r.customerId === 'cust-a').length,
      sendLog: s.sendLog.filter((r) => r.customerId === 'cust-a').length,
      consentLog: s.consentLog.filter((r) => r.customerId === 'cust-a').length,
    });
    expect(has(state)).toEqual({
      customers: 1,
      treatments: 9,
      packages: 1,
      appointments: 2,
      effects: 3,
      drafts: 1,
      contactLog: 1,
      sendLog: 1,
      consentLog: 2,
    });

    const deleted = deleteCustomer(state, 'cust-a', ctxFor(state, 'acc-owner'));
    expect(has(deleted)).toEqual({
      customers: 0,
      treatments: 0,
      packages: 0,
      appointments: 0,
      effects: 0,
      drafts: 0,
      contactLog: 0,
      sendLog: 0,
      consentLog: 0,
    });
    // 其他客戶的資料數量不變
    expect(deleted.customers).toHaveLength(state.customers.length - 1);
    expect(deleted.treatments).toHaveLength(state.treatments.length - 9);
    expect(deleted.contactLog.some((k) => k.customerId === 'cust-c')).toBe(true);
    expect(deleted.appointments.some((a) => a.customerId === 'cust-b')).toBe(true);
    // 原 state 不被改動
    expect(has(state).customers).toBe(1);
  });

  it('AC-006: 刪除後 localStorage 內找不到該客戶的任何資料', () => {
    const storage = new MemoryStorage();
    const state = fullyPopulated();
    saveCrmState(storage, state);
    expect(storage.dump()).toContain('示範客戶 A');
    expect(storage.dump()).toContain('cust-a');

    const deleted = deleteCustomer(state, 'cust-a', ctxFor(state, 'acc-owner'));
    saveCrmState(storage, deleted);
    const raw = storage.dump();
    expect(raw).not.toContain('示範客戶 A');
    expect(raw).not.toContain('cust-a');
    expect(raw).not.toContain('0900000001');
    expect(raw).not.toContain('U00000000000000000000000000000001');
    const vault = decodeVault(storage.getItem(CRM_SENSITIVE_KEY));
    expect(vault.customers['cust-a']).toBeUndefined();
    expect(vault.effects).toEqual([]);
    expect(loadCrmState(storage)?.customers.some((c) => c.id === 'cust-a')).toBe(false);
  });

  it('AC-006: 舊版 visitLog／lastVisit 內同名紀錄一併移除', () => {
    let persisted = {};
    persisted = appendVisit(persisted, makeVisitRecord({ clientName: '示範客戶 B', service: '深層清潔', date: '2026-11-01', amount: 1600, note: '', consent: true }));
    persisted = appendVisit(persisted, makeVisitRecord({ clientName: '示範客戶 A', service: '染髮補色', date: '2026-11-02', amount: 3200, note: '示範備註', consent: true }));
    const cleaned = removeVisitsForClient(persisted, '示範客戶 A');
    expect(cleaned.visitLog?.map((v) => v.clientName)).toEqual(['示範客戶 B']);
    expect(cleaned.lastVisit?.clientName).toBe('示範客戶 B');
    expect(JSON.stringify(cleaned)).not.toContain('示範客戶 A');

    const onlyOne = appendVisit({}, makeVisitRecord({ clientName: '示範客戶 A', service: '染髮補色', date: '2026-11-02', amount: 3200, note: '', consent: true }));
    const emptied = removeVisitsForClient(onlyOne, '示範客戶 A');
    expect(emptied.visitLog).toEqual([]);
    expect(emptied.lastVisit).toBeUndefined();
  });

  it('AC-006: 只有店主可刪除；刪除不存在的客戶回報 NOT_FOUND', () => {
    const state = seedState();
    for (const id of ['acc-manager', 'acc-designer-a', 'acc-designer-b', 'acc-designer-c']) {
      expect(() => deleteCustomer(state, 'cust-a', ctxFor(state, id))).toThrow(PermissionError);
    }
    try {
      deleteCustomer(state, 'cust-404', ctxFor(state, 'acc-owner'));
      throw new Error('should have thrown');
    } catch (err) {
      expect((err as CrmError).code).toBe('NOT_FOUND');
    }
  });
});

describe('AC-006 清除本機全部資料', () => {
  it('AC-006: 移除 CRM 資料、S 級保管箱與偏好／舊版來訪紀錄三個 key', () => {
    const storage = new MemoryStorage();
    saveCrmState(storage, seedState());
    storage.setItem(PERSISTENCE_KEY, JSON.stringify({ lang: 'zh', theme: 'dark', visitLog: [] }));
    storage.setItem('unrelated-app-key', 'keep-me');
    expect(ALL_LOCAL_KEYS).toEqual([CRM_DATA_KEY, CRM_SENSITIVE_KEY, PERSISTENCE_KEY]);
    for (const key of ALL_LOCAL_KEYS) expect(storage.getItem(key)).not.toBeNull();

    expect(clearLocalData(storage)).toBe(true);
    for (const key of ALL_LOCAL_KEYS) expect(storage.getItem(key)).toBeNull();
    expect(storage.getItem('unrelated-app-key')).toBe('keep-me'); // 不動別人的資料
    expect(loadCrmState(storage)).toBeUndefined();
    expect(clearLocalData(undefined)).toBe(true);
  });

  it('AC-006: 清除後的空白狀態只剩店別、帳號與品項，沒有任何客戶資料', () => {
    const empty = buildEmptyDemoState();
    expect(empty.customers).toEqual([]);
    expect(empty.treatments).toEqual([]);
    expect(empty.effects).toEqual([]);
    expect(empty.consentLog).toEqual([]);
    expect(empty.stores).toHaveLength(2);
    expect(empty.accounts.length).toBeGreaterThan(0);
    const storage = new MemoryStorage();
    saveCrmState(storage, empty);
    expect(storage.dump()).not.toContain('示範客戶');
    expect(storage.dump()).not.toMatch(/09000000\d{2}/);
  });
});
