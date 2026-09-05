import { describe, it, expect } from 'vitest';
import {
  exportEncrypted,
  decryptEncrypted,
  encryptToExport,
  generateIv,
  generateSalt,
  EXPORT_MAGIC,
  EXPORT_SCHEMA_VERSION,
  EXPORT_FILE_EXTENSION,
  InvalidPassphraseError,
  ExportFormatError,
  type ExportPayload,
} from '@/lib/export';
import { createCustomer } from '@/lib/customers';
import { recordTreatment } from '@/lib/treatments';

const PASSPHRASE = 'test-passphrase-1234';

function mkPayload(): ExportPayload {
  return {
    customers: [
      createCustomer({ id: 'c1', name: '雅婷', phone: '0911111111', consent: 'granted' }),
      createCustomer({ id: 'c2', name: '小美', phone: '0922222222' }),
    ],
    treatments: [
      recordTreatment({
        id: 't1', customerId: 'c1', category: 'manicure', serviceName: '凝膠美甲',
        price: 1200, durationMin: 90, performedAt: '2026-07-01T10:00:00Z',
      }),
    ],
    exportedAt: '2026-07-19T00:00:00.000Z',
    designerId: 'designer-A',
  };
}

describe('export — FR-009 / AC-010 本地加密匯出 + 還原', () => {
  it('AC-010: encryptToExport 回傳的物件含 magic + schemaVersion + iv + salt + ciphertext', async () => {
    const enc = await encryptToExport(mkPayload(), PASSPHRASE);
    expect(enc.magic).toBe(EXPORT_MAGIC);
    expect(enc.schemaVersion).toBe(EXPORT_SCHEMA_VERSION);
    expect(enc.kdf.name).toBe('PBKDF2');
    expect(enc.kdf.hash).toBe('SHA-256');
    expect(typeof enc.kdf.iterations).toBe('number');
    expect(enc.iv.length).toBeGreaterThan(0);
    expect(enc.salt.length).toBeGreaterThan(0);
    expect(enc.ciphertext.length).toBeGreaterThan(0);
  });

  it('AC-010: 匯出 + 還原 round-trip 資料一致', async () => {
    const original = mkPayload();
    const blob = await exportEncrypted(original, PASSPHRASE);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/json');

    const restored = await decryptEncrypted(blob, PASSPHRASE);
    expect(restored.customers).toEqual(original.customers);
    expect(restored.treatments).toEqual(original.treatments);
    expect(restored.exportedAt).toBe(original.exportedAt);
    expect(restored.designerId).toBe(original.designerId);
  });

  it('AC-010: passphrase 錯誤 → throw InvalidPassphraseError', async () => {
    const blob = await exportEncrypted(mkPayload(), PASSPHRASE);
    await expect(decryptEncrypted(blob, 'wrong-passphrase-9999')).rejects.toThrow(InvalidPassphraseError);
    await expect(decryptEncrypted(blob, 'wrong-passphrase-9999')).rejects.toThrow(/passphrase/);
  });

  it('AC-010: 空資料 payload 仍 valid（schema header 仍正確）', async () => {
    const empty: ExportPayload = { customers: [], treatments: [], exportedAt: '2026-07-19T00:00:00.000Z' };
    const blob = await exportEncrypted(empty, PASSPHRASE);
    const restored = await decryptEncrypted(blob, PASSPHRASE);
    expect(restored.customers).toEqual([]);
    expect(restored.treatments).toEqual([]);
    expect(restored.exportedAt).toBe('2026-07-19T00:00:00.000Z');
  });

  it('AC-010: 缺 passphrase → throw', async () => {
    await expect(exportEncrypted(mkPayload(), '')).rejects.toThrow(/passphrase/);
  });

  it('AC-010: 竄改 ciphertext → 還原 throw InvalidPassphraseError', async () => {
    const enc = await encryptToExport(mkPayload(), PASSPHRASE);
    // 翻轉 ciphertext 的第一個字元（AES-GCM 認證會立刻 fail）
    const tampered = {
      ...enc,
      ciphertext: enc.ciphertext.slice(0, -1) + (enc.ciphertext.slice(-1) === 'A' ? 'B' : 'A'),
    };
    await expect(decryptEncrypted(tampered, PASSPHRASE)).rejects.toThrow(InvalidPassphraseError);
  });

  it('AC-010: magic header 錯誤 → throw ExportFormatError', async () => {
    const enc = await encryptToExport(mkPayload(), PASSPHRASE);
    const bad = { ...enc, magic: 'WRONG-MAGIC' as typeof EXPORT_MAGIC };
    await expect(decryptEncrypted(bad, PASSPHRASE)).rejects.toThrow(ExportFormatError);
    await expect(decryptEncrypted(bad, PASSPHRASE)).rejects.toThrow(/magic/);
  });

  it('AC-010: schema version 不相容 → throw ExportFormatError', async () => {
    const enc = await encryptToExport(mkPayload(), PASSPHRASE);
    const bad = { ...enc, schemaVersion: 99 };
    await expect(decryptEncrypted(bad, PASSPHRASE)).rejects.toThrow(ExportFormatError);
    await expect(decryptEncrypted(bad, PASSPHRASE)).rejects.toThrow(/schema version/);
  });

  it('AC: 純函式 generateSalt / generateIv 每次回傳不同值', () => {
    const a = generateSalt();
    const b = generateSalt();
    expect(a).not.toEqual(b);
    expect(a.byteLength).toBe(16);
    const c = generateIv();
    const d = generateIv();
    expect(c).not.toEqual(d);
    expect(c.byteLength).toBe(12);
  });

  it('AC: 同樣的 data 兩次加密 → iv/salt/ciphertext 都不同（隨機 IV 保證）', async () => {
    const payload = mkPayload();
    const a = await encryptToExport(payload, PASSPHRASE);
    const b = await encryptToExport(payload, PASSPHRASE);
    expect(a.iv).not.toBe(b.iv);
    expect(a.salt).not.toBe(b.salt);
    expect(a.ciphertext).not.toBe(b.ciphertext);
    // 兩者都還原回同樣的 payload
    const ra = await decryptEncrypted(a, PASSPHRASE);
    const rb = await decryptEncrypted(b, PASSPHRASE);
    expect(ra).toEqual(rb);
  });

  it('AC: EXPORT_FILE_EXTENSION 是 .beauty-crm.json', () => {
    expect(EXPORT_FILE_EXTENSION).toBe('.beauty-crm.json');
  });
});
