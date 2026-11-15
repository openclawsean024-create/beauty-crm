// Beauty CRM — JSON export (local-only)
//
// Wraps the persisted client + visit data into a Blob URL so the UI can
// trigger a browser download. The data never leaves the user's device.
// 匯出檔含個資且未加密（加密匯出為 M2）；payload 內帶有「含個資」警告與格式版本。

import type { Customer } from './customers';
import type { Treatment } from './treatments';
import type { PersistedState } from './persistence';
import type { ServicePackage } from './packages';
import type { Appointment } from './appointments';
import type { EffectRecord } from './effects';
import type { ContactRecord } from './recall-queue';
import type { LineSendRecord } from './line-reminder';
import type { ConsentRecord } from './sensitive';

/** 匯出格式版本。v2（M1）起加入個資警告與套票、預約、效果、同意、發送紀錄。 */
export const EXPORT_FORMAT_VERSION = 2;

export const EXPORT_PERSONAL_DATA_NOTICE =
  '【含個資】本檔案包含客戶個人資料與敏感個資，內容未加密。請勿以電子郵件或通訊軟體傳送，使用後請自行刪除。';

/** M1 新增的匯出內容（全部選填，舊呼叫方式不受影響）。 */
export interface ExportExtras {
  packages?: ServicePackage[];
  appointments?: Appointment[];
  effects?: EffectRecord[];
  contactLog?: ContactRecord[];
  sendLog?: LineSendRecord[];
  consentLog?: ConsentRecord[];
  exportedBy?: string;
}

export interface ExportPayload extends ExportExtras {
  formatVersion: number;
  containsPersonalData: true;
  notice: string;
  exportedAt: string;
  workspace: string;
  customers: Customer[];
  treatments: Treatment[];
  lastVisit: PersistedState['lastVisit'];
  visitLog: PersistedState['visitLog'];
}

export function buildExportPayload(
  customers: Customer[],
  treatments: Treatment[],
  persisted: PersistedState,
  workspace: string = 'Atelier M',
  extras: ExportExtras = {},
): ExportPayload {
  return {
    formatVersion: EXPORT_FORMAT_VERSION,
    containsPersonalData: true,
    notice: EXPORT_PERSONAL_DATA_NOTICE,
    ...extras,
    exportedAt: new Date().toISOString(),
    workspace,
    customers,
    treatments,
    lastVisit: persisted.lastVisit,
    visitLog: persisted.visitLog ?? [],
  };
}

/** Serialize export payload to a stable JSON string. Pure function. */
export function serializeExport(payload: ExportPayload): string {
  return JSON.stringify(payload, null, 2);
}

/** Browser-only: trigger a local download of the payload. */
export function downloadExport(payload: ExportPayload, filename = 'beauty-crm-export-含個資.json'): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const json = serializeExport(payload);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Schedule cleanup after the click handler finishes
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
