// Beauty CRM — shared dashboard types (v3 Retention Desk)

export type Tab = 'today' | 'clients' | 'retention' | 'insights' | 'settings';

export const TAB_LABELS: Record<Tab, string> = {
  today: '今日工作台',
  clients: '客戶',
  retention: '回訪',
  insights: '洞察',
  settings: '設定與資料',
};

/** v3 queue filter values (UI-SPEC v1.1 §3.2 + prototype §tools) */
export type QueueFilter = 'all' | 'overdue' | 'soon' | 'vip';

export const QUEUE_FILTERS: QueueFilter[] = ['all', 'overdue', 'soon', 'vip'];

/** Recall row status derived from Reminder.status */
export type QueueStatus = 'overdue' | 'soon' | 'ok';
