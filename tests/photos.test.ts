import { describe, it, expect } from 'vitest';
import { compressPhoto, PhotoCompressionError } from '@/lib/photos';
import { setPhotoConsent, createCustomer } from '@/lib/customers';
import { addPhoto, recordTreatment } from '@/lib/treatments';

// 測試注入用：模擬 canvas.toBlob 行為
function makeMockExporter(sizeAt: (q: number) => number) {
  return (_width: number, _height: number) =>
    async (opts: { quality: number; mimeType: string }): Promise<Blob | null> => {
      const size = sizeAt(opts.quality);
      return new Blob([new Uint8Array(size)], { type: opts.mimeType });
    };
}

// 測試注入用：模擬瀏覽器 image 載入
function makeMockLoader(width = 1920, height = 1080) {
  return async () => ({
    width,
    height,
    draw: () => {
      // 真實情境下會把 ImageBitmap 畫到 canvas context；測試不需要
    },
  });
}

const FIVE_MB = 5 * 1024 * 1024;

describe('photos — FR-007 / AC-005 照片壓縮 + 同意紀錄', () => {
  it('AC-005: 5MB Blob 透過 canvas 壓縮到 < 500KB，保留原檔 reference', async () => {
    const fiveMB = new Blob([new Uint8Array(FIVE_MB)], { type: 'image/jpeg' });
    // 模擬 quality 0.92 直接壓到 400KB（< 500KB target → 成功）
    const result = await compressPhoto(fiveMB, {
      createExporter: makeMockExporter((q) => (q === 0.92 ? 400 * 1024 : 900 * 1024)),
      loadImage: makeMockLoader(),
    });
    expect(result.byteSize).toBeLessThan(500 * 1024);
    expect(result.byteSize).toBe(400 * 1024);
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.originalBlob).toBeDefined();
    expect(result.originalBlob).toBe(fiveMB); // 保留原檔 reference（AC-005）
    expect(result.compressedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('AC-005: 5MB 多次迭代 — 第一次未達標，第二次達標', async () => {
    const fiveMB = new Blob([new Uint8Array(FIVE_MB)], { type: 'image/jpeg' });
    const result = await compressPhoto(fiveMB, {
      // 0.92 → 600KB（未達標），0.82 → 450KB（達標）
      createExporter: makeMockExporter((q) => {
        if (q === 0.92) return 600 * 1024;
        if (q === 0.82) return 450 * 1024;
        return 800 * 1024;
      }),
      loadImage: makeMockLoader(),
    });
    expect(result.byteSize).toBe(450 * 1024);
    expect(result.byteSize).toBeLessThan(500 * 1024);
  });

  it('AC: 已是 100KB 不壓縮，直接回傳原檔且不需要 canvas', async () => {
    const small = new Blob([new Uint8Array(100 * 1024)], { type: 'image/jpeg' });
    // 故意不傳 createExporter / loadImage — fast path 不需要 canvas
    const result = await compressPhoto(small, { maxSizeKB: 500 });
    expect(result.byteSize).toBe(100 * 1024);
    expect(result.blob).toBe(small);
    expect(result.originalBlob).toBeUndefined(); // 未超過限制 → 不保留原檔
  });

  it('AC: 無 canvas 環境（未注入 createExporter / loadImage）→ throw PhotoCompressionError 明確訊息', async () => {
    const fiveMB = new Blob([new Uint8Array(FIVE_MB)], { type: 'image/jpeg' });
    await expect(compressPhoto(fiveMB)).rejects.toThrow(PhotoCompressionError);
    await expect(compressPhoto(fiveMB)).rejects.toThrow(/HTMLCanvasElement/);
    await expect(compressPhoto(fiveMB)).rejects.toThrow(/node \/ jsdom/);
  });

  it('AC: addPhoto 不可變 — 原 treatment.photos 為 []，回傳新 treatment 含新 photo', () => {
    const t = recordTreatment({
      id: 't1',
      customerId: 'c1',
      category: 'manicure',
      serviceName: '凝膠美甲',
      price: 1200,
      durationMin: 90,
      performedAt: '2026-07-01T10:00:00.000Z',
    });
    expect(t.photos).toEqual([]);
    const photo = {
      blobUrl: 'blob:abc-123',
      width: 800,
      height: 600,
      byteSize: 320_000,
      takenAt: '2026-07-01T10:30:00.000Z',
    };
    const updated = addPhoto(t, photo);
    // 不可變：原物件未變
    expect(updated).not.toBe(t);
    expect(t.photos).toEqual([]);
    // 新物件含 photo
    expect(updated.photos).toHaveLength(1);
    expect(updated.photos[0]).toEqual(photo);
  });

  it('AC: addPhoto 可連續加入多張（before / after）', () => {
    const t = recordTreatment({
      id: 't1',
      customerId: 'c1',
      category: 'eyelash',
      serviceName: '美睫嫁接',
      price: 1500,
      durationMin: 60,
      performedAt: '2026-07-01T10:00:00.000Z',
    });
    const before = {
      blobUrl: 'blob:before',
      width: 100,
      height: 100,
      byteSize: 50_000,
      takenAt: '2026-07-01T10:00:00.000Z',
    };
    const after = {
      blobUrl: 'blob:after',
      width: 100,
      height: 100,
      byteSize: 55_000,
      takenAt: '2026-07-01T11:30:00.000Z',
    };
    const t2 = addPhoto(t, before);
    const t3 = addPhoto(t2, after);
    expect(t.photos).toEqual([]);
    expect(t2.photos).toEqual([before]);
    expect(t3.photos).toEqual([before, after]);
  });

  it('AC: setPhotoConsent 切換 granted / revoked（不可變）', () => {
    const c = createCustomer({ id: 'c1', name: '雅婷', phone: '0912345678' });
    expect(c.photoConsent).toBeUndefined();
    // 1. grant
    const granted = setPhotoConsent(c, {
      grantedAt: '2026-07-01T00:00:00.000Z',
      scope: 'before-after',
    });
    expect(granted.photoConsent).toBeDefined();
    expect(granted.photoConsent?.grantedAt).toBe('2026-07-01T00:00:00.000Z');
    expect(granted.photoConsent?.scope).toBe('before-after');
    expect(granted.photoConsent?.revokedAt).toBeUndefined();
    // 2. revoke (傳 null) — 在原 consent 上加 revokedAt
    const revoked = setPhotoConsent(granted, null);
    expect(revoked.photoConsent?.revokedAt).toBeDefined();
    expect(revoked.photoConsent?.scope).toBe('before-after'); // scope 保留
    // 不可變
    expect(granted.photoConsent?.revokedAt).toBeUndefined();
    expect(c.photoConsent).toBeUndefined();
  });

  it('AC: setPhotoConsent 傳入新 consent = 重新 grant（覆蓋 revokedAt）', () => {
    const c = createCustomer({ id: 'c1', name: '雅婷', phone: '0912345678' });
    const granted = setPhotoConsent(c, {
      grantedAt: '2026-07-01T00:00:00.000Z',
      scope: 'before-after',
    });
    const revoked = setPhotoConsent(granted, null);
    // 重新 grant
    const regranted = setPhotoConsent(revoked, {
      grantedAt: '2026-08-01T00:00:00.000Z',
      scope: 'all',
    });
    expect(regranted.photoConsent?.revokedAt).toBeUndefined();
    expect(regranted.photoConsent?.grantedAt).toBe('2026-08-01T00:00:00.000Z');
    expect(regranted.photoConsent?.scope).toBe('all');
  });
});
