// Beauty CRM — shared dashboard types

export type Tab = 'today' | 'customers' | 'reminders' | 'insights' | 'settings';

export const TAB_LABELS: Record<Tab, string> = {
  today: '今日工作台',
  customers: '客戶',
  reminders: '回訪',
  insights: '洞察',
  settings: '設定與資料',
};
