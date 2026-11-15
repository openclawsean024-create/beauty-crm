// Beauty CRM — 回訪佇列與回流漏斗（FR-004、FR-008）
// 佇列：逾期或在 windowDays 內進入回訪窗口的客戶。
// 漏斗：應回訪 → 已聯絡 → 已預約，全部由資料計算，不寫死。

import type { Appointment } from './appointments';
import { nextAppointment } from './appointments';
import { computeCustomerLTV } from './analytics';
import type { Customer } from './customers';
import { toDateOnly } from './dates';
import { computeReminder } from './reminders';
import type { RecallSettings } from './recall-settings';
import { tierForSpend } from './tiers';
import type { Treatment } from './treatments';
import { lastTreatment } from './treatments';

/** 「已聯絡」紀錄：設計師手動標記，或 LINE dry-run 寫入發送紀錄時產生。 */
export interface ContactRecord {
  id: string;
  customerId: string;
  channel: 'line' | 'phone' | 'in-person' | 'other';
  contactedAt: string; // ISO timestamp
  contactedBy: string; // account id
  note?: string;
}

export interface RecallQueueRow {
  customer: Customer;
  lastTreatmentId: string;
  lastServiceName: string;
  lastServiceDate: string; // ISO timestamp
  amount: number;
  suggestedRecallAt: string; // YYYY-MM-DD
  daysUntilRecall: number; // 負 = 逾期
  status: 'overdue' | 'soon';
  isVip: boolean;
  totalSpent: number;
  /** 本次回訪週期（上次服務之後）是否已聯絡 */
  contacted: boolean;
  lastContactedAt: string | undefined;
  /** 是否已有尚未到來的預約 */
  booked: boolean;
  nextAppointmentDate: string | undefined;
}

export interface RecallQueueInput {
  customers: Customer[];
  treatments: Treatment[];
  appointments?: Appointment[];
  contactLog?: ContactRecord[];
  recallSettings?: Partial<RecallSettings>;
  today: Date;
  /** 幾天內進入回訪窗口要列入（預設 14） */
  windowDays?: number;
}

/** VIP：累計消費達金卡門檻（tiers.ts），不再寫死金額。 */
export function isVipSpend(totalSpent: number): boolean {
  const tier = tierForSpend(totalSpent).tier;
  return tier === 'gold' || tier === 'black';
}

export function buildRecallQueue(input: RecallQueueInput): RecallQueueRow[] {
  const windowDays = input.windowDays ?? 14;
  const todayIso = toDateOnly(input.today);
  const appointments = input.appointments ?? [];
  const contactLog = input.contactLog ?? [];
  const rows: RecallQueueRow[] = [];

  for (const customer of input.customers) {
    const last = lastTreatment(input.treatments, customer.id);
    if (!last) continue; // 沒有服務紀錄就沒有回訪週期
    const reminder = computeReminder(customer, input.treatments, input.today, 7, input.recallSettings);
    if (reminder.daysUntilRecall > windowDays) continue;

    const contacts = contactLog
      .filter((c) => c.customerId === customer.id && c.contactedAt >= last.performedAt)
      .sort((a, b) => b.contactedAt.localeCompare(a.contactedAt));
    const upcoming = nextAppointment(appointments, customer.id, todayIso);
    const ltv = computeCustomerLTV(input.treatments, customer.id);

    rows.push({
      customer,
      lastTreatmentId: last.id,
      lastServiceName: last.serviceName,
      lastServiceDate: last.performedAt,
      amount: last.price,
      suggestedRecallAt: reminder.suggestedRecallAt,
      daysUntilRecall: reminder.daysUntilRecall,
      status: reminder.daysUntilRecall < 0 ? 'overdue' : 'soon',
      isVip: isVipSpend(ltv.totalSpent),
      totalSpent: ltv.totalSpent,
      contacted: contacts.length > 0,
      lastContactedAt: contacts[0]?.contactedAt,
      booked: upcoming !== undefined,
      nextAppointmentDate: upcoming?.date,
    });
  }

  // 逾期最久優先，其次最快到期
  return rows.sort((a, b) => a.daysUntilRecall - b.daysUntilRecall || a.customer.id.localeCompare(b.customer.id));
}

export interface FunnelCounts {
  /** 應回訪：佇列內的客戶數 */
  due: number;
  /** 已聯絡：已標記聯絡，或已預約（預約視為已聯絡成功） */
  contacted: number;
  /** 已預約：有尚未到來的預約 */
  booked: number;
  /** 聯絡 → 預約轉換率（%），沒有已聯絡時為 0 */
  contactToBookPct: number;
  /** 整體回流率（%）= 已預約 / 應回訪 */
  overallPct: number;
}

export function computeFunnel(rows: Array<Pick<RecallQueueRow, 'contacted' | 'booked'>>): FunnelCounts {
  const due = rows.length;
  const booked = rows.filter((r) => r.booked).length;
  const contacted = rows.filter((r) => r.contacted || r.booked).length;
  return {
    due,
    contacted,
    booked,
    contactToBookPct: contacted === 0 ? 0 : Math.round((booked / contacted) * 100),
    overallPct: due === 0 ? 0 : Math.round((booked / due) * 100),
  };
}
