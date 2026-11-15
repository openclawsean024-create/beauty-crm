// Beauty CRM — shared dashboard types

import type { MessageKey } from '@/lib/i18n';

export type Tab = 'today' | 'clients' | 'retention' | 'insights' | 'settings';

export const TABS: Array<{ id: Tab; labelKey: MessageKey; icon: string }> = [
  { id: 'today', labelKey: 'navToday', icon: '⌂' },
  { id: 'clients', labelKey: 'navClients', icon: '○' },
  { id: 'retention', labelKey: 'navRetention', icon: '◷' },
  { id: 'insights', labelKey: 'navInsights', icon: '↗' },
  { id: 'settings', labelKey: 'navSettings', icon: '⚙' },
];

/** queue filter values */
export type QueueFilter = 'all' | 'overdue' | 'soon' | 'vip';

export const QUEUE_FILTERS: QueueFilter[] = ['all', 'overdue', 'soon', 'vip'];
