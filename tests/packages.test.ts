// AC-001：套票（總堂數、已用、剩餘、到期）— 併自 concierge Plan 模型（FR-016）
import { describe, it, expect } from 'vitest';
import {
  PackageError,
  createPackage,
  daysUntilExpiry,
  isExpired,
  packageStatus,
  remainingSessions,
  remainingValue,
  summarizePackages,
  usageRatio,
  usePackageSession,
} from '@/lib/packages';

const base = {
  id: 'p1',
  customerId: 'c1',
  name: '示範保濕套票 10 堂',
  totalSessions: 10,
  usedSessions: 4,
  startDate: '2026-09-01',
  endDate: '2027-02-28',
  price: 18000,
};

describe('AC-001 packages — 套票', () => {
  it('AC-001: 建立套票並計算剩餘堂數、使用進度與剩餘價值', () => {
    const pkg = createPackage(base);
    expect(remainingSessions(pkg)).toBe(6);
    expect(usageRatio(pkg)).toBeCloseTo(0.4);
    expect(remainingValue(pkg)).toBe(10800);
  });

  it('AC-001: 欄位驗證（堂數、日期、價格）', () => {
    expect(() => createPackage({ ...base, totalSessions: 0 })).toThrow();
    expect(() => createPackage({ ...base, totalSessions: 2.5 })).toThrow();
    expect(() => createPackage({ ...base, usedSessions: 11 })).toThrow();
    expect(() => createPackage({ ...base, usedSessions: -1 })).toThrow();
    expect(() => createPackage({ ...base, endDate: '2026-08-31' })).toThrow();
    expect(() => createPackage({ ...base, startDate: '2026/09/01' })).toThrow();
    expect(() => createPackage({ ...base, price: -1 })).toThrow();
    expect(() => createPackage({ ...base, name: ' ' })).toThrow();
  });

  it('AC-001: 扣堂後已用 +1；堂數用完時不可再扣', () => {
    let pkg = createPackage({ ...base, usedSessions: 9 });
    pkg = usePackageSession(pkg, '2026-11-16');
    expect(pkg.usedSessions).toBe(10);
    expect(remainingSessions(pkg)).toBe(0);
    expect(packageStatus(pkg, '2026-11-16')).toBe('used-up');
    expect(() => usePackageSession(pkg, '2026-11-16')).toThrow(PackageError);
    try {
      usePackageSession(pkg, '2026-11-16');
    } catch (err) {
      expect((err as PackageError).code).toBe('PACKAGE_USED_UP');
    }
  });

  it('AC-001: 到期日當天仍可用，隔天起過期且不可扣堂', () => {
    const pkg = createPackage(base);
    expect(daysUntilExpiry(pkg, '2027-02-28')).toBe(0);
    expect(isExpired(pkg, '2027-02-28')).toBe(false);
    expect(usePackageSession(pkg, '2027-02-28').usedSessions).toBe(5);

    expect(daysUntilExpiry(pkg, '2027-03-01')).toBe(-1);
    expect(isExpired(pkg, '2027-03-01')).toBe(true);
    expect(packageStatus(pkg, '2027-03-01')).toBe('expired');
    try {
      usePackageSession(pkg, '2027-03-01');
      throw new Error('should have thrown');
    } catch (err) {
      expect((err as PackageError).code).toBe('PACKAGE_EXPIRED');
    }
  });

  it('AC-001: 尚未開始的套票不可扣堂', () => {
    const pkg = createPackage(base);
    try {
      usePackageSession(pkg, '2026-08-31');
      throw new Error('should have thrown');
    } catch (err) {
      expect((err as PackageError).code).toBe('PACKAGE_NOT_STARTED');
    }
  });

  it('AC-001: 30 天內到期顯示即將到期，過期優先於用完', () => {
    const pkg = createPackage(base);
    expect(packageStatus(pkg, '2026-11-16')).toBe('active');
    expect(packageStatus(pkg, '2027-01-29')).toBe('expiring-soon');
    const usedUpAndExpired = createPackage({ ...base, usedSessions: 10 });
    expect(packageStatus(usedUpAndExpired, '2027-03-05')).toBe('expired');
  });

  it('AC-001: 客戶套票摘要只加總可用套票，並回報最近到期日', () => {
    const packages = [
      createPackage(base),
      createPackage({ ...base, id: 'p2', totalSessions: 5, usedSessions: 5, endDate: '2027-06-30' }),
      createPackage({ ...base, id: 'p3', totalSessions: 3, usedSessions: 1, endDate: '2026-12-01', price: 3000 }),
      createPackage({ ...base, id: 'p4', totalSessions: 4, usedSessions: 0, endDate: '2026-10-01' }),
      createPackage({ ...base, id: 'p5', customerId: 'c2', totalSessions: 8, usedSessions: 0 }),
    ];
    const summary = summarizePackages(packages, 'c1', '2026-11-16');
    expect(summary.usable.map((p) => p.id)).toEqual(['p3', 'p1']);
    expect(summary.remainingSessions).toBe(8);
    expect(summary.remainingValue).toBe(2000 + 10800);
    expect(summary.nearestExpiry).toBe('2026-12-01');
    expect(summary.expiringSoon).toBe(true);

    const none = summarizePackages(packages, 'c9', '2026-11-16');
    expect(none.usable).toEqual([]);
    expect(none.remainingSessions).toBe(0);
    expect(none.nearestExpiry).toBeUndefined();
  });
});
