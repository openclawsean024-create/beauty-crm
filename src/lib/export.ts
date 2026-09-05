// Beauty CRM — 本地加密匯出 / 還原（FR-009 / AC-010）
//
// 對齊 SPEC：
//   - 匯出檔格式 `.beauty-crm.json`（JSON wrapper，含 schema version + magic header）
//   - 加密：AES-GCM 256，key 由 PBKDF2 (SHA-256, 200k iter) 從 passphrase 衍生
//   - 檔案結構：明文 header（magic/version/iv/salt/ciphertext），
//               攻擊者不需知道 passphrase 就能判斷格式（給未來相容性用）
//
// 純瀏覽器依賴 Web Crypto API；node 環境（vitest）預設 globalThis.crypto.subtle
// 在 Node 20+ 已可用（Web Crypto），不需 polyfill。
//
// 「保留原檔不出裝置」的對齊：匯出呼叫端可選擇把 Blob 寫到 localStorage / 下載，
// 但此模組本身不接觸 localStorage 或 network。

import type { Customer } from './customers';
import type { Treatment } from './treatments';

export const EXPORT_MAGIC = 'BEAUTY-CRM-EXPORT-V1';
export const EXPORT_SCHEMA_VERSION = 1;
export const EXPORT_KDF_ITERATIONS = 200_000;
export const EXPORT_FILE_EXTENSION = '.beauty-crm.json';

export interface ExportPayload {
  customers: Customer[];
  treatments: Treatment[];
  exportedAt: string;
  designerId?: string;
}

/**
 * 加密檔 header（明文 JSON，base64 編碼 iv/salt/ciphertext）。
 * - magic: 識別字串，方便未來相容性判斷
 * - schemaVersion: 匯出 schema 版本（v1 = 現在）
 * - kdf: key derivation 參數（PBKDF2 SHA-256, iterations）
 * - iv: AES-GCM IV（12 bytes，base64）
 * - salt: PBKDF2 salt（16 bytes，base64）
 * - ciphertext: AES-GCM 輸出（含 auth tag，base64）
 */
export interface EncryptedExport {
  magic: typeof EXPORT_MAGIC;
  schemaVersion: number;
  kdf: {
    name: 'PBKDF2';
    hash: 'SHA-256';
    iterations: number;
  };
  iv: string; // base64
  salt: string; // base64
  ciphertext: string; // base64
}

export class InvalidPassphraseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPassphraseError';
  }
}

export class ExportFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExportFormatError';
  }
}

export interface ExportOptions {
  /** 預設 200_000；測試可調低以加速 */
  iterations?: number;
  /** 預設 AES-GCM 256 */
  keyLength?: 128 | 256;
}

export interface DecryptOptions {
  /** 測試注入：可換成不同 iteration 數 */
  iterations?: number;
}

// 純函數
export function generateSalt(byteLength: number = 16): Uint8Array {
  const salt = new Uint8Array(byteLength);
  crypto.getRandomValues(salt);
  return salt;
}

export function generateIv(byteLength: number = 12): Uint8Array {
  const iv = new Uint8Array(byteLength);
  crypto.getRandomValues(iv);
  return iv;
}

function toBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  // btoa 在 Node 20+ 與瀏覽器都可用
  return btoa(bin);
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function importPassphraseKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number,
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      // TS 5.6 + strict lib.dom.d.ts 把 BufferSource 收成 ArrayBufferView<ArrayBuffer>
      // 我們用的是 getRandomValues 產生的 Uint8Array（buffer 為 ArrayBuffer），
      // 這裡用型別斷言避免 SharedArrayBuffer 型別干擾。
      salt: salt as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * 將任意 JSON 資料用 passphrase 加密，回傳可序列化到 .beauty-crm.json 的物件。
 * 純函數：傳同樣的 data + passphrase 應回傳不同 iv/salt/ciphertext（因為隨機 IV/salt）。
 */
export async function encryptToExport(
  data: ExportPayload,
  passphrase: string,
  opts: ExportOptions = {},
): Promise<EncryptedExport> {
  if (!passphrase || passphrase.length === 0) {
    throw new Error('exportEncrypted: passphrase required');
  }
  const iterations = opts.iterations ?? EXPORT_KDF_ITERATIONS;
  const salt = generateSalt(16);
  const iv = generateIv(12);
  const key = await importPassphraseKey(passphrase, salt, iterations);
  const enc = new TextEncoder();
  const plaintext = enc.encode(JSON.stringify(data));
  const cipherBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    plaintext,
  );
  return {
    magic: EXPORT_MAGIC,
    schemaVersion: EXPORT_SCHEMA_VERSION,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations },
    iv: toBase64(iv),
    salt: toBase64(salt),
    ciphertext: toBase64(new Uint8Array(cipherBuf)),
  };
}

/**
 * 將加密後物件包成 Blob（用於觸發瀏覽器下載或寫入 localStorage）。
 * 呼叫端可決定怎麼處理 Blob；此函式不接觸 DOM。
 */
export async function exportEncrypted(
  data: ExportPayload,
  passphrase: string,
  opts: ExportOptions = {},
): Promise<Blob> {
  const enc = await encryptToExport(data, passphrase, opts);
  const json = JSON.stringify(enc, null, 2);
  return new Blob([json], { type: 'application/json' });
}

/**
 * 從 Blob / JSON 還原資料。passphrase 錯誤時 throw InvalidPassphraseError。
 *
 * 注意：AES-GCM 的錯誤無法精準區分「格式錯」或「passphrase 錯」（都會 throw
 * OperationError），所以我們統一包成 InvalidPassphraseError 給 UI 友善提示。
 */
export async function decryptEncrypted(
  blobOrObj: Blob | EncryptedExport | string,
  passphrase: string,
  opts: DecryptOptions = {},
): Promise<ExportPayload> {
  let parsed: EncryptedExport;
  if (typeof blobOrObj === 'string') {
    parsed = JSON.parse(blobOrObj);
  } else if (blobOrObj instanceof Blob) {
    const text = await blobOrObj.text();
    parsed = JSON.parse(text);
  } else {
    parsed = blobOrObj;
  }
  if (!parsed || parsed.magic !== EXPORT_MAGIC) {
    throw new ExportFormatError(
      `decryptEncrypted: invalid magic header (got ${parsed?.magic ?? 'undefined'})`,
    );
  }
  if (parsed.schemaVersion !== EXPORT_SCHEMA_VERSION) {
    throw new ExportFormatError(
      `decryptEncrypted: unsupported schema version ${parsed.schemaVersion} (expected ${EXPORT_SCHEMA_VERSION})`,
    );
  }
  const iterations = opts.iterations ?? parsed.kdf.iterations;
  const salt = fromBase64(parsed.salt);
  const iv = fromBase64(parsed.iv);
  const ciphertext = fromBase64(parsed.ciphertext);
  const key = await importPassphraseKey(passphrase, salt, iterations);
  try {
    const plainBuf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      ciphertext as BufferSource,
    );
    const dec = new TextDecoder();
    return JSON.parse(dec.decode(plainBuf));
  } catch (err) {
    // AES-GCM 對錯誤 passphrase / 竄改 ciphertext 都會 throw OperationError
    throw new InvalidPassphraseError(
      `decryptEncrypted: failed to decrypt — passphrase incorrect or file corrupted (${(err as Error).message})`,
    );
  }
}
