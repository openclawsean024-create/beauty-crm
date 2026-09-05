// Beauty CRM — 照片壓縮（FR-007 / AC-005）
// 純瀏覽器 Canvas 壓縮，無 server-side dependency。
//
// 對齊 AC-005：
//   - 5MB 照片 → 透過 canvas.toBlob 迭代 quality 壓到 < 500KB
//   - 保留原檔 reference 在 result.originalBlob（純前端，呼叫端自行決定存哪；
//     預期不上傳任何後端 = 「保留原檔不出裝置」）
//
// 對齊 FR-007：
//   - 不引入 heavyweight dependency（無 sharp / jimp / wasm）
//   - 環境不可用時（node / jsdom 沒 polyfill）明確 throw，呼叫端可決定 fallback

/**
 * 壓縮後照片的 reference。
 * blobUrl 由 URL.createObjectURL 產生（blob: 開頭），純本地不送後端。
 */
export interface CompressedPhotoRef {
  blobUrl: string;
  width: number;
  height: number;
  byteSize: number;
  takenAt: string; // ISO timestamp
}

export interface CompressResult {
  blob: Blob;
  byteSize: number;
  /**
   * 當原檔 > maxSizeKB 時保留原檔 reference（純客戶端，呼叫端自行決定怎麼存，
   * 預期不上傳後端 = AC-005「保留原檔不出裝置」）。
   */
  originalBlob?: Blob;
  compressedAt: string; // ISO timestamp
}

/**
 * 測試注入用：模擬 canvas.toBlob 行為。
 * 回傳 Promise<Blob | null>，對應 HTMLCanvasElement.toBlob callback 包成 Promise。
 */
export type CanvasExporter = (opts: {
  quality: number;
  mimeType: string;
}) => Promise<Blob | null>;

/**
 * 測試注入用：模擬瀏覽器圖片載入（FileReader + Image）。
 * 回傳解析後的圖片（寬高 + draw 方法）讓 exporter 對 canvas 畫圖。
 */
export type ImageLoader = () => Promise<{
  width: number;
  height: number;
  draw: (ctx: unknown) => void;
}>;

export interface CompressOptions {
  maxSizeKB?: number;
  /** 最低 quality，到這裡還沒達標就 throw */
  minQuality?: number;
  mimeType?: string;
  /** 測試注入用：模擬 canvas.toBlob；瀏覽器可省略 */
  createExporter?: (width: number, height: number) => CanvasExporter;
  /** 測試注入用：模擬瀏覽器 image 載入；瀏覽器可省略 */
  loadImage?: ImageLoader;
}

export class PhotoCompressionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PhotoCompressionError';
  }
}

const DEFAULT_MAX_SIZE_KB = 500;
const DEFAULT_MIN_QUALITY = 0.5;
const DEFAULT_MIME = 'image/jpeg';
// 由高到低：先試高 quality（品質好），達不到就降
const QUALITY_STEPS: readonly number[] = [0.92, 0.82, 0.72, 0.62, 0.52];

/**
 * 壓縮照片到 < maxSizeKB（預設 500KB）。
 *
 * 純瀏覽器環境直接呼叫 `compressPhoto(file)`，內部用 HTMLCanvasElement。
 * node / jsdom 環境必須透過 opts 注入 createExporter + loadImage 模擬 canvas，
 * 否則 throw PhotoCompressionError（避免靜默壞掉 = FR-007 「明確」同意紀錄鏈）。
 *
 * 設計：保留原檔 reference 在 result.originalBlob（純前端，呼叫端自行決定存哪）。
 */
export async function compressPhoto(
  file: Blob,
  opts: CompressOptions = {},
): Promise<CompressResult> {
  const maxSizeKB = opts.maxSizeKB ?? DEFAULT_MAX_SIZE_KB;
  const minQuality = opts.minQuality ?? DEFAULT_MIN_QUALITY;
  const mimeType = opts.mimeType ?? DEFAULT_MIME;
  const targetBytes = maxSizeKB * 1024;
  const compressedAt = new Date().toISOString();
  const originalBytes = file.size;
  const wasOverLimit = originalBytes > targetBytes;

  // Fast path：已在目標以下，不壓縮、不需要 canvas
  if (originalBytes <= targetBytes) {
    return {
      blob: file,
      byteSize: originalBytes,
      compressedAt,
    };
  }

  const createExporter = opts.createExporter;
  const loadImage = opts.loadImage;
  if (!createExporter || !loadImage) {
    throw new PhotoCompressionError(
      'compressPhoto: HTMLCanvasElement / image loader is not available in this environment ' +
        '(node / jsdom without polyfill). Pass createExporter + loadImage in opts, ' +
        'or call from a browser context.',
    );
  }

  const img = await loadImage();
  let blob: Blob | null = null;
  let lastTriedQuality: number = minQuality;

  for (const quality of QUALITY_STEPS) {
    if (quality < minQuality) break;
    lastTriedQuality = quality;
    const exporter = createExporter(img.width, img.height);
    blob = await exporter({ quality, mimeType });
    if (blob && blob.size <= targetBytes) break;
  }

  if (!blob) {
    throw new PhotoCompressionError(
      `compressPhoto: failed to compress ${originalBytes}B below ${maxSizeKB}KB ` +
        `(min quality ${minQuality}, last tried ${lastTriedQuality})`,
    );
  }

  return {
    blob,
    byteSize: blob.size,
    originalBlob: wasOverLimit ? file : undefined,
    compressedAt,
  };
}
