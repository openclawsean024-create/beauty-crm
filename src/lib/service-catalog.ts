// Beauty CRM — 服務品項目錄
// 併自 beauty-crm-concierge `data/mock.ts` 的 Treatment（品項：名稱、分類、時長、價格）
// 模型（SPEC §10.1 #5，FR-002／FR-003）。主 repo 的 Treatment 是「療程紀錄」，
// 為避免同名混淆，品項在此稱為 ServiceItem。
//
// 店家可維護品項清單；新增服務時由品項帶入價格、時長與成分，
// 分類一律對應既有 4 類回訪週期（美甲／美睫／皮膚管理／髮型）。

import type { TreatmentCategory, TreatmentDraft } from './treatments';
import { suggestRecallDays } from './treatments';

export const TREATMENT_CATEGORIES: TreatmentCategory[] = ['manicure', 'eyelash', 'skincare', 'hair'];

export interface ServiceItem {
  id: string;
  name: string;
  category: TreatmentCategory;
  durationMin: number; // 時長（分鐘）
  price: number; // 定價 TWD
  ingredients: string[]; // 用於過敏衝突檢查
  active: boolean;
}

export function isTreatmentCategory(value: unknown): value is TreatmentCategory {
  return typeof value === 'string' && (TREATMENT_CATEGORIES as string[]).includes(value);
}

export function createServiceItem(input: {
  id: string;
  name: string;
  category: TreatmentCategory;
  durationMin: number;
  price: number;
  ingredients?: string[];
  active?: boolean;
}): ServiceItem {
  if (!input.id?.trim()) throw new Error('service item id required');
  if (!input.name?.trim()) throw new Error('service item name required');
  if (!isTreatmentCategory(input.category)) {
    throw new Error(`category must be one of ${TREATMENT_CATEGORIES.join('/')}`);
  }
  if (!Number.isFinite(input.durationMin) || input.durationMin <= 0) {
    throw new Error('durationMin must be > 0');
  }
  if (!Number.isFinite(input.price) || input.price < 0) throw new Error('price cannot be negative');
  return {
    id: input.id.trim(),
    name: input.name.trim(),
    category: input.category,
    durationMin: input.durationMin,
    price: input.price,
    ingredients: (input.ingredients ?? []).map((i) => i.trim()).filter(Boolean),
    active: input.active ?? true,
  };
}

const CATEGORY_KEYWORDS: Array<{ category: TreatmentCategory; pattern: RegExp }> = [
  { category: 'manicure', pattern: /甲|nail|manicure/i },
  { category: 'eyelash', pattern: /睫|lash/i },
  { category: 'hair', pattern: /髮|剪|染|燙|hair|colou?r|keratin/i },
  { category: 'skincare', pattern: /膚|臉|保濕|修護|清潔|導入|facial|skin|hydrat|cleanse/i },
];

/**
 * 把自由文字分類（例如 concierge 的「深層保濕」「敏感修護」）對應到既有 4 類。
 * 無法判斷時回傳 undefined，由店家手動指定，不猜測。
 */
export function mapCategoryLabel(label: string): TreatmentCategory | undefined {
  const text = label.trim();
  if (!text) return undefined;
  if (isTreatmentCategory(text)) return text;
  return CATEGORY_KEYWORDS.find((entry) => entry.pattern.test(text))?.category;
}

/** 預設示範品項（皆為虛構品項與價格）。 */
export const DEFAULT_SERVICE_CATALOG: ServiceItem[] = [
  createServiceItem({ id: 'svc-gel', name: '凝膠美甲', category: 'manicure', durationMin: 90, price: 1500, ingredients: ['HEMA'] }),
  createServiceItem({ id: 'svc-lash', name: '美睫嫁接', category: 'eyelash', durationMin: 60, price: 1800, ingredients: ['氰基丙烯酸酯'] }),
  createServiceItem({ id: 'svc-hydra', name: '保濕導入', category: 'skincare', durationMin: 75, price: 1900, ingredients: ['玻尿酸'] }),
  createServiceItem({ id: 'svc-cleanse', name: '深層清潔', category: 'skincare', durationMin: 60, price: 1600, ingredients: ['高濃度酸類'] }),
  createServiceItem({ id: 'svc-cut', name: '剪髮護理', category: 'hair', durationMin: 60, price: 1200, ingredients: [] }),
  createServiceItem({ id: 'svc-color', name: '染髮補色', category: 'hair', durationMin: 120, price: 3200, ingredients: ['PPD', '香精'] }),
];

export function findServiceItem(catalog: ServiceItem[], id: string | undefined): ServiceItem | undefined {
  return id ? catalog.find((item) => item.id === id) : undefined;
}

export function activeServiceItems(catalog: ServiceItem[]): ServiceItem[] {
  return catalog.filter((item) => item.active);
}

export function catalogByCategory(catalog: ServiceItem[]): Record<TreatmentCategory, ServiceItem[]> {
  const out: Record<TreatmentCategory, ServiceItem[]> = { manicure: [], eyelash: [], skincare: [], hair: [] };
  for (const item of catalog) out[item.category].push(item);
  return out;
}

export function upsertServiceItem(catalog: ServiceItem[], item: ServiceItem): ServiceItem[] {
  const exists = catalog.some((existing) => existing.id === item.id);
  return exists ? catalog.map((existing) => (existing.id === item.id ? item : existing)) : [...catalog, item];
}

/** 停用品項（保留歷史療程對品項的參照，不直接刪除）。 */
export function deactivateServiceItem(catalog: ServiceItem[], id: string): ServiceItem[] {
  return catalog.map((item) => (item.id === id ? { ...item, active: false } : item));
}

/** 品項對應的回訪天數：依分類查店家設定，沒有設定時用預設 4 類週期。 */
export function recallDaysForItem(
  item: ServiceItem,
  settings?: Partial<Record<TreatmentCategory, number>>,
): number {
  return settings?.[item.category] ?? suggestRecallDays(item.category);
}

/** 新增服務時由品項帶入名稱、分類、價格、時長與成分；price 可被現場金額覆寫。 */
export function draftFromServiceItem(
  item: ServiceItem,
  input: {
    id: string;
    customerId: string;
    performedAt: string;
    designerId?: string;
    price?: number;
    notes?: string;
  },
): TreatmentDraft {
  return {
    id: input.id,
    customerId: input.customerId,
    category: item.category,
    serviceName: item.name,
    productIngredients: [...item.ingredients],
    price: input.price ?? item.price,
    durationMin: item.durationMin,
    performedAt: input.performedAt,
    designerId: input.designerId,
    notes: input.notes,
  };
}
