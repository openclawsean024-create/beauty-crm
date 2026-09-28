// Beauty CRM — i18n (zh-TW / en)
// Lightweight locale helper used by the v3 Retention Desk UI.
// Pure functions only; no DOM access here so tests stay deterministic.

export type Lang = 'zh' | 'en';

export interface LocaleMessages {
  // Hero
  overline: string;
  headline: string;
  heroCopy: string;
  newVisit: string;
  // KPI
  metricFollowups: string;
  metricReturn: string;
  metricVisits: string;
  metricRevenue: string;
  // Queue
  queueTitle: string;
  queueSubtitle: string;
  export: string;
  filterAll: string;
  filterOverdue: string;
  filterSoon: string;
  filterVip: string;
  showAll: string;
  showingOf: string;
  queueSearchPlaceholder: string;
  // Profile + draft
  viewDraft: string;
  markContacted: string;
  draftTitle: string;
  draftSubtitle: string;
  draftNote: string;
  approve: string;
  copy: string;
  resetDraft: string;
  // Insight
  insightTitle: string;
  insightSubtitle: string;
  // Next best actions
  nextTitle: string;
  nextSubtitle: string;
  // Drawer
  drawerTitle: string;
  drawerSubtitle: string;
  client: string;
  date: string;
  amount: string;
  service: string;
  note: string;
  consent: string;
  cancel: string;
  saveVisit: string;
  // Misc
  langToggle: string;
  themeToggle: string;
  commandSearchPlaceholder: string;
  workspaceLabel: string;
  workspaceSubLabel: string;
  workspaceSwitcherAria: string;
  searchAria: string;
  tierBadgeFallback: string;
  reasonFallback: string;
  nextActionFallback: string;
  noFindings: string;
  approvedToast: string;
  copiedToast: string;
  draftApprovedToast: string;
  visitSavedToast: string;
  exportedToast: string;
  consentRequiredHint: string;
  noClientSelected: string;
  allergenConflict: string;
}

const ZH: LocaleMessages = {
  overline: '客戶回流工作台',
  headline: '讓每一次回來，都有上下文。',
  heroCopy: '好的客戶關係發生在兩次服務之間。今天有 <strong>3 位客戶逾期</strong>、5 位即將進入回訪窗口。',
  newVisit: '＋ 新增服務',
  metricFollowups: '待回訪',
  metricReturn: '近 30 日回訪率',
  metricVisits: '本月服務次數',
  metricRevenue: '本月服務額',
  queueTitle: '今日回訪佇列',
  queueSubtitle: '依照「現在為什麼需要你」排序。',
  export: '匯出資料',
  filterAll: '全部',
  filterOverdue: '逾期',
  filterSoon: '即將到期',
  filterVip: 'VIP',
  showAll: '查看全部',
  showingOf: '目前顯示',
  queueSearchPlaceholder: '搜尋姓名或服務…',
  viewDraft: '查看草稿',
  markContacted: '標記已聯絡',
  draftTitle: '聯絡草稿',
  draftSubtitle: '已套用客戶記憶 · 尚未發送',
  draftNote: '送出前請人工確認。Ritual 不會自動發送客戶訊息。',
  approve: '核准待發送',
  copy: '複製文字',
  resetDraft: '重設為草稿',
  insightTitle: '回流節奏',
  insightSubtitle: '最近 8 週進入回訪窗口的服務數。',
  nextTitle: '本週下一步',
  nextSubtitle: '三個保護回流率的小動作。',
  drawerTitle: '新增服務紀錄',
  drawerSubtitle: '留下足夠的上下文，下一次服務才接得上。',
  client: '客戶',
  date: '日期',
  amount: '金額',
  service: '服務項目',
  note: '客戶記憶',
  consent: '我已取得保存本次服務紀錄與相關客戶資訊的同意。',
  cancel: '取消',
  saveVisit: '儲存服務',
  langToggle: '繁中',
  themeToggle: '切換深色模式',
  commandSearchPlaceholder: '搜尋客戶、電話…',
  workspaceLabel: 'Atelier M',
  workspaceSubLabel: 'Taipei · personal studio',
  workspaceSwitcherAria: '切換工作區',
  searchAria: '全域搜尋',
  tierBadgeFallback: 'VIP',
  reasonFallback: '已超過建議回流週期',
  nextActionFallback: '先確認近況，再決定下一步。',
  noFindings: '無紀錄',
  approvedToast: '草稿已核准，狀態為待發送',
  copiedToast: '草稿已複製',
  draftApprovedToast: '已標記為已聯絡',
  visitSavedToast: '服務紀錄已儲存，已計算下一次回訪窗口',
  exportedToast: '資料已匯出 JSON',
  consentRequiredHint: '需先取得同意',
  noClientSelected: '請先選擇一位客戶',
  allergenConflict: '與客戶過敏紀錄衝突，請人工確認。',
};

const EN: LocaleMessages = {
  overline: 'CLIENT RETENTION WORKSPACE',
  headline: 'Retention, with context.',
  heroCopy: 'Good client relationships are built between visits. Today you have <strong>3 overdue follow-ups</strong> and 5 clients entering their return window.',
  newVisit: '＋ New visit',
  metricFollowups: 'Follow-ups due',
  metricReturn: '30d return rate',
  metricVisits: 'Visits this month',
  metricRevenue: 'Service revenue',
  queueTitle: 'Today’s retention queue',
  queueSubtitle: 'Prioritised by why this client needs you now.',
  export: 'Export data',
  filterAll: 'All',
  filterOverdue: 'Overdue',
  filterSoon: 'Upcoming',
  filterVip: 'VIP',
  showAll: 'View all',
  showingOf: 'Showing',
  queueSearchPlaceholder: 'Search name or service…',
  viewDraft: 'View draft',
  markContacted: 'Mark contacted',
  draftTitle: 'Contact draft',
  draftSubtitle: 'Context-aware · not sent',
  draftNote: 'Review before sending. Ritual never sends client messages automatically.',
  approve: 'Approve for sending',
  copy: 'Copy text',
  resetDraft: 'Reset to draft',
  insightTitle: 'Return rhythm',
  insightSubtitle: 'Visits entering a follow-up window, last 8 weeks.',
  nextTitle: 'Next best actions',
  nextSubtitle: 'Three small actions that protect retention.',
  drawerTitle: 'New visit',
  drawerSubtitle: 'Leave enough context for the next visit.',
  client: 'Client',
  date: 'Date',
  amount: 'Amount',
  service: 'Service',
  note: 'Client memory',
  consent: 'I have consent to keep this service note and related client information.',
  cancel: 'Cancel',
  saveVisit: 'Save visit',
  langToggle: 'EN',
  themeToggle: 'Toggle dark mode',
  commandSearchPlaceholder: 'Search clients, phone…',
  workspaceLabel: 'Atelier M',
  workspaceSubLabel: 'Taipei · personal studio',
  workspaceSwitcherAria: 'Switch workspace',
  searchAria: 'Search',
  tierBadgeFallback: 'VIP',
  reasonFallback: 'Past recommended follow-up window',
  nextActionFallback: 'Check in, then decide the next step.',
  noFindings: 'No record',
  approvedToast: 'Draft approved and marked ready to send',
  copiedToast: 'Draft copied',
  draftApprovedToast: 'Marked as contacted',
  visitSavedToast: 'Visit saved; next return window calculated',
  exportedToast: 'Client data exported as JSON',
  consentRequiredHint: 'Consent required',
  noClientSelected: 'Select a client first',
  allergenConflict: 'Conflicts with client allergy record; please review manually.',
};

const MESSAGES: Record<Lang, LocaleMessages> = { zh: ZH, en: EN };

export function isLang(value: unknown): value is Lang {
  return value === 'zh' || value === 'en';
}

export function getMessages(lang: Lang): LocaleMessages {
  return MESSAGES[lang];
}

export function t(lang: Lang, key: keyof LocaleMessages): string {
  const messages = getMessages(lang);
  return messages[key] ?? EN[key] ?? key;
}

export function toggleLang(lang: Lang): Lang {
  return lang === 'zh' ? 'en' : 'zh';
}

export const LOCALE_OPTIONS: Lang[] = ['zh', 'en'];
