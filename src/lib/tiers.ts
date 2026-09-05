// Beauty CRM — 會員分級
// 一般 / 銀卡 / 金卡 / 黑卡 — 依累計消費金額

export type Tier = 'standard' | 'silver' | 'gold' | 'black';

export interface TierRule {
  tier: Tier;
  minSpend: number; // TWD (positive)
  discount: number; // 0-1 折扣率
  label: string;
  perks: string[];
}

// 預設分級規則（依累計消費 TWD）
export const DEFAULT_TIER_RULES: TierRule[] = [
  {
    tier: 'standard',
    minSpend: 0,
    discount: 0,
    label: '一般會員',
    perks: ['累積消費紀錄', '基本預約'],
  },
  {
    tier: 'silver',
    minSpend: 5_000,
    discount: 0.05,
    label: '銀卡會員',
    perks: ['9.5 折優惠', '生日禮 NT$200', '新品優先體驗'],
  },
  {
    tier: 'gold',
    minSpend: 20_000,
    discount: 0.1,
    label: '金卡會員',
    perks: ['9 折優惠', '生日禮 NT$500', '指定設計師保留', '新客回頭客活動優先'],
  },
  {
    tier: 'black',
    minSpend: 60_000,
    discount: 0.15,
    label: '黑卡會員',
    perks: ['8.5 折優惠', '生日禮 NT$1,000', 'VVIP 私人時段', '新品免費體驗 2 次/年'],
  },
];

export function tierForSpend(
  totalSpent: number,
  rules: TierRule[] = DEFAULT_TIER_RULES,
): TierRule {
  if (totalSpent < 0) throw new Error('totalSpent cannot be negative');
  // 從最高 tier 往下找第一個 minSpend <= totalSpent
  const sorted = [...rules].sort((a, b) => b.minSpend - a.minSpend);
  for (const r of sorted) {
    if (totalSpent >= r.minSpend) return r;
  }
  return rules[0]!;
}

export function nextTier(
  totalSpent: number,
  rules: TierRule[] = DEFAULT_TIER_RULES,
): TierRule | undefined {
  const sorted = [...rules].sort((a, b) => a.minSpend - b.minSpend);
  for (const r of sorted) {
    if (r.minSpend > totalSpent) return r;
  }
  return undefined; // 已是最高
}

export function progressToNextTier(
  totalSpent: number,
  rules: TierRule[] = DEFAULT_TIER_RULES,
): { current: TierRule; next: TierRule | undefined; remaining: number; ratio: number } {
  const current = tierForSpend(totalSpent, rules);
  const next = nextTier(totalSpent, rules);
  if (!next) {
    return { current, next: undefined, remaining: 0, ratio: 1 };
  }
  const remaining = next.minSpend - totalSpent;
  const span = next.minSpend - current.minSpend;
  const ratio = span === 0 ? 1 : Math.min(1, (totalSpent - current.minSpend) / span);
  return { current, next, remaining, ratio };
}

export function applyDiscount(price: number, tier: TierRule): number {
  if (price < 0) throw new Error('price cannot be negative');
  return Math.round(price * (1 - tier.discount));
}

/**
 * VIP 觸發原因（FR-006 / AC-009）。
 *
 * 把「為什麼是這個 tier」變成可讀字串，給 Dashboard / 對客溝通用。
 * 不是黑箱 badge — owner 與客戶都能理解。
 *
 * 規則（對齊 SPEC §1.5 Non-Goals 與 SPEC §3.1 FR-006）：
 * - 必含累計金額（NT$） + 該 tier 的 label  + 門檻
 * - 有 nextTier 時附「差 NT$xx 升 {nextLabel}」，給升級提醒
 * - 無 nextTier（已是最高）只顯示「已是 {label}」
 *
 * 純函數：給定 tier + 累計 + 下一階，回傳單一字串；不修改輸入。
 */
export function tierReason(
  tier: TierRule,
  totalSpent: number,
  nextTier?: TierRule,
  locale: string = 'zh-TW',
): string {
  if (totalSpent < 0) {
    throw new Error('tierReason: totalSpent cannot be negative');
  }
  const formatter = new Intl.NumberFormat(locale);
  const spentStr = formatter.format(totalSpent);
  const thresholdStr = formatter.format(tier.minSpend);

  if (!nextTier) {
    return `累計 NT$${spentStr}，已是 ${tier.label}（最高等級）`;
  }
  const diff = Math.max(0, nextTier.minSpend - totalSpent);
  const diffStr = formatter.format(diff);
  return `累計 NT$${spentStr} 達到 ${tier.label}（門檻 NT$${thresholdStr}，差 NT$${diffStr} 升 ${nextTier.label}）`;
}