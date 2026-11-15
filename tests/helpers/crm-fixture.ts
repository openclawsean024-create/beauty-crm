// 測試共用 fixture：固定日期的示範 state、角色帳號與記憶體版 localStorage。
import type { Account } from '@/lib/accounts';
import type { CrmState, OpContext } from '@/lib/crm-store';
import type { StorageLike } from '@/lib/local-store';
import { buildSeedState } from '@/lib/seed';

/** 2026-11-16 當地時間中午（與 App 計算回訪日使用的基準一致）。 */
export const FIXED_TODAY = new Date(2026, 10, 16, 12, 0, 0, 0);

export function seedState(): CrmState {
  return buildSeedState(FIXED_TODAY);
}

export function account(state: CrmState, id: string): Account {
  const found = state.accounts.find((a) => a.id === id);
  if (!found) throw new Error(`fixture account missing: ${id}`);
  return found;
}

export function ctxFor(state: CrmState, accountId: string, now: Date = FIXED_TODAY): OpContext {
  return { actor: account(state, accountId), now };
}

export class MemoryStorage implements StorageLike {
  readonly store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  /** 所有 key 與 value 串在一起，方便斷言「某字串不存在於任何地方」。 */
  dump(): string {
    return [...this.store.entries()].map(([k, v]) => `${k}=${v}`).join('\n');
  }
}
