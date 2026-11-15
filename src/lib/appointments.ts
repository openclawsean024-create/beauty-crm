// Beauty CRM — 預約紀錄（只記錄，不做排程系統）
// 併自 beauty-crm-concierge `data/mock.ts` 的 Appointment 模型與「下次預約」卡片邏輯
// （SPEC §10.1 #2，FR-017、FR-008）。不搬 4 步驟新增預約流程；不做時段衝突或排班。
// 「已預約」狀態會餵給回流漏斗（src/lib/funnel.ts）。

import { isDateOnly, isTimeOfDay } from './dates';

export type AppointmentStatus = 'upcoming' | 'completed' | 'cancelled';

export interface Appointment {
  id: string;
  customerId: string;
  storeId: string; // 店別
  designerId: string; // 設計師帳號 id
  date: string; // YYYY-MM-DD（本地日期）
  time: string; // HH:mm
  status: AppointmentStatus;
  catalogItemId?: string;
  note?: string;
  createdAt: string; // ISO timestamp
}

export function createAppointment(input: {
  id: string;
  customerId: string;
  storeId: string;
  designerId: string;
  date: string;
  time: string;
  status?: AppointmentStatus;
  catalogItemId?: string;
  note?: string;
  createdAt?: string;
}): Appointment {
  if (!input.id?.trim()) throw new Error('appointment id required');
  if (!input.customerId) throw new Error('customerId required');
  if (!input.storeId) throw new Error('storeId required');
  if (!input.designerId) throw new Error('designerId required');
  if (!isDateOnly(input.date)) throw new Error('date must be YYYY-MM-DD');
  if (!isTimeOfDay(input.time)) throw new Error('time must be HH:mm');
  return {
    id: input.id.trim(),
    customerId: input.customerId,
    storeId: input.storeId,
    designerId: input.designerId,
    date: input.date,
    time: input.time,
    status: input.status ?? 'upcoming',
    catalogItemId: input.catalogItemId,
    note: input.note?.trim() || undefined,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}

function byDateTimeAsc(a: Appointment, b: Appointment): number {
  return `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`);
}

/** 指定客戶的預約，由近到遠（日期新 → 舊）。 */
export function appointmentsByCustomer(appointments: Appointment[], customerId: string): Appointment[] {
  return appointments.filter((a) => a.customerId === customerId).sort((a, b) => byDateTimeAsc(b, a));
}

/** 尚未到來的預約：狀態為 upcoming 且日期 ≥ today。 */
export function isUpcoming(appointment: Appointment, today: string): boolean {
  return appointment.status === 'upcoming' && appointment.date >= today;
}

/** 下次預約：最早的一筆 upcoming（日期 ≥ today）。沒有則 undefined。 */
export function nextAppointment(
  appointments: Appointment[],
  customerId: string,
  today: string,
): Appointment | undefined {
  return appointments
    .filter((a) => a.customerId === customerId && isUpcoming(a, today))
    .sort(byDateTimeAsc)[0];
}

export function hasUpcomingAppointment(
  appointments: Appointment[],
  customerId: string,
  today: string,
): boolean {
  return nextAppointment(appointments, customerId, today) !== undefined;
}

/** 目前「已預約」的客戶 id（回流漏斗第三段）。 */
export function bookedCustomerIds(appointments: Appointment[], today: string): Set<string> {
  return new Set(appointments.filter((a) => isUpcoming(a, today)).map((a) => a.customerId));
}

function transition(appointment: Appointment, status: AppointmentStatus): Appointment {
  if (appointment.status !== 'upcoming') {
    throw new Error(`cannot change a ${appointment.status} appointment`);
  }
  return { ...appointment, status };
}

export function cancelAppointment(appointment: Appointment): Appointment {
  return transition(appointment, 'cancelled');
}

export function completeAppointment(appointment: Appointment): Appointment {
  return transition(appointment, 'completed');
}

/** 逾期未處理：仍是 upcoming 但日期已過，提醒店家標記完成或取消。 */
export function listStaleAppointments(appointments: Appointment[], today: string): Appointment[] {
  return appointments.filter((a) => a.status === 'upcoming' && a.date < today).sort(byDateTimeAsc);
}
