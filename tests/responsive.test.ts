// 測試 RWD 斷點邏輯（純函式，可獨立驗證）。
// 不引入 happy-dom — 用 stub window.innerWidth 模擬 viewport。

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getLayoutMode,
  getSheetMaxWidth,
  isSingleHandUi,
  DEFAULT_BREAKPOINTS,
  type Breakpoints,
} from '@/lib/responsive';

describe('responsive — RWD 斷點', () => {
  describe('getLayoutMode', () => {
    it('AC: width < 480 → bottom-sheet', () => {
      expect(getLayoutMode(320)).toBe('bottom-sheet');
      expect(getLayoutMode(390)).toBe('bottom-sheet');
      expect(getLayoutMode(479)).toBe('bottom-sheet');
    });

    it('AC: 480 ≤ width < 900 → bottom-sheet（tablet 仍抽屜）', () => {
      expect(getLayoutMode(480)).toBe('bottom-sheet');
      expect(getLayoutMode(768)).toBe('bottom-sheet');
      expect(getLayoutMode(899)).toBe('bottom-sheet');
    });

    it('AC: width ≥ 900 → centered-modal', () => {
      expect(getLayoutMode(900)).toBe('centered-modal');
      expect(getLayoutMode(1024)).toBe('centered-modal');
      expect(getLayoutMode(1440)).toBe('centered-modal');
    });

    it('AC: 自訂 breakpoints 生效', () => {
      const custom: Breakpoints = { mobile: 600, tablet: 1200, desktop: 1200 };
      expect(getLayoutMode(500, custom)).toBe('bottom-sheet');
      expect(getLayoutMode(700, custom)).toBe('bottom-sheet');
      expect(getLayoutMode(1300, custom)).toBe('centered-modal');
    });
  });

  describe('isSingleHandUi', () => {
    it('AC: width < mobile → 單手 UI', () => {
      expect(isSingleHandUi(320)).toBe(true);
      expect(isSingleHandUi(390)).toBe(true);
      expect(isSingleHandUi(479)).toBe(true);
    });

    it('AC: width >= mobile → 非單手', () => {
      expect(isSingleHandUi(480)).toBe(false);
      expect(isSingleHandUi(768)).toBe(false);
      expect(isSingleHandUi(1440)).toBe(false);
    });
  });

  describe('getSheetMaxWidth', () => {
    it('AC: bottom-sheet → 100% 寬', () => {
      expect(getSheetMaxWidth('bottom-sheet', 390)).toBe('100%');
      expect(getSheetMaxWidth('bottom-sheet', 1440)).toBe('100%');
    });

    it('AC: centered-modal → 固定 560px（桌機）', () => {
      expect(getSheetMaxWidth('centered-modal', 1440)).toBe(560);
    });

    it('AC: centered-modal 但 viewport 較小 → min(560, viewport-32)', () => {
      // viewport 500 → 500-32 = 468 < 560 → 468
      expect(getSheetMaxWidth('centered-modal', 500)).toBe(468);
    });
  });

  describe('DEFAULT_BREAKPOINTS', () => {
    it('AC: 預設 breakpoints 對齊 SPEC DoD-6（mobile 390 / tablet 768 / desktop 1440）', () => {
      expect(DEFAULT_BREAKPOINTS.mobile).toBe(480);
      expect(DEFAULT_BREAKPOINTS.tablet).toBe(900);
      // 三個 SPEC 關鍵 viewport 的 layout：
      expect(getLayoutMode(390)).toBe('bottom-sheet'); // mobile
      expect(getLayoutMode(768)).toBe('bottom-sheet'); // tablet
      expect(getLayoutMode(1440)).toBe('centered-modal'); // desktop
    });
  });
});
