// Beauty CRM — 回訪週期設定（FR-003）
// 店家可調整 4 類服務的回訪天數；調整後回訪日由 reminders.computeReminder 重算。

import type { TreatmentCategory } from './treatments';
import { suggestRecallDays } from './treatments';

export type RecallSettings = Record<TreatmentCategory, number>;

export const RECALL_CATEGORIES: TreatmentCategory[] = ['manicure', 'eyelash', 'skincare', 'hair'];

export const MIN_RECALL_DAYS = 1;
export const MAX_RECALL_DAYS = 365;

export function defaultRecallSettings(): RecallSettings {
  return {
    manicure: suggestRecallDays('manicure'),
    eyelash: suggestRecallDays('eyelash'),
    skincare: suggestRecallDays('skincare'),
    hair: suggestRecallDays('hair'),
  };
}

export function isValidRecallDays(days: unknown): days is number {
  return (
    typeof days === 'number' &&
    Number.isInteger(days) &&
    days >= MIN_RECALL_DAYS &&
    days <= MAX_RECALL_DAYS
  );
}

/** 回傳新的設定物件；天數必須是 1–365 的整數。 */
export function setRecallDays(
  settings: RecallSettings,
  category: TreatmentCategory,
  days: number,
): RecallSettings {
  if (!RECALL_CATEGORIES.includes(category)) throw new Error(`unknown category: ${String(category)}`);
  if (!isValidRecallDays(days)) {
    throw new Error(`recall days must be an integer between ${MIN_RECALL_DAYS} and ${MAX_RECALL_DAYS}`);
  }
  return { ...settings, [category]: days };
}

export function recallDaysFor(settings: Partial<RecallSettings> | undefined, category: TreatmentCategory): number {
  const value = settings?.[category];
  return isValidRecallDays(value) ? value : suggestRecallDays(category);
}

/** 從不可信來源（localStorage）還原：缺漏或不合法的值回到預設。 */
export function normalizeRecallSettings(input: unknown): RecallSettings {
  const defaults = defaultRecallSettings();
  if (!input || typeof input !== 'object') return defaults;
  const raw = input as Record<string, unknown>;
  const out = { ...defaults };
  for (const category of RECALL_CATEGORIES) {
    if (isValidRecallDays(raw[category])) out[category] = raw[category];
  }
  return out;
}

export function isDefaultRecallSettings(settings: RecallSettings): boolean {
  const defaults = defaultRecallSettings();
  return RECALL_CATEGORIES.every((category) => settings[category] === defaults[category]);
}
