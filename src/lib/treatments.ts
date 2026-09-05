// Beauty CRM — 療程紀錄
// Each treatment captures what service was done, when, who, price.

import type { CompressedPhotoRef } from './photos';
import { logEvent } from './audit';

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
  /**
   * Before/After 照片 reference（FR-007）。
   * 透過 `addPhoto()` 加入，永遠不可變（spread 新陣列）。
   */
  photos: CompressedPhotoRef[];
  /**
   * 樂觀鎖版本（DoD-8：成本/事件/版本/決策 可由 maintainer 追查）。
   * 與 Customer.version 對齊。
   * 對已存在 treatment 做後續操作（如 addPhoto）時不 bump —
   * 該欄位追蹤「資料的單一寫入版本」，附加照片屬於資料累積，
   * 不是替換主要欄位。
   */
  version: number;
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
  photos?: CompressedPhotoRef[];
}

export function recordTreatment(draft: TreatmentDraft): Treatment {
  if (!draft.id || !draft.id.trim()) throw new Error('treatment id required');
  if (!draft.customerId) throw new Error('customerId required');
  if (!draft.serviceName.trim()) throw new Error('serviceName required');
  if (draft.price < 0) throw new Error('price cannot be negative');
  if (draft.durationMin <= 0) throw new Error('durationMin must be > 0');
  const performed = new Date(draft.performedAt);
  if (Number.isNaN(performed.getTime())) throw new Error('invalid performedAt');
  const treatment: Treatment = {
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
    photos: draft.photos ? [...draft.photos] : [],
    version: 1,
  };
  // DoD-8：每次 recordTreatment 同步上報 audit event
  logEvent(
    'treatment.recorded',
    {
      treatmentId: treatment.id,
      customerId: treatment.customerId,
      category: treatment.category,
      price: treatment.price,
    },
    treatment.designerId ?? 'designer-local',
  );
  return treatment;
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
export const DEFAULT_RECALL_DAYS: Record<TreatmentCategory, number> = {
  manicure: 28, // 美甲 4 週
  eyelash: 21, // 美睫 3 週
  skincare: 30, // 皮膚管理 4 週
  hair: 45, // 髮型 6-7 週
};

/**
 * 取得某 category 的建議回訪天數（FR-003：可調）。
 *
 * 行為：
 * - 不傳 customRules → 用 DEFAULT_RECALL_DAYS
 * - 傳入 customRules（Partial）→ 有覆寫的 category 用自訂值，沒覆寫的 fallback DEFAULT
 *
 * 設計：customRules 是 Partial<Record>，允許「只覆寫部分 category」，
 * 避免呼叫端為了一個 manicure=14 要重複寫 4 個 key。
 */
export function suggestRecallDays(
  category: TreatmentCategory,
  customRules?: Partial<Record<TreatmentCategory, number>>,
): number {
  if (customRules && customRules[category] !== undefined) {
    return customRules[category]!;
  }
  return DEFAULT_RECALL_DAYS[category];
}

/**
 * 加入 Before/After 照片到療程（FR-007）。
 * 純函數：回傳新 Treatment 物件，原 treatment.photos 陣列不變。
 */
export function addPhoto(t: Treatment, photo: CompressedPhotoRef): Treatment {
  return { ...t, photos: [...t.photos, photo] };
}