// Beauty CRM — 套票（療程方案）
// 併自 beauty-crm-concierge `data/mock.ts` 的 Plan 模型與 MemberPlanCard 的進度計算
// （SPEC §10.1 #1，FR-016）。只搬資料模型與計算，不搬會員端 UI。
// 純函式；所有日期為本地 YYYY-MM-DD。

import { diffDays, isDateOnly } from './dates';

export interface ServicePackage {
  id: string;
  customerId: string;
  storeId?: string;
  name: string;
  totalSessions: number; // 總堂數（正整數）
  usedSessions: number; // 已用堂數（0..totalSessions）
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD（含當日）
  price: number; // 套票總價 TWD（非負）
  catalogItemIds: string[]; // 涵蓋的服務品項
}

export type PackageStatus = 'active' | 'expiring-soon' | 'used-up' | 'expired';

export type PackageErrorCode = 'PACKAGE_USED_UP' | 'PACKAGE_EXPIRED' | 'PACKAGE_NOT_STARTED';

export class PackageError extends Error {
  constructor(public readonly code: PackageErrorCode) {
    super(code);
    this.name = 'PackageError';
  }
}

export function createPackage(input: {
  id: string;
  customerId: string;
  storeId?: string;
  name: string;
  totalSessions: number;
  usedSessions?: number;
  startDate: string;
  endDate: string;
  price: number;
  catalogItemIds?: string[];
}): ServicePackage {
  if (!input.id?.trim()) throw new Error('package id required');
  if (!input.customerId) throw new Error('customerId required');
  if (!input.name?.trim()) throw new Error('package name required');
  if (!Number.isInteger(input.totalSessions) || input.totalSessions <= 0) {
    throw new Error('totalSessions must be a positive integer');
  }
  const used = input.usedSessions ?? 0;
  if (!Number.isInteger(used) || used < 0 || used > input.totalSessions) {
    throw new Error('usedSessions must be between 0 and totalSessions');
  }
  if (!isDateOnly(input.startDate) || !isDateOnly(input.endDate)) {
    throw new Error('startDate/endDate must be YYYY-MM-DD');
  }
  if (diffDays(input.startDate, input.endDate) < 0) throw new Error('endDate must not be before startDate');
  if (!Number.isFinite(input.price) || input.price < 0) throw new Error('price cannot be negative');
  return {
    id: input.id.trim(),
    customerId: input.customerId,
    storeId: input.storeId,
    name: input.name.trim(),
    totalSessions: input.totalSessions,
    usedSessions: used,
    startDate: input.startDate,
    endDate: input.endDate,
    price: input.price,
    catalogItemIds: input.catalogItemIds ?? [],
  };
}

export function remainingSessions(pkg: ServicePackage): number {
  return Math.max(0, pkg.totalSessions - pkg.usedSessions);
}

/** 使用進度 0..1。 */
export function usageRatio(pkg: ServicePackage): number {
  return pkg.totalSessions === 0 ? 1 : Math.min(1, pkg.usedSessions / pkg.totalSessions);
}

/** 依剩餘堂數比例估算的剩餘價值（TWD，四捨五入）。 */
export function remainingValue(pkg: ServicePackage): number {
  return Math.round((pkg.price * remainingSessions(pkg)) / pkg.totalSessions);
}

/** 距到期日的天數；到期日當天為 0，已過期為負數。 */
export function daysUntilExpiry(pkg: ServicePackage, today: string): number {
  return diffDays(today, pkg.endDate);
}

export function isExpired(pkg: ServicePackage, today: string): boolean {
  return daysUntilExpiry(pkg, today) < 0;
}

export function isUsedUp(pkg: ServicePackage): boolean {
  return remainingSessions(pkg) === 0;
}

/** 過期優先於用完：過期後剩餘堂數已不可用。 */
export function packageStatus(
  pkg: ServicePackage,
  today: string,
  expiringSoonDays: number = 30,
): PackageStatus {
  if (isExpired(pkg, today)) return 'expired';
  if (isUsedUp(pkg)) return 'used-up';
  if (daysUntilExpiry(pkg, today) <= expiringSoonDays) return 'expiring-soon';
  return 'active';
}

/** 扣一堂。堂數用完、已過期或尚未開始時 throw PackageError。 */
export function consumePackageSession(pkg: ServicePackage, today: string): ServicePackage {
  if (isExpired(pkg, today)) throw new PackageError('PACKAGE_EXPIRED');
  if (diffDays(pkg.startDate, today) < 0) throw new PackageError('PACKAGE_NOT_STARTED');
  if (isUsedUp(pkg)) throw new PackageError('PACKAGE_USED_UP');
  return { ...pkg, usedSessions: pkg.usedSessions + 1 };
}

export function packagesByCustomer(packages: ServicePackage[], customerId: string): ServicePackage[] {
  return packages
    .filter((p) => p.customerId === customerId)
    .sort((a, b) => a.endDate.localeCompare(b.endDate));
}

export interface PackageSummary {
  /** 尚可使用（未過期且有剩餘堂數）的套票，依到期日由近到遠 */
  usable: ServicePackage[];
  remainingSessions: number;
  remainingValue: number;
  /** 最近的到期日（只看可用套票） */
  nearestExpiry: string | undefined;
  /** 最近到期套票是否在提醒區間內 */
  expiringSoon: boolean;
}

/** 客戶記憶面板用的套票摘要（到期提醒計算）。 */
export function summarizePackages(
  packages: ServicePackage[],
  customerId: string,
  today: string,
  expiringSoonDays: number = 30,
): PackageSummary {
  const usable = packagesByCustomer(packages, customerId).filter((p) => {
    const status = packageStatus(p, today, expiringSoonDays);
    return status === 'active' || status === 'expiring-soon';
  });
  const nearest = usable[0];
  return {
    usable,
    remainingSessions: usable.reduce((sum, p) => sum + remainingSessions(p), 0),
    remainingValue: usable.reduce((sum, p) => sum + remainingValue(p), 0),
    nearestExpiry: nearest?.endDate,
    expiringSoon: nearest ? packageStatus(nearest, today, expiringSoonDays) === 'expiring-soon' : false,
  };
}
