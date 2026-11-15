// AC-001：設計師（顧問）檔案併入帳號模型 — 併自 concierge Consultant（FR-018）
import { describe, it, expect } from 'vitest';
import {
  belongsToStore,
  createAccount,
  createDesignerProfile,
  createStore,
  describeDesigner,
  designersOfStore,
  findAccount,
  storesForAccount,
} from '@/lib/accounts';

const stores = [
  createStore({ id: 's1', workspaceId: 'w1', name: '示範一店' }),
  createStore({ id: 's2', workspaceId: 'w1', name: '示範二店' }),
  createStore({ id: 's9', workspaceId: 'w2', name: '示範他牌店' }),
];

const owner = createAccount({ id: 'a-owner', workspaceId: 'w1', name: '示範店主', role: 'owner' });
const manager = createAccount({ id: 'a-mgr', workspaceId: 'w1', name: '示範店長', role: 'manager', storeIds: ['s1'] });
const designer = createAccount({
  id: 'a-d1',
  workspaceId: 'w1',
  name: '示範設計師 A',
  role: 'designer',
  storeIds: ['s1', 's1'],
  profile: createDesignerProfile({ title: '資深美睫師', yearsExp: 6, specialties: ['自然款', ' 敏感眼周 ', ''] }),
});
const designer2 = createAccount({ id: 'a-d2', workspaceId: 'w1', name: '示範設計師 B', role: 'designer', storeIds: ['s2'] });

describe('AC-001 accounts — 設計師（顧問）檔案', () => {
  it('AC-001: 設計師檔案含職稱、年資、專長，屬於帳號', () => {
    expect(designer.profile).toEqual({ title: '資深美睫師', yearsExp: 6, specialties: ['自然款', '敏感眼周'] });
    expect(describeDesigner(designer)).toBe('資深美睫師 · 6 年資歷 · 自然款、敏感眼周');
    expect(describeDesigner(designer2)).toBe('');
  });

  it('AC-001: 檔案與帳號欄位驗證', () => {
    expect(() => createDesignerProfile({ title: '', yearsExp: 1 })).toThrow();
    expect(() => createDesignerProfile({ title: '美甲師', yearsExp: -1 })).toThrow();
    expect(() => createAccount({ id: 'x', workspaceId: 'w1', name: '示範', role: 'designer' })).toThrow();
    expect(() => createAccount({ id: 'x', workspaceId: 'w1', name: '示範', role: 'manager', storeIds: [] })).toThrow();
    expect(() => createAccount({ id: 'x', workspaceId: 'w1', name: '', role: 'owner' })).toThrow();
    expect(() => createAccount({ id: 'x', workspaceId: 'w1', name: '示範', role: 'admin' as never })).toThrow();
  });

  it('AC-001: storeIds 去重；店主可進入 workspace 全部店，其餘只有所屬店', () => {
    expect(designer.storeIds).toEqual(['s1']);
    expect(storesForAccount(owner, stores).map((s) => s.id)).toEqual(['s1', 's2']);
    expect(storesForAccount(manager, stores).map((s) => s.id)).toEqual(['s1']);
    expect(storesForAccount(designer2, stores).map((s) => s.id)).toEqual(['s2']);
  });

  it('AC-001: belongsToStore 不跨 workspace', () => {
    expect(belongsToStore(owner, stores[1]!)).toBe(true);
    expect(belongsToStore(owner, stores[2]!)).toBe(false);
    expect(belongsToStore(designer, stores[0]!)).toBe(true);
    expect(belongsToStore(designer, stores[1]!)).toBe(false);
  });

  it('AC-001: 取代單純 designerId——可由 id 查回設計師與其店別的設計師清單', () => {
    const accounts = [owner, manager, designer, designer2];
    expect(findAccount(accounts, 'a-d1')?.name).toBe('示範設計師 A');
    expect(findAccount(accounts, undefined)).toBeUndefined();
    expect(designersOfStore(accounts, 's1').map((a) => a.id)).toEqual(['a-d1']);
    expect(designersOfStore(accounts, 's2').map((a) => a.id)).toEqual(['a-d2']);
  });
});
