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
    const c = createCustomer({ id: 'c1', name: '林小姐', phone: '0912345678' });
    expect(c.id).toBe('c1');
    expect(c.name).toBe('林小姐');
    expect(c.phone).toBe('0912345678');
    expect(c.consent).toBe('pending');
    expect(c.createdAt).toBeTruthy();
  });

  it('AC: phone 格式錯誤要 throw', () => {
    expect(() => createCustomer({ id: 'c1', name: 'X', phone: '1234' })).toThrow();
    expect(() => createCustomer({ id: 'c1', name: 'X', phone: '0812345678' })).toThrow();
  });

  it('AC: 空 id 或空 name throw', () => {
    expect(() => createCustomer({ id: '', name: 'X', phone: '0912345678' })).toThrow();
    expect(() => createCustomer({ id: 'c1', name: '', phone: '0912345678' })).toThrow();
  });

  it('AC: updateCustomer 改 updatedAt 但保留 createdAt', async () => {
    const c = createCustomer({ id: 'c1', name: 'A', phone: '0912345678' });
    await new Promise((r) => setTimeout(r, 5));
    const u = updateCustomer(c, { notes: 'VIP' });
    expect(u.notes).toBe('VIP');
    expect(u.createdAt).toBe(c.createdAt);
    expect(u.updatedAt).not.toBe(c.updatedAt);
  });

  it('AC: isMarketingReachable 只在 consent=granted 為 true', () => {
    const a = createCustomer({ id: 'c1', name: 'A', phone: '0912345678', consent: 'granted' });
    const b = createCustomer({ id: 'c2', name: 'B', phone: '0912345678', consent: 'pending' });
    const c = createCustomer({ id: 'c3', name: 'C', phone: '0912345678', consent: 'revoked' });
    expect(isMarketingReachable(a)).toBe(true);
    expect(isMarketingReachable(b)).toBe(false);
    expect(isMarketingReachable(c)).toBe(false);
  });

  it('AC: searchCustomers 對 name/phone/tag 都生效', () => {
    const list = [
      createCustomer({ id: '1', name: '王小美', phone: '0911111111', tags: ['VIP'] }),
      createCustomer({ id: '2', name: '林雅婷', phone: '0922222222', tags: ['新客'] }),
      createCustomer({ id: '3', name: 'Amy Chen', phone: '0933333333', tags: ['VIP'] }),
    ];
    expect(searchCustomers(list, '王')).toHaveLength(1);
    expect(searchCustomers(list, '0911')).toHaveLength(1);
    expect(searchCustomers(list, 'vip')).toHaveLength(2);
    expect(searchCustomers(list, 'amy')).toHaveLength(1);
    expect(searchCustomers(list, '')).toHaveLength(3);
  });

  it('AC: hasAllergyConflict 偵測成分衝突（不區分大小寫）', () => {
    const c = createCustomer({
      id: 'c1',
      name: '林',
      phone: '0912345678',
      allergies: ['對甲醛敏感', 'Fragrance'],
    });
    const ingredients = ['water', 'FRAGRANCE', 'glycerin'];
    const conflicts = hasAllergyConflict(c, ingredients);
    expect(conflicts).toContain('FRAGRANCE');
    expect(conflicts).toHaveLength(1);
  });

  it('AC: toggleConsent 在 granted/revoked 間切換', () => {
    const c = createCustomer({ id: 'c1', name: 'A', phone: '0912345678', consent: 'granted' });
    const revoked = toggleConsent(c);
    expect(revoked.consent).toBe('revoked');
    const back = toggleConsent(revoked);
    expect(back.consent).toBe('granted');
  });
});