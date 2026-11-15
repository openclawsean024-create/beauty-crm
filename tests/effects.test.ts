// AC-001：Before/After 效果紀錄與膚況改善計算 — 併自 concierge EffectRecord（FR-007）
import { describe, it, expect } from 'vitest';
import {
  EffectError,
  computeImprovement,
  createEffectRecord,
  effectsByCustomer,
  isPlaceholderImage,
  radarAxes,
  skinScore,
  summarizeEffects,
  type SkinMetrics,
} from '@/lib/effects';

const before: SkinMetrics = { hydration: 42, pores: 68, evenness: 55, smoothness: 50 };
const after: SkinMetrics = { hydration: 70, pores: 48, evenness: 66, smoothness: 71 };

function record(id: string, date: string, type: 'before' | 'after', metrics?: SkinMetrics, customerId = 'c1') {
  return createEffectRecord(
    { id, customerId, date, type, sessionLabel: type === 'before' ? '服務前' : '第 1 次服務後', metrics },
    'granted',
  );
}

describe('AC-001 effects — Before/After 與膚況改善計算', () => {
  it('AC-001: 綜合分數把毛孔明顯度反向計分', () => {
    expect(skinScore(before)).toBe(Math.round((42 + 50 + 55 + (100 - 68)) / 4));
    expect(skinScore({ hydration: 100, pores: 0, evenness: 100, smoothness: 100 })).toBe(100);
    expect(skinScore({ hydration: 0, pores: 100, evenness: 0, smoothness: 0 })).toBe(0);
  });

  it('AC-001: 改善幅度為正（各項換算成正數 = 改善，毛孔下降算改善）', () => {
    const improvement = computeImprovement(before, after);
    expect(improvement.hydration).toBe(28);
    expect(improvement.pores).toBe(20);
    expect(improvement.evenness).toBe(11);
    expect(improvement.smoothness).toBe(21);
    expect(improvement.overall).toBe(20);
    expect(improvement.overall).toBe(skinScore(after) - skinScore(before));
  });

  it('AC-001: 改善幅度為負（退步時回報負數，不美化）', () => {
    const worse = computeImprovement(after, before);
    expect(worse.overall).toBe(-20);
    expect(worse.hydration).toBe(-28);
    expect(worse.pores).toBe(-20);
    const same = computeImprovement(before, before);
    expect(same).toEqual({ overall: 0, hydration: 0, pores: 0, evenness: 0, smoothness: 0 });
  });

  it('AC-001: 未取得敏感個資同意時不可建立效果紀錄', () => {
    for (const consent of ['pending', 'revoked', undefined] as const) {
      try {
        createEffectRecord(
          { id: 'e1', customerId: 'c1', date: '2026-10-01', type: 'before', sessionLabel: '服務前' },
          consent,
        );
        throw new Error('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(EffectError);
        expect((err as EffectError).code).toBe('SENSITIVE_CONSENT_REQUIRED');
      }
    }
  });

  it('AC-001: 照片只接受本機示意圖代號，遠端網址被拒', () => {
    expect(record('e1', '2026-10-01', 'before').imageRef).toBe('placeholder:before');
    expect(isPlaceholderImage('placeholder:after')).toBe(true);
    expect(isPlaceholderImage('https://images.example.com/face.jpg')).toBe(false);
    try {
      createEffectRecord(
        {
          id: 'e2',
          customerId: 'c1',
          date: '2026-10-01',
          type: 'after',
          sessionLabel: '第 1 次服務後',
          imageRef: 'https://images.example.com/face.jpg',
        },
        'granted',
      );
      throw new Error('should have thrown');
    } catch (err) {
      expect((err as EffectError).code).toBe('REMOTE_IMAGE_NOT_ALLOWED');
    }
  });

  it('AC-001: 指標必須在 0–100', () => {
    expect(() => record('e1', '2026-10-01', 'before', { ...before, hydration: 101 })).toThrow(EffectError);
    expect(() => record('e1', '2026-10-01', 'before', { ...before, pores: -1 })).toThrow(EffectError);
  });

  it('AC-001: 客戶摘要取首筆與最新一筆有指標的紀錄計算改善幅度', () => {
    const records = [
      record('e3', '2026-11-10', 'after', after),
      record('e1', '2026-09-01', 'before', before),
      record('e2', '2026-10-01', 'after', { hydration: 55, pores: 60, evenness: 60, smoothness: 60 }),
      record('e9', '2026-10-15', 'after', after, 'c2'),
    ];
    expect(effectsByCustomer(records, 'c1').map((r) => r.id)).toEqual(['e1', 'e2', 'e3']);
    const summary = summarizeEffects(records, 'c1');
    expect(summary?.count).toBe(3);
    expect(summary?.first.id).toBe('e1');
    expect(summary?.latest.id).toBe('e3');
    expect(summary?.improvement?.overall).toBe(20);
  });

  it('AC-001: 沒有紀錄或只有一筆指標時不計算改善幅度', () => {
    expect(summarizeEffects([], 'c1')).toBeUndefined();
    const single = summarizeEffects([record('e1', '2026-09-01', 'before', before)], 'c1');
    expect(single?.count).toBe(1);
    expect(single?.improvement).toBeUndefined();
    const noMetrics = summarizeEffects([record('e1', '2026-09-01', 'before'), record('e2', '2026-10-01', 'after')], 'c1');
    expect(noMetrics?.improvement).toBeUndefined();
  });

  it('AC-001: 雷達圖四軸座標（正上方起順時針，毛孔反向）', () => {
    const axes = radarAxes({ hydration: 100, pores: 0, evenness: 50, smoothness: 0 }, 100, 100, 80);
    expect(axes.map((a) => a.key)).toEqual(['hydration', 'pores', 'evenness', 'smoothness']);
    expect(axes[0]).toMatchObject({ value: 100, x: 100, y: 20 });
    expect(axes[1]).toMatchObject({ value: 100, x: 180, y: 100 });
    expect(axes[2]).toMatchObject({ value: 50, x: 100, y: 140 });
    expect(axes[3]).toMatchObject({ value: 0, x: 100, y: 100 });
  });
});
