import { describe, it, expect } from 'vitest';
import { tierForSpend, nextTier, progressToNextTier, applyDiscount, DEFAULT_TIER_RULES } from '@/lib/tiers';

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
});