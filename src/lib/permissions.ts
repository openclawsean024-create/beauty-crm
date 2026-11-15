// Beauty CRM — 權限矩陣（FR-014）
// 純函式 can(account, action, resource)。M1 沒有真實登入與 server-side 授權，
// 這裡只是模型層：UI 與 crm-store 的每個寫入動作都會先問 can()。
//
// 規則：
// - 任何動作都不可跨 workspace。
// - 店主：workspace 內所有店的全部動作。
// - 店長：只限所屬店；可看 S 級敏感欄位、可改設定；不可匯出、刪除客戶、清除資料。
// - 設計師：只限所屬店；可讀寫一般客戶資料與服務紀錄；
//   S 級敏感欄位只有「該客戶的負責設計師」可看可寫；不可匯出、刪除、改設定。

import type { Account, Store } from './accounts';
import type { Customer } from './customers';
import { stripSensitive } from './sensitive';

export const ACTIONS = [
  'customer:read',
  'customer:create',
  'customer:update',
  'customer:delete',
  'customer:readSensitive',
  'customer:writeSensitive',
  'visit:create',
  'appointment:write',
  'package:write',
  'draft:write',
  'reminder:send',
  'settings:update',
  'data:export',
  'data:clear',
] as const;

export type Action = (typeof ACTIONS)[number];

export interface Resource {
  workspaceId: string;
  /** 店層級資源（客戶、療程、預約…）必填；workspace 層級動作（匯出、清除）可省略 */
  storeId?: string;
  /** 客戶的負責設計師 */
  ownerDesignerId?: string;
}

export class PermissionError extends Error {
  readonly code = 'PERMISSION_DENIED';
  constructor(public readonly action: Action) {
    super(`PERMISSION_DENIED: ${action}`);
    this.name = 'PermissionError';
  }
}

const OWNER_ONLY: ReadonlySet<Action> = new Set<Action>(['customer:delete', 'data:export', 'data:clear']);
const SENSITIVE: ReadonlySet<Action> = new Set<Action>(['customer:readSensitive', 'customer:writeSensitive']);
const STORE_STAFF: ReadonlySet<Action> = new Set<Action>([
  'customer:read',
  'customer:create',
  'customer:update',
  'visit:create',
  'appointment:write',
  'package:write',
  'draft:write',
  'reminder:send',
]);

function inStore(account: Account, resource: Resource): boolean {
  return resource.storeId !== undefined && account.storeIds.includes(resource.storeId);
}

export function can(account: Account | undefined, action: Action, resource: Resource): boolean {
  if (!account) return false;
  if (account.workspaceId !== resource.workspaceId) return false;
  if (account.role === 'owner') return true;
  if (OWNER_ONLY.has(action)) return false;

  // 店長、設計師：所有其餘動作都必須落在所屬店
  if (!inStore(account, resource)) return false;

  if (account.role === 'manager') return true;

  // designer
  if (SENSITIVE.has(action)) return resource.ownerDesignerId === account.id;
  return STORE_STAFF.has(action);
}

export function assertCan(account: Account | undefined, action: Action, resource: Resource): void {
  if (!can(account, action, resource)) throw new PermissionError(action);
}

/** 由客戶與店別清單組出權限資源。找不到店時 workspaceId 為空字串（一律拒絕）。 */
export function customerResource(
  customer: Pick<Customer, 'storeId' | 'ownerDesignerId'>,
  stores: Store[],
): Resource {
  const store = stores.find((s) => s.id === customer.storeId);
  return {
    workspaceId: store?.workspaceId ?? '',
    storeId: customer.storeId,
    ownerDesignerId: customer.ownerDesignerId,
  };
}

export function storeResource(store: Pick<Store, 'id' | 'workspaceId'>): Resource {
  return { workspaceId: store.workspaceId, storeId: store.id };
}

export function canReadCustomer(account: Account | undefined, customer: Customer, stores: Store[]): boolean {
  return can(account, 'customer:read', customerResource(customer, stores));
}

export function canReadSensitive(account: Account | undefined, customer: Customer, stores: Store[]): boolean {
  return can(account, 'customer:readSensitive', customerResource(customer, stores));
}

/** 該帳號看得到的客戶（可再限定店別）。 */
export function visibleCustomers(
  account: Account | undefined,
  customers: Customer[],
  stores: Store[],
  storeId?: string,
): Customer[] {
  return customers.filter(
    (c) => (!storeId || c.storeId === storeId) && canReadCustomer(account, c, stores),
  );
}

export interface CustomerView {
  customer: Customer;
  /** true = 這個帳號無權看 S 級欄位，customer 內的 S 級欄位已被清空 */
  sensitiveHidden: boolean;
}

/**
 * 輸出給 UI 的客戶：無權看 S 級欄位時直接清空，而不是交給畫面自己隱藏。
 * 讀不到客戶本身時回傳 undefined。
 */
export function viewCustomer(
  account: Account | undefined,
  customer: Customer,
  stores: Store[],
): CustomerView | undefined {
  if (!canReadCustomer(account, customer, stores)) return undefined;
  if (canReadSensitive(account, customer, stores)) return { customer, sensitiveHidden: false };
  return { customer: stripSensitive(customer), sensitiveHidden: true };
}
