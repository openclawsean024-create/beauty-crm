import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  purgeAllData,
  confirmPurgeWithGracePeriod,
  generateTombstoneId,
  dispatchTombstone,
  setDispatchTarget,
  PURGE_EVENT_NAME,
  type PurgeTombstoneEvent,
} from '@/lib/delete';

describe('delete — FR-009 / AC-010 資料刪除 + tombstone', () => {
  let target: EventTarget;

  beforeEach(() => {
    // 注入一個 EventTarget 取代 window（vitest node 環境無 window）。
    target = new EventTarget();
    setDispatchTarget(target as unknown as EventTarget & { dispatchEvent: (e: Event) => boolean });
  });
  afterEach(() => {
    setDispatchTarget(undefined);
    vi.restoreAllMocks();
  });

  it('AC-010: purgeAllData 回傳 wipedAt + tombstoneId + wipedScopes', () => {
    const now = new Date('2026-07-19T10:00:00.000Z');
    let resetCalled = 0;
    const result = purgeAllData(
      {
        resetFn: () => {
          resetCalled += 1;
        },
        scopes: ['customers', 'treatments'],
      },
      now,
    );
    expect(result.wipedAt).toBe('2026-07-19T10:00:00.000Z');
    expect(result.tombstoneId).toMatch(/^tomb-/);
    expect(result.wipedScopes).toEqual(['customers', 'treatments']);
    expect(resetCalled).toBe(1); // resetFn 確實被呼叫
  });

  it('AC-010: purgeAllData 沒傳 scopes → 預設涵蓋 4 個範圍', () => {
    const result = purgeAllData({ resetFn: () => {} });
    expect(result.wipedScopes).toContain('customers');
    expect(result.wipedScopes).toContain('treatments');
    expect(result.wipedScopes).toContain('reminders');
    expect(result.wipedScopes).toContain('broadcast');
  });

  it('AC-010: purgeAllData dispatch tombstone 事件（監聽可收到）', () => {
    return new Promise<void>((resolve) => {
      const handler = (e: Event) => {
        const detail = (e as CustomEvent<PurgeTombstoneEvent>).detail;
        expect(detail.type).toBe('purge');
        expect(detail.tombstoneId).toMatch(/^tomb-/);
        expect(detail.wipedScopes).toEqual(['customers']);
        target.removeEventListener(PURGE_EVENT_NAME, handler);
        resolve();
      };
      target.addEventListener(PURGE_EVENT_NAME, handler);
      purgeAllData({ resetFn: () => {}, scopes: ['customers'] });
    });
  });

  it('AC-010: confirmPurgeWithGracePeriod 預設 24h → scheduledFor = now + 24h', () => {
    const now = new Date('2026-07-19T00:00:00.000Z');
    const sched = confirmPurgeWithGracePeriod(24, now);
    expect(sched.hours).toBe(24);
    expect(sched.scheduledFor).toBe('2026-07-20T00:00:00.000Z');
  });

  it('AC: confirmPurgeWithGracePeriod 自訂小時數', () => {
    const now = new Date('2026-07-19T00:00:00.000Z');
    expect(confirmPurgeWithGracePeriod(1, now).scheduledFor).toBe('2026-07-19T01:00:00.000Z');
    expect(confirmPurgeWithGracePeriod(48, now).scheduledFor).toBe('2026-07-21T00:00:00.000Z');
  });

  it('AC: confirmPurgeWithGracePeriod hours < 0 → throw', () => {
    expect(() => confirmPurgeWithGracePeriod(-1)).toThrow(/hours/);
  });

  it('AC: generateTombstoneId 含時間戳 + 隨機 suffix', () => {
    const a = generateTombstoneId(new Date('2026-07-19T10:00:00.000Z'));
    const b = generateTombstoneId(new Date('2026-07-19T10:00:00.000Z'));
    expect(a).toMatch(/^tomb-2026-07-19T10-00-00-000Z-/);
    expect(b).toMatch(/^tomb-2026-07-19T10-00-00-000Z-/);
    // 隨機 suffix → 兩次呼叫不應相同
    expect(a).not.toBe(b);
  });

  it('AC: dispatchTombstone 在無 window + 無 override → silent no-op（SSR safe）', () => {
    setDispatchTarget(undefined);
    // 不應 throw
    expect(() =>
      dispatchTombstone({ type: 'purge', tombstoneId: 'tomb-x', wipedAt: '2026-07-19', wipedScopes: [] }),
    ).not.toThrow();
  });
});
