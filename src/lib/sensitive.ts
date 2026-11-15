// Beauty CRM — 敏感個資（S 級）同意、遮罩與清除（FR-012，SPEC §6）
// S 級欄位：過敏／禁忌、皮膚狀況、健康相關備註、Before/After 效果紀錄與膚況指標。
// 敏感個資同意（sensitiveDataConsent）與行銷同意（consent）分開管理。

import type { ConsentStatus, Customer } from './customers';

export type SensitiveErrorCode = 'SENSITIVE_CONSENT_REQUIRED';

export class SensitiveConsentError extends Error {
  readonly code: SensitiveErrorCode = 'SENSITIVE_CONSENT_REQUIRED';
  constructor() {
    super('SENSITIVE_CONSENT_REQUIRED');
    this.name = 'SensitiveConsentError';
  }
}

export interface SensitiveFields {
  allergies: string[];
  skinCondition?: string;
  healthNotes?: string;
}

export const SENSITIVE_CUSTOMER_FIELDS = ['allergies', 'skinCondition', 'healthNotes'] as const;

/** 未設定視為 pending（尚未取得）。 */
export function sensitiveConsentOf(customer: Pick<Customer, 'sensitiveDataConsent'>): ConsentStatus {
  return customer.sensitiveDataConsent ?? 'pending';
}

export function canStoreSensitive(customer: Pick<Customer, 'sensitiveDataConsent'>): boolean {
  return sensitiveConsentOf(customer) === 'granted';
}

export function pickSensitive(customer: Partial<SensitiveFields>): SensitiveFields {
  return {
    allergies: [...(customer.allergies ?? [])],
    skinCondition: customer.skinCondition,
    healthNotes: customer.healthNotes,
  };
}

/** 是否含任何非空的 S 級欄位。 */
export function hasSensitiveData(fields: Partial<SensitiveFields>): boolean {
  return (
    (fields.allergies?.some((a) => a.trim().length > 0) ?? false) ||
    Boolean(fields.skinCondition?.trim()) ||
    Boolean(fields.healthNotes?.trim())
  );
}

/** 未取得敏感個資同意卻要寫入 S 級欄位時 throw。 */
export function assertSensitiveAllowed(consent: ConsentStatus | undefined, fields: Partial<SensitiveFields>): void {
  if (consent !== 'granted' && hasSensitiveData(fields)) throw new SensitiveConsentError();
}

/** 清除客戶身上的 S 級欄位（撤回同意、或對無權限者輸出時使用）。 */
export function stripSensitive<T extends Customer>(customer: T): T {
  return { ...customer, allergies: [], skinCondition: undefined, healthNotes: undefined };
}

/** UI 遮罩字串：不洩漏原文長度以外的任何資訊，固定輸出 6 個圓點。 */
export const SENSITIVE_MASK = '••••••';

export function maskSensitive(value: string | undefined): string {
  return value && value.trim() ? SENSITIVE_MASK : '';
}

/** 給 UI 的摘要：有哪幾類 S 級資料（不含內容）。 */
export function sensitiveFieldCount(fields: Partial<SensitiveFields>): number {
  return (
    (fields.allergies?.filter((a) => a.trim()).length ?? 0) +
    (fields.skinCondition?.trim() ? 1 : 0) +
    (fields.healthNotes?.trim() ? 1 : 0)
  );
}

export type ConsentKind = 'marketing' | 'sensitive';

/** 同意紀錄：誰在何時把哪一種同意改成什麼狀態。 */
export interface ConsentRecord {
  id: string;
  customerId: string;
  kind: ConsentKind;
  status: ConsentStatus;
  recordedAt: string; // ISO timestamp
  recordedBy: string; // account id
}

export function consentHistory(log: ConsentRecord[], customerId: string, kind?: ConsentKind): ConsentRecord[] {
  return log
    .filter((r) => r.customerId === customerId && (!kind || r.kind === kind))
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
}

export function latestConsentRecord(
  log: ConsentRecord[],
  customerId: string,
  kind: ConsentKind,
): ConsentRecord | undefined {
  const history = consentHistory(log, customerId, kind);
  return history[history.length - 1];
}
