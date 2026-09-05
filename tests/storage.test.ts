// 測試 src/lib/storage.ts（v0.4.0 新增 localStorage typed wrapper）
// 對齊 DESIGN §6.4 / §6.7
//
// vitest 環境：node（預設有 localStorage 嗎？）
// → happy-dom 預設有；node 環境沒有。
// 我們用 stub localStorage 來測，不依賴全域 localStorage。

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isClient, load, save, clear, clearAll, StorageKeys, PREFIX_FOR_TEST } from '@/lib/storage';

// 為了測試 PREFIX，我們 export 一個測試 hook。
// 這裡直接 import storage 並用 spy 確認 key 有 prefix。
// 但 storage.ts 沒 export PREFIX（避免外部覆蓋），所以測試中改用 spyOn。

// 由於 storage.ts 用 const PREFIX = 'beauty-crm:v1:'，我們在測試中
// 透過 spyOn setItem / getItem 確認前綴。

describe('storage — localStorage typed wrapper', () => {
  // 用 stub localStorage 替換 window.localStorage
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    // 確保 isClient() 為 true（模擬瀏覽器環境）
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (k: string) => (k in store ? store[k]! : null),
        setItem: (k: string, v: string) => {
          store[k] = v;
        },
        removeItem: (k: string) => {
          delete store[k];
        },
        clear: () => {
          store = {};
        },
        key: (i: number) => Object.keys(store)[i] ?? null,
        get length() {
          return Object.keys(store).length;
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('isClient', () => {
    it('AC: 瀏覽器環境回傳 true', () => {
      expect(isClient()).toBe(true);
    });

    it('AC: SSR 環境回傳 false', async () => {
      vi.unstubAllGlobals();
      vi.stubGlobal('window', undefined);
      expect(isClient()).toBe(false);
    });
  });

  describe('load / save', () => {
    it('AC: 缺值時回傳 fallback', () => {
      const result = load<{ x: number }>('missing', { x: 0 });
      expect(result).toEqual({ x: 0 });
    });

    it('AC: save 後 load 取得原值', () => {
      save('key1', { name: '雅婷', count: 42 });
      const result = load<{ name: string; count: number }>('key1', { name: '', count: 0 });
      expect(result).toEqual({ name: '雅婷', count: 42 });
    });

    it('AC: 自動加 PREFIX prefix', () => {
      save('customers', [{ id: 'c1' }]);
      const allKeys = Object.keys(store);
      expect(allKeys).toHaveLength(1);
      expect(allKeys[0]).toBe('beauty-crm:v1:customers');
    });

    it('AC: JSON 損壞時回傳 fallback（不 throw）', () => {
      // 直接放壞 JSON
      store['beauty-crm:v1:broken'] = '{not valid json';
      const result = load('broken', { fallback: true });
      expect(result).toEqual({ fallback: true });
    });

    it('AC: 支援原始型別（string / number）', () => {
      save('s', 'hello');
      save('n', 123);
      expect(load<string>('s', '')).toBe('hello');
      expect(load<number>('n', 0)).toBe(123);
    });

    it('AC: 支援 array', () => {
      save('arr', [1, 2, 3, 4, 5]);
      expect(load<number[]>('arr', [])).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('SSR safety', () => {
    it('AC: SSR 環境下 load 回傳 fallback（不 throw）', () => {
      vi.unstubAllGlobals();
      vi.stubGlobal('window', undefined);
      const result = load('x', { ok: true });
      expect(result).toEqual({ ok: true });
    });

    it('AC: SSR 環境下 save 不 throw（silent）', () => {
      vi.unstubAllGlobals();
      vi.stubGlobal('window', undefined);
      expect(() => save('x', { y: 1 })).not.toThrow();
    });
  });

  describe('clear / clearAll', () => {
    it('AC: clear 移除單一 key', () => {
      save('k1', 1);
      save('k2', 2);
      clear('k1');
      expect(load('k1', -1)).toBe(-1);
      expect(load('k2', -1)).toBe(2);
    });

    it('AC: clearAll 移除所有 PREFIX 開頭的 key，但保留其他 namespace', () => {
      save('mine', 1);
      store['other:key'] = 'x';
      clearAll();
      expect(Object.keys(store)).toEqual(['other:key']);
    });
  });

  describe('StorageKeys', () => {
    it('AC: 7 個 key 常數齊全', () => {
      expect(StorageKeys.customers).toBe('customers');
      expect(StorageKeys.treatments).toBe('treatments');
      expect(StorageKeys.contactLogs).toBe('contactLogs');
      expect(StorageKeys.apptLogs).toBe('apptLogs');
      expect(StorageKeys.approvedTargets).toBe('approvedTargets');
      expect(StorageKeys.reminderOverrides).toBe('reminderOverrides');
      expect(StorageKeys.deviceShared).toBe('device.shared');
    });
  });

  describe('quota / 邊界情境', () => {
    it('AC: setItem 拋例外時 save silent fail（不 crash UI）', () => {
      vi.unstubAllGlobals();
      vi.stubGlobal('window', {
        localStorage: {
          getItem: () => null,
          setItem: () => {
            throw new Error('QuotaExceeded');
          },
          removeItem: () => {},
          key: () => null,
          get length() {
            return 0;
          },
        },
      });
      // spy console.warn 確認有 warning 但不 throw
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      expect(() => save('x', 1)).not.toThrow();
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });
});

// 防止 lint 警告 PREFIX_FOR_TEST 未使用（保留 export 給未來 debug）
void PREFIX_FOR_TEST;
