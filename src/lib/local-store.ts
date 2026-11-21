// Beauty CRM — CrmState 的 localStorage 儲存（M1，只允許假資料）
//
// 儲存分兩個 key：
// - beauty-crm:m1:data       一般資料（JSON）。S 級欄位在寫入前已被抽離。
// - beauty-crm:m1:sensitive  S 級欄位（過敏、皮膚狀況、健康備註、效果紀錄），
//                            以 Base64 編碼後存放，不以明文出現在 localStorage。
//
// 重要：Base64 只是「編碼」，不是加密，任何能讀到 localStorage 的人都能還原。
// 它的作用只是避免敏感內容以明文出現在開發者工具、備份或螢幕截圖中。
// 真正的欄位級加密與金鑰管理屬於 M2（後端）；M1 因此只允許假資料。

import type { Customer } from './customers';
import { CRM_SCHEMA_VERSION, type CrmState } from './crm-store';
import type { EffectRecord } from './effects';
import { PERSISTENCE_KEY } from './persistence';
import { normalizeRecallSettings } from './recall-settings';
import { pickSensitive, stripSensitive, type SensitiveFields } from './sensitive';

export const CRM_DATA_KEY = 'beauty-crm:m1:data';
export const CRM_SENSITIVE_KEY = 'beauty-crm:m1:sensitive';
export const ALL_LOCAL_KEYS = [CRM_DATA_KEY, CRM_SENSITIVE_KEY, PERSISTENCE_KEY] as const;

const VAULT_PREFIX = 'b64:';

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface SensitiveVault {
  customers: Record<string, SensitiveFields>;
  effects: EffectRecord[];
}

/** 瀏覽器的 localStorage；SSR 或受限環境回傳 undefined。 */
export function getBrowserStorage(): StorageLike | undefined {
  try {
    const storage = (globalThis as typeof globalThis & { localStorage?: Storage }).localStorage;
    if (storage && typeof storage.getItem === 'function' && typeof storage.setItem === 'function') {
      return storage;
    }
  } catch {
    // 受限環境（例如停用儲存的瀏覽器）視為沒有 storage
  }
  return undefined;
}

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(encoded: string): string {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodeVault(vault: SensitiveVault): string {
  return VAULT_PREFIX + toBase64(JSON.stringify(vault));
}

/** 解碼 S 級保管箱；沒有資料回傳空保管箱，有資料但無法解碼回傳 undefined。 */
export function tryDecodeVault(raw: string | null | undefined): SensitiveVault | undefined {
  if (!raw) return { customers: {}, effects: [] };
  if (!raw.startsWith(VAULT_PREFIX)) return undefined;
  try {
    const parsed = JSON.parse(fromBase64(raw.slice(VAULT_PREFIX.length))) as Partial<SensitiveVault>;
    if (!parsed || typeof parsed !== 'object') return undefined;
    return {
      customers: parsed.customers && typeof parsed.customers === 'object' ? parsed.customers : {},
      effects: Array.isArray(parsed.effects) ? parsed.effects : [],
    };
  } catch {
    return undefined;
  }
}

/** 與 tryDecodeVault 相同，但無法解碼時回傳空保管箱（只用於檢視，不可據以寫回）。 */
export function decodeVault(raw: string | null | undefined): SensitiveVault {
  return tryDecodeVault(raw) ?? { customers: {}, effects: [] };
}

/** 把 state 拆成「一般資料」與「S 級保管箱」。一般資料內不含任何 S 級欄位。 */
export function splitSensitive(state: CrmState): { main: CrmState; vault: SensitiveVault } {
  const vault: SensitiveVault = { customers: {}, effects: state.effects };
  const customers: Customer[] = state.customers.map((customer) => {
    vault.customers[customer.id] = pickSensitive(customer);
    return stripSensitive(customer);
  });
  return { main: { ...state, customers, effects: [] }, vault };
}

export function mergeSensitive(main: CrmState, vault: SensitiveVault): CrmState {
  const ids = new Set(main.customers.map((c) => c.id));
  return {
    ...main,
    customers: main.customers.map((customer) => {
      const fields = vault.customers[customer.id];
      if (!fields) return customer;
      return {
        ...customer,
        allergies: Array.isArray(fields.allergies) ? fields.allergies : [],
        skinCondition: fields.skinCondition,
        healthNotes: fields.healthNotes,
      };
    }),
    // 只還原仍存在的客戶的效果紀錄
    effects: vault.effects.filter((e) => ids.has(e.customerId)),
  };
}

const ARRAY_FIELDS = [
  'stores',
  'accounts',
  'customers',
  'treatments',
  'packages',
  'appointments',
  'effects',
  'catalog',
  'drafts',
  'contactLog',
  'sendLog',
  'consentLog',
] as const;

function isCrmStateShape(value: unknown): value is CrmState {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (v.schemaVersion !== CRM_SCHEMA_VERSION) return false;
  const workspace = v.workspace as Record<string, unknown> | undefined;
  if (!workspace || typeof workspace.id !== 'string' || typeof workspace.name !== 'string') return false;
  return ARRAY_FIELDS.every((field) => Array.isArray(v[field]));
}

export function saveCrmState(storage: StorageLike | undefined, state: CrmState): boolean {
  if (!storage) return false;
  try {
    const { main, vault } = splitSensitive(state);
    storage.setItem(CRM_DATA_KEY, JSON.stringify(main));
    storage.setItem(CRM_SENSITIVE_KEY, encodeVault(vault));
    return true;
  } catch {
    return false;
  }
}

export type CrmLoadResult =
  | { status: 'empty' }
  | { status: 'ok'; state: CrmState }
  /** 有資料但讀不出來（JSON 損毀、版本不符、欄位缺漏、S 級保管箱無法解碼）。呼叫端不可覆寫。 */
  | { status: 'corrupt' };

/** 讀回 state，並區分「沒有資料」與「有資料但讀不出來」。 */
export function readCrmState(storage: StorageLike | undefined): CrmLoadResult {
  if (!storage) return { status: 'empty' };
  try {
    const raw = storage.getItem(CRM_DATA_KEY);
    if (!raw) return { status: 'empty' };
    const parsed = JSON.parse(raw) as unknown;
    if (!isCrmStateShape(parsed)) return { status: 'corrupt' };
    const vault = tryDecodeVault(storage.getItem(CRM_SENSITIVE_KEY));
    if (!vault) return { status: 'corrupt' };
    const main: CrmState = { ...parsed, recallSettings: normalizeRecallSettings(parsed.recallSettings) };
    return { status: 'ok', state: mergeSensitive(main, vault) };
  } catch {
    return { status: 'corrupt' };
  }
}

/** 讀回 state。沒有資料、版本不符或內容損毀時回傳 undefined。 */
export function loadCrmState(storage: StorageLike | undefined): CrmState | undefined {
  const result = readCrmState(storage);
  return result.status === 'ok' ? result.state : undefined;
}

/** 清除本機全部資料：CRM 資料、S 級保管箱、語言／主題與舊版來訪紀錄。 */
export function clearLocalData(storage: StorageLike | undefined): boolean {
  if (!storage) return true;
  try {
    for (const key of ALL_LOCAL_KEYS) storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
