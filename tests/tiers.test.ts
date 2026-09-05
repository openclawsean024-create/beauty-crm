import { describe, it, expect } from 'vitest';
import { tierForSpend, nextTier, progressToNextTier, applyDiscount, tierReason, DEFAULT_TIER_RULES } from '@/lib/tiers';

describe('tiers — 會員分級', () => {
  it('AC: 累計 0 → standard', () => {
    expect(tierForSpend(0).tier).toBe('standard');
  });

  it('AC: 累計 4,999 → standard；5,000 → silver', () => {
    expect(tierForSpend(4999).tier).toBe('standard');
    expect(tierForSpend(5000).tier).toBe('silver');
  });

  it('AC: 累計 20,000 → gold', () => {
    expect(tierForSpend(20000).tier).toBe('gold');
    expect(tierForSpend(59999).tier).toBe('gold');
    expect(tierForSpend(60000).tier).toBe('black');
  });

  it('AC: 負數 throw', () => {
    expect(() => tierForSpend(-1)).toThrow();
  });

  it('AC: nextTier 對最高 tier 回 undefined', () => {
    expect(nextTier(100000)).toBeUndefined();
    expect(nextTier(5000)?.tier).toBe('gold');
    expect(nextTier(0)?.tier).toBe('silver');
  });

  it('AC: progressToNextTier 計算剩餘金額與比例', () => {
    const p = progressToNextTier(10000);
    expect(p.current.tier).toBe('silver');
    expect(p.next?.tier).toBe('gold');
    expect(p.remaining).toBe(10000); // 20000 - 10000
    expect(p.ratio).toBeCloseTo(0.333, 2); // (10000-5000)/(20000-5000) = 1/3
  });

  it('AC: 已是 black → ratio=1, next=undefined', () => {
    const p = progressToNextTier(100000);
    expect(p.ratio).toBe(1);
    expect(p.next).toBeUndefined();
  });

  it('AC: applyDiscount 套用 tier 折扣並四捨五入', () => {
    expect(applyDiscount(1000, DEFAULT_TIER_RULES.find((r) => r.tier === 'gold')!)).toBe(900);
    expect(applyDiscount(1000, DEFAULT_TIER_RULES.find((r) => r.tier === 'silver')!)).toBe(950);
    expect(applyDiscount(1000, DEFAULT_TIER_RULES.find((r) => r.tier === 'standard')!)).toBe(1000);
    expect(applyDiscount(1234, DEFAULT_TIER_RULES.find((r) => r.tier === 'black')!)).toBe(1049); // 1234 * 0.85 = 1048.9 → 1049
  });

  it('AC: applyDiscount 負數 throw', () => {
    const silver = DEFAULT_TIER_RULES.find((r) => r.tier === 'silver')!;
    expect(() => applyDiscount(-100, silver)).toThrow();
  });

  // AC-009：VIP 觸發原因（不是黑箱 badge）
  it('AC-009: silver at 6,000 → reason 含「5,000」與「銀卡」', () => {
    const silver = DEFAULT_TIER_RULES.find((r) => r.tier === 'silver')!;
    const gold = DEFAULT_TIER_RULES.find((r) => r.tier === 'gold')!;
    const reason = tierReason(silver, 6000, gold);
    expect(reason).toContain('5,000');
    expect(reason).toContain('銀卡');
    expect(reason).toContain('6,000');
  });

  it('AC-009: silver at 6,000 → 顯示差 NT$ 14,000 升 金卡會員', () => {
    const silver = DEFAULT_TIER_RULES.find((r) => r.tier === 'silver')!;
    const gold = DEFAULT_TIER_RULES.find((r) => r.tier === 'gold')!;
    const reason = tierReason(silver, 6000, gold);
    expect(reason).toContain('14,000');
    expect(reason).toContain('金卡');
  });

  it('AC-009: 已是 black（最高）→ 不附升級字串', () => {
    const black = DEFAULT_TIER_RULES.find((r) => r.tier === 'black')!;
    const reason = tierReason(black, 100000, undefined);
    expect(reason).toContain('黑卡');
    expect(reason).not.toContain('差 NT$');
    expect(reason).toContain('100,000');
  });

  it('AC-009: standard at 0 → reason 含「一般會員」', () => {
    const standard = DEFAULT_TIER_RULES.find((r) => r.tier === 'standard')!;
    const silver = DEFAULT_TIER_RULES.find((r) => r.tier === 'silver')!;
    const reason = tierReason(standard, 0, silver);
    expect(reason).toContain('一般會員');
    expect(reason).toContain('銀卡');
  });

  it('AC-009: tierReason 負數 throw', () => {
    const silver = DEFAULT_TIER_RULES.find((r) => r.tier === 'silver')!;
    expect(() => tierReason(silver, -100)).toThrow();
  });
});