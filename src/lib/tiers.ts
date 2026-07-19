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