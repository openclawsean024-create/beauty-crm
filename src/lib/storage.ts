// Beauty CRM v0.4.0 — localStorage typed wrapper
// 對齊 docs/DESIGN_v0.4.0.md §6
// 對齊 SPEC ADR-003（v1 單店單裝置，v2 才上雲協作）
// v0.4.0 實作：localStorage typed wrapper，**無密碼保護**（v2 再做）。

const PREFIX = 'beauty-crm:v1:';

/** 判斷是否在瀏覽器環境（SSR safe） */
export function isClient(): boolean {
  return typeof window !== 'undefined';
}

/**
 * 從 localStorage 讀取值。
 * - key 會自動加 PREFIX
 * - SSR / 缺值 / JSON 損壞時回傳 fallback
 */
export function load<T>(key: string, fallback: T): T {
  if (!isClient()) return fallback;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * 寫入 localStorage。
 * - SSR / quota exceeded 時 silent fail（console.warn）
 */
export function save<T>(key: string, value: T): void {
  if (!isClient()) return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (err) {
    console.warn('[storage] save failed', key, err);
  }
}

/** 移除單一 key */
export function clear(key: string): void {
  if (!isClient()) return;
  window.localStorage.removeItem(PREFIX + key);
}

/** 移除所有 PREFIX 開頭的 key（用於 purge） */
export function clearAll(): void {
  if (!isClient()) return;
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k && k.startsWith(PREFIX)) keys.push(k);
  }
  keys.forEach((k) => window.localStorage.removeItem(k));
}

/** Storage key 常數（避免打錯字） */
export const StorageKeys = {
  customers: 'customers',
  treatments: 'treatments',
  contactLogs: 'contactLogs',
  apptLogs: 'apptLogs',
  approvedTargets: 'approvedTargets',
  reminderOverrides: 'reminderOverrides',
  deviceShared: 'device.shared',
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];

/** 測試 hook：保留 PREFIX 字串供測試 / debug 用（一般 code 不應使用） */
export const PREFIX_FOR_TEST = PREFIX;
