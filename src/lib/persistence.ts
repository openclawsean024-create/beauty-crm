// Beauty CRM — local persistence helpers (v3 Retention Desk only)
//
// Scope: store language preference, theme preference, and the most recent
// service record so the user's session survives a page refresh.
// Data never leaves the device; no remote sync, no telemetry.

import { isLang, type Lang } from './i18n';

export type Theme = 'light' | 'dark';

export interface VisitRecord {
  clientName: string;
  service: string;
  date: string; // ISO date YYYY-MM-DD
  amount: number; // positive TWD
  note: string;
  consent: boolean;
  savedAt: string; // ISO timestamp
}

export interface PersistedState {
  lang?: Lang;
  theme?: Theme;
  lastVisit?: VisitRecord;
  visitLog?: VisitRecord[];
}

const STORAGE_KEY = 'ritual-beauty-crm-v3';

export const PERSISTENCE_KEY = STORAGE_KEY;

function getStorage(): Storage | undefined {
  try {
    // Use globalThis so the same adapter works in browsers, SSR, and the
    // lightweight localStorage shim used by the deterministic test suite.
    const storage = (globalThis as typeof globalThis & { localStorage?: Storage }).localStorage;
    if (storage && typeof storage.getItem === 'function' && typeof storage.setItem === 'function') {
      return storage;
    }
  } catch {
    // Storage can throw in restricted browser contexts; treat it as absent.
  }
  return undefined;
}

/** Read persisted state from window.localStorage. Safe to call on server. */
export function loadPersistedState(): PersistedState {
  const storage = getStorage();
  if (!storage) return {};
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    const state = parsed as PersistedState;
    const out: PersistedState = {};
    if (isLang(state.lang)) out.lang = state.lang;
    if (state.theme === 'light' || state.theme === 'dark') out.theme = state.theme;
    if (state.lastVisit && isVisitRecord(state.lastVisit)) {
      out.lastVisit = state.lastVisit;
    }
    if (Array.isArray(state.visitLog)) {
      out.visitLog = state.visitLog.filter(isVisitRecord);
    }
    return out;
  } catch {
    // corrupt or unreadable storage — fall back to defaults
    return {};
  }
}

export function persistState(state: PersistedState): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function mergePersistedState(prev: PersistedState, next: PersistedState): PersistedState {
  return {
    lang: next.lang ?? prev.lang,
    theme: next.theme ?? prev.theme,
    lastVisit: next.lastVisit ?? prev.lastVisit,
    visitLog: next.visitLog ?? prev.visitLog,
  };
}

export function isVisitRecord(value: unknown): value is VisitRecord {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.clientName === 'string' &&
    typeof v.service === 'string' &&
    typeof v.date === 'string' &&
    typeof v.amount === 'number' &&
    typeof v.note === 'string' &&
    typeof v.consent === 'boolean' &&
    typeof v.savedAt === 'string'
  );
}

export function makeVisitRecord(input: {
  clientName: string;
  service: string;
  date: string;
  amount: number;
  note: string;
  consent: boolean;
}): VisitRecord {
  return {
    clientName: input.clientName,
    service: input.service,
    date: input.date,
    amount: input.amount,
    note: input.note,
    consent: input.consent,
    savedAt: new Date().toISOString(),
  };
}

export function appendVisit(prev: PersistedState, visit: VisitRecord): PersistedState {
  const log = prev.visitLog ? [visit, ...prev.visitLog] : [visit];
  return { ...prev, lastVisit: visit, visitLog: log.slice(0, 20) };
}
