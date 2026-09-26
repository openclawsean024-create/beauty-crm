// Persistence tests — v3 review gate §6 "[ ] 服務紀錄送出後可在重新整理後保留最後一筆本機資料。"
// Uses an in-memory localStorage shim so the test runs in the Node test env.
import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadPersistedState,
  persistState,
  mergePersistedState,
  isVisitRecord,
  makeVisitRecord,
  appendVisit,
  type PersistedState,
} from '@/lib/persistence';
import { isLang } from '@/lib/i18n';

interface MemStorage {
  store: Map<string, string>;
}

function withLocalStorage<T>(fn: () => T): T {
  const original = (globalThis as { localStorage?: unknown }).localStorage;
  const fake = makeFakeLocalStorage();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get: () => fake,
  });
  try {
    return fn();
  } finally {
    if (original === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: original,
      });
    }
  }
}

function makeFakeLocalStorage(): MemStorage & {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
} {
  const store = new Map<string, string>();
  return {
    store,
    getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
}

describe('persistence — local state round-trip', () => {
  beforeEach(() => {
    // ensure no leakage between tests
  });

  it('returns empty state when localStorage is empty', () => {
    withLocalStorage(() => {
      expect(loadPersistedState()).toEqual({});
    });
  });

  it('persists and reloads lang + theme + lastVisit', () => {
    withLocalStorage(() => {
      const visit = makeVisitRecord({
        clientName: '陳美玲',
        service: 'Keratin care',
        date: '2026-09-24',
        amount: 2800,
        note: 'Fragrance-free',
        consent: true,
      });
      const state: PersistedState = {
        lang: 'zh',
        theme: 'dark',
        lastVisit: visit,
      };
      expect(persistState(state)).toBe(true);
      const reloaded = loadPersistedState();
      expect(reloaded.lang).toBe('zh');
      expect(reloaded.theme).toBe('dark');
      expect(reloaded.lastVisit).toEqual(visit);
    });
  });

  it('survives a simulated refresh by reading from localStorage', () => {
    withLocalStorage(() => {
      const visit = makeVisitRecord({
        clientName: '陳美玲',
        service: 'Keratin care',
        date: '2026-09-24',
        amount: 2800,
        note: 'Fragrance-free',
        consent: true,
      });
      persistState({ lang: 'en', theme: 'light', lastVisit: visit });

      // simulate full reload by re-reading
      const reloaded = loadPersistedState();
      expect(reloaded.lastVisit?.clientName).toBe('陳美玲');
      expect(reloaded.lastVisit?.amount).toBe(2800);
      expect(isLang(reloaded.lang)).toBe(true);
    });
  });

  it('mergePersistedState keeps the most recent field values', () => {
    const a: PersistedState = { lang: 'zh', theme: 'light' };
    const b: PersistedState = { theme: 'dark' };
    expect(mergePersistedState(a, b)).toEqual({ lang: 'zh', theme: 'dark' });
  });

  it('appendVisit records the latest service and limits history to 20', () => {
    let state: PersistedState = {};
    for (let i = 0; i < 25; i += 1) {
      state = appendVisit(
        state,
        makeVisitRecord({
          clientName: `Client ${i}`,
          service: 'Keratin care',
          date: '2026-09-24',
          amount: 100 + i,
          note: '',
          consent: true,
        }),
      );
    }
    expect(state.visitLog).toHaveLength(20);
    expect(state.lastVisit?.clientName).toBe('Client 24');
  });

  it('isVisitRecord accepts complete records and rejects incomplete ones', () => {
    const valid = makeVisitRecord({
      clientName: '陳美玲',
      service: 'Keratin care',
      date: '2026-09-24',
      amount: 2800,
      note: 'Fragrance-free',
      consent: true,
    });
    expect(isVisitRecord(valid)).toBe(true);
    expect(isVisitRecord({ clientName: 'x' })).toBe(false);
    expect(isVisitRecord(null)).toBe(false);
    expect(isVisitRecord('not-an-object')).toBe(false);
  });

  it('loadPersistedState tolerates corrupt JSON', () => {
    withLocalStorage(() => {
      const fake = (globalThis as { localStorage?: MemStorage & {
        getItem: (key: string) => string | null;
        setItem: (key: string, value: string) => void;
        removeItem: (key: string) => void;
      } }).localStorage;
      fake?.setItem('ritual-beauty-crm-v3', 'not-json{{{');
      expect(loadPersistedState()).toEqual({});
    });
  });
});
