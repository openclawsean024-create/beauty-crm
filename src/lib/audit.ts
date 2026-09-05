// Beauty CRM — Audit Log（DoD-8：成本/事件/版本/決策 可由 maintainer 追查）
//
// 對齊 SPEC §3.1 DoD-8：
// - 簡易 in-memory event log（v1 純前端，無後端）
// - 每筆事件含 type / payload / at / actor
// - 用 console.debug 上報（給未來 Sentry / OpenTelemetry 串接預留點）
// - 不可變：append-only list（新事件進來不修改舊事件）
//
// 設計：
// - logEvent 回傳新 AuditEvent，呼叫端可選擇把這筆丟到 store 或只在 console 上報
// - getEvents 支援 filter（by type / actor / since）
// - 給 recordTreatment / approve / markSent / purgeAllData 內部呼叫

export type AuditEventType =
  | 'treatment.recorded'
  | 'broadcast.approved'
  | 'broadcast.sent'
  | 'broadcast.consentRevoked'
  | 'data.purged'
  | 'data.exported'
  | 'data.imported'
  | 'customer.updated'
  | 'photo.consentSet'
  | 'funnel.contacted'
  | 'funnel.booked'
  | 'reminder.overridden';

export interface AuditEvent {
  id: string;
  type: AuditEventType;
  payload: Record<string, unknown>;
  at: string; // ISO timestamp
  actor: string; // designerId / system / unknown
}

export interface AuditEventFilter {
  type?: AuditEventType;
  actor?: string;
  since?: string; // ISO timestamp
}

const events: AuditEvent[] = [];

/**
 * 記錄一筆 audit event（DoD-8）。
 *
 * 規則：
 * - 必填 type + actor（空字串視為缺漏 throw）
 * - payload 可空
 * - 自動產生 id = `evt-<ISO>-<random6>`
 * - 自動填 at = new Date().toISOString()
 * - append-only：永不修改既有 events 陣列
 * - 同步上報到 console.debug（給未來 Sentry 串接預留 hook）
 */
export function logEvent(
  type: AuditEventType,
  payload: Record<string, unknown> = {},
  actor: string = 'system',
): AuditEvent {
  if (!type) {
    throw new Error('logEvent: type required');
  }
  if (!actor || !actor.trim()) {
    throw new Error('logEvent: actor required (use "system" if no human actor)');
  }
  const at = new Date().toISOString();
  const id = `evt-${at.replace(/[:.]/g, '-')}-${Math.random().toString(36).slice(2, 8)}`;
  const event: AuditEvent = { id, type, payload, at, actor };
  events.push(event);
  // v1 簡單上報；未來 Sentry / OTel 串接點
  if (typeof console !== 'undefined' && typeof console.debug === 'function') {
    console.debug('[audit]', event);
  }
  return event;
}

/**
 * 查詢 audit events（純函數 + filter）。
 * 回傳新陣列（filter 結果），不洩漏內部 reference。
 */
export function getEvents(filter: AuditEventFilter = {}): AuditEvent[] {
  return events.filter((e) => {
    if (filter.type && e.type !== filter.type) return false;
    if (filter.actor && e.actor !== filter.actor) return false;
    if (filter.since && e.at < filter.since) return false;
    return true;
  });
}

/**
 * 取得全部 events（給測試或 debug 用）。
 * 回傳淺拷貝，不會被外部修改影響內部。
 */
export function getAllEvents(): AuditEvent[] {
  return [...events];
}

/**
 * 清空 audit log（測試 / purge 流程用）。
 * 真實 production 不會呼叫，但保留 escape hatch 避免 in-memory 一直長大。
 */
export function clearEvents(): void {
  events.length = 0;
}
