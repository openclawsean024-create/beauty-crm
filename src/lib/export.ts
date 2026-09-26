// Beauty CRM — JSON export (local-only)
//
// Wraps the persisted client + visit data into a Blob URL so the UI can
// trigger a browser download. The data never leaves the user's device.

import type { Customer } from './customers';
import type { Treatment } from './treatments';
import type { PersistedState } from './persistence';

export interface ExportPayload {
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
): ExportPayload {
  return {
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
export function downloadExport(payload: ExportPayload, filename = 'ritual-client-data.json'): void {
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
