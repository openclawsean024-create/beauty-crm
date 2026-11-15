import { describe, it, expect } from 'vitest';
import {
  createCustomer,
  updateCustomer,
  isMarketingReachable,
  searchCustomers,
  hasAllergyConflict,
  toggleConsent,
} from '@/lib/customers';

describe('customers — 客戶檔案 domain', () => {
  it('AC: 建立客戶必填 id/name/phone', () => {
    const c = createCustomer({ id: 'c1', name: '測試客戶 林', phone: '0900000001' });
    expect(c.id).toBe('c1');
    expect(c.name).toBe('測試客戶 林');
    expect(c.phone).toBe('0900000001');
    expect(c.consent).toBe('pending');
    expect(c.createdAt).toBeTruthy();
  });

  it('AC: phone 格式錯誤要 throw', () => {
    expect(() => createCustomer({ id: 'c1', name: '測試X', phone: '1234' })).toThrow();
    expect(() => createCustomer({ id: 'c1', name: '測試X', phone: '0812345678' })).toThrow();
  });

  it('AC: 空 id 或空 name throw', () => {
    expect(() => createCustomer({ id: '', name: '測試X', phone: '0900000001' })).toThrow();
    expect(() => createCustomer({ id: 'c1', name: '', phone: '0900000001' })).toThrow();
  });

  it('AC: updateCustomer 改 updatedAt 但保留 createdAt', async () => {
    const c = createCustomer({ id: 'c1', name: '測試A', phone: '0900000001' });
    await new Promise((r) => setTimeout(r, 5));
    const u = updateCustomer(c, { notes: 'VIP' });
    expect(u.notes).toBe('VIP');
    expect(u.createdAt).toBe(c.createdAt);
    expect(u.updatedAt).not.toBe(c.updatedAt);
  });

  it('AC: isMarketingReachable 只在 consent=granted 為 true', () => {
    const a = createCustomer({ id: 'c1', name: '測試A', phone: '0900000001', consent: 'granted' });
    const b = createCustomer({ id: 'c2', name: '測試B', phone: '0900000001', consent: 'pending' });
    const c = createCustomer({ id: 'c3', name: '測試C', phone: '0900000001', consent: 'revoked' });
    expect(isMarketingReachable(a)).toBe(true);
    expect(isMarketingReachable(b)).toBe(false);
    expect(isMarketingReachable(c)).toBe(false);
  });

  it('AC: searchCustomers 對 name/phone/tag 都生效', () => {
    const list = [
      createCustomer({ id: '1', name: '測試客戶 王', phone: '0900000011', tags: ['VIP'] }),
      createCustomer({ id: '2', name: '測試客戶 林', phone: '0900000022', tags: ['新客'] }),
      createCustomer({ id: '3', name: '測試客戶 Amy', phone: '0900000033', tags: ['VIP'] }),
    ];
    expect(searchCustomers(list, '王')).toHaveLength(1);
    expect(searchCustomers(list, '00011')).toHaveLength(1);
    expect(searchCustomers(list, 'vip')).toHaveLength(2);
    expect(searchCustomers(list, 'amy')).toHaveLength(1);
    expect(searchCustomers(list, '')).toHaveLength(3);
  });

  it('AC: hasAllergyConflict 偵測成分衝突（不區分大小寫）', () => {
    const c = createCustomer({
      id: 'c1',
      name: '測試客戶 林',
      phone: '0900000001',
      allergies: ['對甲醛敏感', 'Fragrance'],
    });
    const ingredients = ['water', 'FRAGRANCE', 'glycerin'];
    const conflicts = hasAllergyConflict(c, ingredients);
    expect(conflicts).toContain('FRAGRANCE');
    expect(conflicts).toHaveLength(1);
  });

  it('AC: toggleConsent 在 granted/revoked 間切換', () => {
    const c = createCustomer({ id: 'c1', name: '測試A', phone: '0900000001', consent: 'granted' });
    const revoked = toggleConsent(c);
    expect(revoked.consent).toBe('revoked');
    const back = toggleConsent(revoked);
    expect(back.consent).toBe('granted');
  });
});