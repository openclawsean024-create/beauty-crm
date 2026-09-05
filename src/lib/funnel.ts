// Beauty CRM — 回流漏斗（FR-008）
//
// 對齊 SPEC §3.1 FR-008「回流漏斗：應回訪、已聯絡、已預約（手動標記）」：
// - 三階段（due / contacted / booked），優先序 apptLogs > contactLogs > due
// - 設計師手動標記（不自動化 — 避免被誤判為自動行銷）
// - 純函數：markContacted / markBooked 不可變，全部回傳新物件
// - 與 reminders.ts 的 Reminder 解耦：漏斗 stage 由 contactLog / apptLog 計算，
//   不污染 computeReminder 既有行為（向後相容）
//
// 設計：
// - ContactLog / AppointmentLog 為 append-only audit log，不修改舊紀錄
// - markContacted 接收「最新一筆 + 既有 logs」，產出新 logs 陣列（自動去重：同 customerId
//   已有當日紀錄則 no-op，避免 double count）
// - getFunnelStage 為純查詢：給定 reminder + 該客戶的 logs，回傳單一 stage

import type { Reminder } from './reminders';

export type FunnelStage = 'due' | 'contacted' | 'booked';

/** 聯絡管道（v1：店內手動登記，暫不實際發送） */
export type ContactChannel = 'phone' | 'line' | 'sms' | 'in-person' | 'other';

/** 聯絡結果 */
export type ContactOutcome = 'connected' | 'no-answer' | 'left-message' | 'booked' | 'declined';

export interface ContactLog {
  customerId: string;
  contactedAt: string; // ISO timestamp
  channel: ContactChannel;
  outcome: ContactOutcome;
  designerId: string;
}

export interface AppointmentLog {
  customerId: string;
  bookedAt: string; // ISO timestamp
  scheduledFor: string; // ISO timestamp (future appointment)
  designerId: string;
}

/**
 * 設計師手動標記「已聯絡」（FR-008）。
 * 純函數：不可變，回傳新 logs 陣列。
 *
 * 規則：
 * - 必填 customerId / contactedAt / channel / outcome / designerId（缺一 throw）
 * - 同 customerId 同 ISO 秒級 timestamp 視為重複 → no-op 回傳原 logs
 * - 不同時間戳 → append 到尾端
 */
export function markContacted(
  logs: readonly ContactLog[],
  entry: Omit<ContactLog, 'contactedAt'> & { contactedAt?: string },
): ContactLog[] {
  if (!entry.customerId || !entry.customerId.trim()) {
    throw new Error('markContacted: customerId required');
  }
  if (!entry.designerId || !entry.designerId.trim()) {
    throw new Error('markContacted: designerId required');
  }
  if (!entry.channel) {
    throw new Error('markContacted: channel required');
  }
  if (!entry.outcome) {
    throw new Error('markContacted: outcome required');
  }
  const contactedAt = entry.contactedAt ?? new Date().toISOString();
  // 去重：同 customerId + 同一 contactedAt 字串（秒級）視為重複
  const dup = logs.find(
    (l) => l.customerId === entry.customerId && l.contactedAt === contactedAt,
  );
  if (dup) return [...logs];
  return [...logs, { ...entry, contactedAt }];
}

/**
 * 設計師手動標記「已預約」（FR-008）。
 * 純函數：不可變，回傳新 logs 陣列。
 *
 * 規則：
 * - 必填 customerId / bookedAt / scheduledFor / designerId
 * - scheduledFor 必須是未來時間（否則 throw — 預約邏輯上不應是過去時間）
 * - 同 customerId 同 ISO 秒級 scheduledFor 視為重複 → no-op
 */
export function markBooked(
  logs: readonly AppointmentLog[],
  entry: Omit<AppointmentLog, 'bookedAt'> & { bookedAt?: string },
): AppointmentLog[] {
  if (!entry.customerId || !entry.customerId.trim()) {
    throw new Error('markBooked: customerId required');
  }
  if (!entry.designerId || !entry.designerId.trim()) {
    throw new Error('markBooked: designerId required');
  }
  if (!entry.scheduledFor) {
    throw new Error('markBooked: scheduledFor required');
  }
  const scheduledTime = new Date(entry.scheduledFor);
  if (Number.isNaN(scheduledTime.getTime())) {
    throw new Error('markBooked: scheduledFor is not a valid date');
  }
  if (scheduledTime.getTime() <= Date.now()) {
    throw new Error('markBooked: scheduledFor must be in the future');
  }
  const bookedAt = entry.bookedAt ?? new Date().toISOString();
  const dup = logs.find(
    (l) => l.customerId === entry.customerId && l.scheduledFor === entry.scheduledFor,
  );
  if (dup) return [...logs];
  return [...logs, { ...entry, bookedAt }];
}

/**
 * 查詢某客戶在漏斗的當前階段（FR-008）。
 *
 * 優先序（由高到低）：
 * 1. booked：該客戶有 scheduledFor > now 的 AppointmentLog
 * 2. contacted：該客戶有任一 ContactLog
 * 3. due：都不是
 *
 * 純函數：只查詢，不修改任何輸入。
 *
 * 設計：使用「該客戶的 logs」而非「全部 logs」，呼叫端負責預先 filter
 *   （getFunnelStage 不重做 O(N) filter，避免呼叫端忘記傳遞全部 logs
 *   造成客戶被分到錯誤 stage）。
 */
export function getFunnelStage(
  reminder: Reminder,
  customerContactLogs: readonly ContactLog[],
  customerApptLogs: readonly AppointmentLog[],
  now: Date = new Date(),
): FunnelStage {
  // 1. booked：有未來 scheduledFor 的 appt
  const hasFutureAppt = customerApptLogs.some(
    (a) => new Date(a.scheduledFor).getTime() > now.getTime(),
  );
  if (hasFutureAppt) return 'booked';
  // 2. contacted：有任一 contact log
  if (customerContactLogs.length > 0) return 'contacted';
  // 3. due：都沒有；此時 reminder 仍記載「該客戶的應回訪狀態」
  //    對 due 階段我們只在意「是否有 contact / appt」，無關 reminder 內容
  void reminder; // reminder 保留供未來「沒接觸但有歷史」進階邏輯
  return 'due';
}

/**
 * 從全部 logs 中挑出某客戶的 contact logs（純函數）。
 * 提供 helper 給 UI 用，避免每處重寫 filter。
 */
export function contactLogsFor(
  logs: readonly ContactLog[],
  customerId: string,
): ContactLog[] {
  return logs.filter((l) => l.customerId === customerId);
}

export function apptLogsFor(
  logs: readonly AppointmentLog[],
  customerId: string,
): AppointmentLog[] {
  return logs.filter((l) => l.customerId === customerId);
}
