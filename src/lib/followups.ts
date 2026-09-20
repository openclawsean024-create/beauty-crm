// Beauty CRM — 回訪草稿與人工核准狀態
// 純函式：草稿/已核准狀態機 + 同意狀態閘門 + recall template 解析
//
// 不發送任何訊息，只描述設計師對草稿做了什麼決策。
// 對應 SPEC §3.4 AC-007 (LINE 草稿必須先由設計師核准) 與 §UI-SPEC §3.3。

import type { ConsentStatus } from './customers';
import type { TreatmentCategory } from './treatments';
import { suggestRecallDays } from './treatments';

export type FollowupStatus = 'draft' | 'approved' | 'sent';

export interface FollowupDraft {
  customerId: string;
  status: FollowupStatus;
  body: string;
  updatedAt: string;
}

/** 同意狀態決定是否允許進入「核准 / 送出」動作。 */
export function canActOnDraft(consent: ConsentStatus): boolean {
  return consent === 'granted';
}

/** 同意狀態為 pending / revoked 時，給 UI 顯示的原因。 */
export function draftGateReason(consent: ConsentStatus): string | undefined {
  switch (consent) {
    case 'granted':
      return undefined;
    case 'pending':
      return '需先取得同意';
    case 'revoked':
      return '客戶已撤回行銷同意';
    default:
      return undefined;
  }
}

/** 核准後狀態切換:approved。語意為「設計師確認內容」,仍非實際發送。 */
export function approveDraft(draft: FollowupDraft): FollowupDraft {
  if (draft.status !== 'draft') return draft;
  return { ...draft, status: 'approved', updatedAt: new Date().toISOString() };
}

/** 從 draft 重設回尚未核准狀態。 */
export function resetDraft(draft: FollowupDraft): FollowupDraft {
  return { ...draft, status: 'draft', updatedAt: new Date().toISOString() };
}

// === Recall template ===

export interface RecallTemplateEntry {
  category: TreatmentCategory;
  label: string;
  defaultDays: number;
}

/** Recall 模板 (UI 顯示 + 自動帶入週期)。順序依 UI-SPEC §1: 設計師最常做 → 最少做。 */
export const RECALL_TEMPLATES: RecallTemplateEntry[] = [
  { category: 'manicure', label: '凝膠美甲', defaultDays: suggestRecallDays('manicure') },
  { category: 'eyelash', label: '美睫嫁接', defaultDays: suggestRecallDays('eyelash') },
  { category: 'skincare', label: '深層護膚', defaultDays: suggestRecallDays('skincare') },
  { category: 'hair', label: '剪髮護理', defaultDays: suggestRecallDays('hair') },
];

/** 依類別查 recall 預設日數 (fallback = 30)。 */
export function recallDaysFor(category: TreatmentCategory): number {
  return suggestRecallDays(category);
}

/** 依 today + 週期日,計算建議回訪日 (YYYY-MM-DD,本地時區)。 */
export function suggestNextRecallDate(today: Date, days: number): string {
  const ms = today.getTime() + days * 86_400_000;
  const d = new Date(ms);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
