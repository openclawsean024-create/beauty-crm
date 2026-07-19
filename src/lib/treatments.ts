// Beauty CRM — 療程紀錄
// Each treatment captures what service was done, when, who, price.

export type TreatmentCategory =
  | 'manicure' // 美甲
  | 'eyelash' // 美睫
  | 'skincare' // 皮膚管理
  | 'hair'; // 髮型

export interface Treatment {
  id: string;
  customerId: string;
  category: TreatmentCategory;
  serviceName: string; // e.g. "凝膠美甲 + 設計"
  productIngredients: string[]; // for allergy conflict check
  price: number; // TWD, always positive
  durationMin: number; // service duration
  performedAt: string; // ISO timestamp
  designerId?: string; // 設計師 ID
  notes?: string;
}

export interface TreatmentDraft {
  id: string;
  customerId: string;
  category: TreatmentCategory;
  serviceName: string;
  productIngredients?: string[];
  price: number;
  durationMin: number;
  performedAt: string;
  designerId?: string;
  notes?: string;
}

export function recordTreatment(draft: TreatmentDraft): Treatment {
  if (!draft.id || !draft.id.trim()) throw new Error('treatment id required');
  if (!draft.customerId) throw new Error('customerId required');
  if (!draft.serviceName.trim()) throw new Error('serviceName required');
  if (draft.price < 0) throw new Error('price cannot be negative');
  if (draft.durationMin <= 0) throw new Error('durationMin must be > 0');
  const performed = new Date(draft.performedAt);
  if (Number.isNaN(performed.getTime())) throw new Error('invalid performedAt');
  return {
    id: draft.id.trim(),
    customerId: draft.customerId,
    category: draft.category,
    serviceName: draft.serviceName.trim(),
    productIngredients: draft.productIngredients ?? [],
    price: draft.price,
    durationMin: draft.durationMin,
    performedAt: draft.performedAt,
    designerId: draft.designerId,
    notes: draft.notes,
  };
}

export function treatmentsByCustomer(
  treatments: Treatment[],
  customerId: string,
): Treatment[] {
  return treatments
    .filter((t) => t.customerId === customerId)
    .sort((a, b) => b.performedAt.localeCompare(a.performedAt));
}

export function lastTreatment(
  treatments: Treatment[],
  customerId: string,
): Treatment | undefined {
  return treatmentsByCustomer(treatments, customerId)[0];
}

// 預設回訪間隔（天）— 各療程的建議回流週期
const DEFAULT_RECALL_DAYS: Record<TreatmentCategory, number> = {
  manicure: 28, // 美甲 4 週
  eyelash: 21, // 美睫 3 週
  skincare: 30, // 皮膚管理 4 週
  hair: 45, // 髮型 6-7 週
};

export function suggestRecallDays(category: TreatmentCategory): number {
  return DEFAULT_RECALL_DAYS[category];
}