// AC-005：多店與帳號權限模型——權限矩陣逐格測試，並驗證不同角色看得到與看不到的資料。
import { describe, it, expect } from 'vitest';
import {
  addCustomer,
  addVisit,
  deleteCustomer,
  markContacted,
  updateCustomerProfile,
} from '@/lib/crm-store';
import {
  ACTIONS,
  PermissionError,
  can,
  customerResource,
  viewCustomer,
  visibleCustomers,
  type Action,
} from '@/lib/permissions';
import { storesForAccount } from '@/lib/accounts';
import { createAccount } from '@/lib/accounts';
import { FIXED_TODAY, account, ctxFor, seedState } from './helpers/crm-fixture';

const state = seedState();
const owner = account(state, 'acc-owner');
const manager = account(state, 'acc-manager'); // 一店
const designerA = account(state, 'acc-designer-a'); // 一店，cust-a、cust-f 的負責設計師
const designerB = account(state, 'acc-designer-b'); // 一店，cust-b…e 的負責設計師
const designerC = account(state, 'acc-designer-c'); // 二店

const WS = state.workspace.id;
/** 四種資源情境 */
const ownStoreOwnCustomer = { workspaceId: WS, storeId: 'store-1', ownerDesignerId: 'acc-designer-a' };
const ownStoreOtherCustomer = { workspaceId: WS, storeId: 'store-1', ownerDesignerId: 'acc-designer-b' };
const otherStore = { workspaceId: WS, storeId: 'store-2', ownerDesignerId: 'acc-designer-c' };
const otherWorkspace = { workspaceId: 'ws-other', storeId: 'store-1', ownerDesignerId: 'acc-designer-a' };

type Row = [Action, boolean, boolean, boolean, boolean];

describe('AC-005 permissions — 權限矩陣', () => {
  it('AC-005: 矩陣涵蓋全部 14 個動作', () => {
    expect(ACTIONS).toHaveLength(14);
  });

  // 欄位：[動作, 本店且自己負責的客戶, 本店但別人負責的客戶, 別店, 別的 workspace]
  const OWNER: Row[] = ACTIONS.map((a) => [a, true, true, true, false]);
  const MANAGER: Row[] = [
    ['customer:read', true, true, false, false],
    ['customer:create', true, true, false, false],
    ['customer:update', true, true, false, false],
    ['customer:delete', false, false, false, false],
    ['customer:readSensitive', true, true, false, false],
    ['customer:writeSensitive', true, true, false, false],
    ['visit:create', true, true, false, false],
    ['appointment:write', true, true, false, false],
    ['package:write', true, true, false, false],
    ['draft:write', true, true, false, false],
    ['reminder:send', true, true, false, false],
    ['settings:update', true, true, false, false],
    ['data:export', false, false, false, false],
    ['data:clear', false, false, false, false],
  ];
  const DESIGNER: Row[] = [
    ['customer:read', true, true, false, false],
    ['customer:create', true, true, false, false],
    ['customer:update', true, true, false, false],
    ['customer:delete', false, false, false, false],
    ['customer:readSensitive', true, false, false, false],
    ['customer:writeSensitive', true, false, false, false],
    ['visit:create', true, true, false, false],
    ['appointment:write', true, true, false, false],
    ['package:write', true, true, false, false],
    ['draft:write', true, true, false, false],
    ['reminder:send', true, true, false, false],
    ['settings:update', false, false, false, false],
    ['data:export', false, false, false, false],
    ['data:clear', false, false, false, false],
  ];

  const cases: Array<[string, typeof owner, Row[]]> = [
    ['店主', owner, OWNER],
    ['店長（一店）', manager, MANAGER],
    ['設計師 A（一店）', designerA, DESIGNER],
  ];

  for (const [label, actor, rows] of cases) {
    it(`AC-005: ${label} 的矩陣涵蓋所有動作`, () => {
      expect(rows.map((r) => r[0]).sort()).toEqual([...ACTIONS].sort());
    });
    for (const [action, own, sameStore, crossStore, crossWorkspace] of rows) {
      it(`AC-005: ${label} × ${action}`, () => {
        expect(can(actor, action, ownStoreOwnCustomer), '本店・自己負責').toBe(own);
        expect(can(actor, action, ownStoreOtherCustomer), '本店・別人負責').toBe(sameStore);
        expect(can(actor, action, otherStore), '別店').toBe(crossStore);
        expect(can(actor, action, otherWorkspace), '別的 workspace').toBe(crossWorkspace);
      });
    }
  }

  it('AC-005: 未登入（沒有帳號）一律拒絕', () => {
    for (const action of ACTIONS) expect(can(undefined, action, ownStoreOwnCustomer)).toBe(false);
  });

  it('AC-005: 只有店主可匯出與刪除（workspace 層級資源）', () => {
    const workspaceLevel = { workspaceId: WS };
    expect(can(owner, 'data:export', workspaceLevel)).toBe(true);
    expect(can(owner, 'data:clear', workspaceLevel)).toBe(true);
    for (const actor of [manager, designerA, designerB, designerC]) {
      expect(can(actor, 'data:export', workspaceLevel)).toBe(false);
      expect(can(actor, 'data:clear', workspaceLevel)).toBe(false);
      expect(can(actor, 'customer:delete', ownStoreOwnCustomer)).toBe(false);
    }
  });

  it('AC-005: 屬於兩家店的店長兩邊都可操作，但仍不可匯出', () => {
    const both = createAccount({ id: 'acc-m2', workspaceId: WS, name: '示範區店長', role: 'manager', storeIds: ['store-1', 'store-2'] });
    expect(can(both, 'customer:read', otherStore)).toBe(true);
    expect(can(both, 'customer:readSensitive', ownStoreOtherCustomer)).toBe(true);
    expect(can(both, 'data:export', { workspaceId: WS })).toBe(false);
  });
});

describe('AC-005 不同角色看得到與看不到的資料', () => {
  const ids = (list: Array<{ id: string }>) => list.map((c) => c.id).sort();
  const ALL_STORE_1 = ['cust-a', 'cust-b', 'cust-c', 'cust-d', 'cust-e', 'cust-f'];
  const ALL_STORE_2 = ['cust-g', 'cust-h'];

  it('AC-005: 店主看得到兩家店的客戶；可切換的店別為全部', () => {
    expect(ids(visibleCustomers(owner, state.customers, state.stores))).toEqual([...ALL_STORE_1, ...ALL_STORE_2]);
    expect(storesForAccount(owner, state.stores).map((s) => s.id)).toEqual(['store-1', 'store-2']);
  });

  it('AC-005: 店長與設計師只看得到自己所屬店的客戶，看不到別店', () => {
    expect(ids(visibleCustomers(manager, state.customers, state.stores))).toEqual(ALL_STORE_1);
    expect(ids(visibleCustomers(designerA, state.customers, state.stores))).toEqual(ALL_STORE_1);
    expect(ids(visibleCustomers(designerC, state.customers, state.stores))).toEqual(ALL_STORE_2);
    // 即使指定別店的 storeId 也拿不到
    expect(visibleCustomers(designerA, state.customers, state.stores, 'store-2')).toEqual([]);
    expect(visibleCustomers(manager, state.customers, state.stores, 'store-2')).toEqual([]);
    expect(storesForAccount(designerA, state.stores).map((s) => s.id)).toEqual(['store-1']);
    expect(storesForAccount(designerC, state.stores).map((s) => s.id)).toEqual(['store-2']);
  });

  it('AC-005: S 級欄位——店主、店長、負責設計師看得到；同店其他設計師看到的是清空後的資料', () => {
    const custA = state.customers.find((c) => c.id === 'cust-a')!; // 負責：設計師 A
    expect(custA.allergies).toEqual(['香精']);

    for (const actor of [owner, manager, designerA]) {
      const view = viewCustomer(actor, custA, state.stores);
      expect(view?.sensitiveHidden).toBe(false);
      expect(view?.customer.allergies).toEqual(['香精']);
      expect(view?.customer.skinCondition).toBe('換季時頭皮容易乾燥');
    }

    const hidden = viewCustomer(designerB, custA, state.stores);
    expect(hidden?.sensitiveHidden).toBe(true);
    expect(hidden?.customer.allergies).toEqual([]);
    expect(hidden?.customer.skinCondition).toBeUndefined();
    expect(hidden?.customer.healthNotes).toBeUndefined();
    // 一般資料仍看得到
    expect(hidden?.customer.name).toBe('示範客戶 A');
    expect(JSON.stringify(hidden)).not.toContain('香精');

    // 別店的設計師連客戶本身都看不到
    expect(viewCustomer(designerC, custA, state.stores)).toBeUndefined();
  });

  it('AC-005: customerResource 找不到店時一律拒絕', () => {
    const orphan = customerResource({ storeId: 'store-404', ownerDesignerId: 'acc-designer-a' }, state.stores);
    expect(orphan.workspaceId).toBe('');
    expect(can(owner, 'customer:read', orphan)).toBe(false);
  });
});

describe('AC-005 crm-store 寫入動作會做權限檢查', () => {
  const visit = { id: 't-x', customerId: 'cust-g', catalogItemId: 'svc-cut', performedAt: FIXED_TODAY.toISOString() };

  it('AC-005: 跨店寫入被拒（一店設計師不可替二店客戶新增服務、編輯、標記聯絡）', () => {
    const ctx = ctxFor(state, 'acc-designer-a');
    expect(() => addVisit(state, visit, ctx)).toThrow(PermissionError);
    expect(() => updateCustomerProfile(state, 'cust-g', { notes: '示範' }, ctx)).toThrow(PermissionError);
    expect(() => markContacted(state, { id: 'k-x', customerId: 'cust-g' }, ctx)).toThrow(PermissionError);
    expect(() => addCustomer(state, { id: 'c-x', name: '示範客戶 X', phone: '0900000030', storeId: 'store-2' }, ctx)).toThrow(PermissionError);
    expect(() => addVisit(state, visit, ctxFor(state, 'acc-manager'))).toThrow(PermissionError);
    // 二店自己的設計師與店主可以
    expect(addVisit(state, visit, ctxFor(state, 'acc-designer-c')).treatments.some((t) => t.id === 't-x')).toBe(true);
    expect(addVisit(state, visit, ctxFor(state, 'acc-owner')).treatments.some((t) => t.id === 't-x')).toBe(true);
  });

  it('AC-005: 非負責設計師不可寫入 S 級欄位，但可改一般欄位', () => {
    const ctxB = ctxFor(state, 'acc-designer-b');
    expect(() => updateCustomerProfile(state, 'cust-a', { allergies: ['示範成分'] }, ctxB)).toThrow(PermissionError);
    expect(updateCustomerProfile(state, 'cust-a', { notes: '示範備註' }, ctxB).customers.find((c) => c.id === 'cust-a')?.notes).toBe('示範備註');
    const byOwnerDesigner = updateCustomerProfile(state, 'cust-a', { allergies: ['香精', '示範成分'] }, ctxFor(state, 'acc-designer-a'));
    expect(byOwnerDesigner.customers.find((c) => c.id === 'cust-a')?.allergies).toEqual(['香精', '示範成分']);
  });

  it('AC-005: 只有店主可刪除客戶', () => {
    expect(() => deleteCustomer(state, 'cust-f', ctxFor(state, 'acc-manager'))).toThrow(PermissionError);
    expect(() => deleteCustomer(state, 'cust-f', ctxFor(state, 'acc-designer-a'))).toThrow(PermissionError);
    expect(deleteCustomer(state, 'cust-f', ctxFor(state, 'acc-owner')).customers.some((c) => c.id === 'cust-f')).toBe(false);
  });

  it('AC-005: 負責設計師必須屬於該客戶的店', () => {
    expect(() =>
      addCustomer(state, { id: 'c-y', name: '示範客戶 Y', phone: '0900000031', storeId: 'store-1', ownerDesignerId: 'acc-designer-c' }, ctxFor(state, 'acc-owner')),
    ).toThrow();
  });
});
