// Beauty CRM — 資料刪除（FR-009 / AC-010）
//
// 對齊 SPEC §1.5 Non-Goals + §5.2 安全：
//   - 純前端 in-memory，沒有真實的「刪除 DB」概念
//   - purgeAllData 回傳 wipe metadata + dispatch tombstone event
//   - confirmPurgeWithGracePeriod 計算未來 24h 的排程時間（給未來「管理員強制刪除」路徑用）
//
// 「店主獨立完成」對齊：呼叫端（如 Dashboard）只需呼叫 purgeAllData()，
// 不用了解 store 結構，purge 函式內部已經處理 reset + tombstone 事件。

import { logEvent } from './audit';

export interface PurgeResult {
  wipedAt: string;
  tombstoneId: string;
  /** 被清空的資料類別，給 UI 顯示用 */
  wipedScopes: string[];
}

export interface PurgeSchedule {
  scheduledFor: string; // ISO timestamp (future)
  hours: number;
}

const TOMBSTONE_EVENT_NAME = 'beauty-crm:purge';

export interface PurgeTombstoneEvent {
  type: 'purge';
  tombstoneId: string;
  wipedAt: string;
  wipedScopes: string[];
  detail?: string;
}

/**
 * 產生 tombstone ID（時間戳 + 隨機 suffix），方便 audit 與日後復原。
 * 純函數：可被獨立測試。
 */
export function generateTombstoneId(now: Date = new Date()): string {
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  const suffix = Math.random().toString(36).slice(2, 8);
  return `tomb-${stamp}-${suffix}`;
}

/**
 * 計算 grace period 排定的刪除時間。
 * 純函數：未來用於「24h 後自動刪除」排程（round 3 排程器串接）。
 */
export function confirmPurgeWithGracePeriod(
  hours: number = 24,
  now: Date = new Date(),
): PurgeSchedule {
  if (hours < 0) throw new Error('confirmPurgeWithGracePeriod: hours must be >= 0');
  const ms = hours * 60 * 60 * 1000;
  return {
    scheduledFor: new Date(now.getTime() + ms).toISOString(),
    hours,
  };
}

/**
 * 廣播 tombstone 事件（CustomEvent）。
 * 優先用 `window.dispatchEvent`（瀏覽器 / happy-dom），
 * 若 window 不存在或無 dispatchEvent，fallback 用 override 的 `dispatchTarget`（測試注入）。
 * SSR-safe：都沒有時 silent no-op。
 */
export function dispatchTombstone(event: PurgeTombstoneEvent): void {
  const w = typeof window !== 'undefined' ? (window as Window & typeof globalThis) : undefined;
  if (w && typeof w.dispatchEvent === 'function') {
    w.dispatchEvent(
      new CustomEvent(TOMBSTONE_EVENT_NAME, { detail: event }),
    );
    return;
  }
  const t = dispatchTargetOverride;
  if (t && typeof t.dispatchEvent === 'function') {
    t.dispatchEvent(
      new CustomEvent(TOMBSTONE_EVENT_NAME, { detail: event }),
    );
  }
}

/**
 * 測試注入用：替換 dispatch 目標。
 * 任何 EventTarget-like（含 addEventListener / dispatchEvent / removeEventListener）都接受。
 * 預設 = undefined → dispatchTombstone fallback 到 window。
 */
let dispatchTargetOverride: (EventTarget & { dispatchEvent: (e: Event) => boolean }) | undefined;

export function setDispatchTarget(
  target: (EventTarget & { dispatchEvent: (e: Event) => boolean }) | undefined,
): void {
  dispatchTargetOverride = target;
}

export interface PurgeTargets {
  /** reset 函式清空 in-memory store；呼叫端傳入實際的 store clear 函式 */
  resetFn: () => void;
  /** 此次刪除涵蓋的資料範圍（給 audit / UI 顯示用） */
  scopes?: string[];
  /** 額外說明（例如「用戶手動確認刪除」） */
  reason?: string;
}

/**
 * 模擬記憶體清空 + 產出 tombstone 事件。
 *
 * 設計：
 * - 不接受 customers / treatments 參數（store 內部狀態由 resetFn 清）
 *   避免函式直接持有資料，給 round 3 升級 IndexedDB 時只要改 resetFn
 * - 回傳 wipe metadata 給 UI 顯示「已於 X 時間刪除（tombstone: Y）」
 * - dispatchTombstone 觸發後，audit log / 監控可訂閱（未來 round 3）
 */
export function purgeAllData(
  targets: PurgeTargets,
  now: Date = new Date(),
): PurgeResult {
  const wipedAt = now.toISOString();
  const tombstoneId = generateTombstoneId(now);
  const wipedScopes = targets.scopes ?? ['customers', 'treatments', 'reminders', 'broadcast'];

  // 1. 執行 reset（呼叫端傳入，purge 函式不直接操作 store）
  targets.resetFn();

  // 2. dispatch tombstone 事件（給 audit / UI listener）
  dispatchTombstone({
    type: 'purge',
    tombstoneId,
    wipedAt,
    wipedScopes,
    detail: targets.reason,
  });

  // 3. DoD-8：purge 動作同步上報 audit（給未來 Sentry / OTel 串接）
  logEvent(
    'data.purged',
    { tombstoneId, wipedScopes, reason: targets.reason ?? 'unspecified' },
    'designer-manual',
  );

  return { wipedAt, tombstoneId, wipedScopes };
}

export const PURGE_EVENT_NAME = TOMBSTONE_EVENT_NAME;
