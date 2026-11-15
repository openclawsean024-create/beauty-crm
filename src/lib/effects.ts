// Beauty CRM — Before/After 效果紀錄
// 併自 beauty-crm-concierge `data/mock.ts` 的 EffectRecord 模型，與
// `app/effect-records/page.tsx` 的比對、改善幅度計算、雷達圖座標（SPEC §10.1 #3，FR-007）。
//
// 規則：
// - S 級敏感資料：必須先取得「敏感個資同意」才可建立（FR-012）。
// - 照片只允許本機示意圖（placeholder:*），不接受遠端網址或真人照片。
// - 指標變化只是店內紀錄，不是醫療或療效宣稱；UI 不得對外宣稱效果。

import type { ConsentStatus } from './customers';
import { isDateOnly } from './dates';

/** 4 項膚況指標，皆為 0–100。pores 為「毛孔明顯度」，數值越低越好；其餘越高越好。 */
export interface SkinMetrics {
  hydration: number; // 保水度
  pores: number; // 毛孔明顯度（越低越好）
  evenness: number; // 膚色均勻度
  smoothness: number; // 光滑度
}

export type EffectRecordType = 'before' | 'after';

/** 本機示意圖代號；由 UI 以內嵌 SVG 繪製，不載入任何圖片檔或遠端資源。 */
export type EffectImageRef = `placeholder:${string}`;

export interface EffectRecord {
  id: string;
  customerId: string;
  date: string; // YYYY-MM-DD
  type: EffectRecordType;
  sessionLabel: string; // 例：「服務前」「第 1 次服務後」
  imageRef: EffectImageRef;
  notes?: string;
  metrics?: SkinMetrics;
}

export type EffectErrorCode = 'SENSITIVE_CONSENT_REQUIRED' | 'REMOTE_IMAGE_NOT_ALLOWED' | 'INVALID_METRICS';

export class EffectError extends Error {
  constructor(public readonly code: EffectErrorCode) {
    super(code);
    this.name = 'EffectError';
  }
}

const METRIC_KEYS: Array<keyof SkinMetrics> = ['hydration', 'pores', 'evenness', 'smoothness'];

export function isValidMetrics(metrics: SkinMetrics): boolean {
  return METRIC_KEYS.every((key) => {
    const value = metrics[key];
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
  });
}

export function isPlaceholderImage(ref: string): ref is EffectImageRef {
  return /^placeholder:[a-z0-9-]+$/.test(ref);
}

export function createEffectRecord(
  input: {
    id: string;
    customerId: string;
    date: string;
    type: EffectRecordType;
    sessionLabel: string;
    imageRef?: string;
    notes?: string;
    metrics?: SkinMetrics;
  },
  sensitiveDataConsent: ConsentStatus | undefined,
): EffectRecord {
  if (sensitiveDataConsent !== 'granted') throw new EffectError('SENSITIVE_CONSENT_REQUIRED');
  if (!input.id?.trim()) throw new Error('effect record id required');
  if (!input.customerId) throw new Error('customerId required');
  if (!isDateOnly(input.date)) throw new Error('date must be YYYY-MM-DD');
  if (!input.sessionLabel?.trim()) throw new Error('sessionLabel required');
  const imageRef = input.imageRef ?? `placeholder:${input.type}`;
  if (!isPlaceholderImage(imageRef)) throw new EffectError('REMOTE_IMAGE_NOT_ALLOWED');
  if (input.metrics && !isValidMetrics(input.metrics)) throw new EffectError('INVALID_METRICS');
  return {
    id: input.id.trim(),
    customerId: input.customerId,
    date: input.date,
    type: input.type,
    sessionLabel: input.sessionLabel.trim(),
    imageRef,
    notes: input.notes?.trim() || undefined,
    metrics: input.metrics ? { ...input.metrics } : undefined,
  };
}

/** 指定客戶的效果紀錄，日期由舊到新。 */
export function effectsByCustomer(records: EffectRecord[], customerId: string): EffectRecord[] {
  return records
    .filter((r) => r.customerId === customerId)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

/** 單次紀錄的綜合分數 0–100：毛孔明顯度反向計分後取四項平均。 */
export function skinScore(metrics: SkinMetrics): number {
  return Math.round(
    (metrics.hydration + metrics.smoothness + metrics.evenness + (100 - metrics.pores)) / 4,
  );
}

export interface SkinImprovement {
  /** 綜合分數變化；正數 = 改善、負數 = 退步 */
  overall: number;
  hydration: number;
  /** 毛孔明顯度下降幅度；正數 = 改善（數值下降） */
  pores: number;
  evenness: number;
  smoothness: number;
}

/**
 * 改善幅度（latest 相對 first）。每一項都換算成「正數 = 改善」：
 * pores 越低越好，所以用 first - latest。
 */
export function computeImprovement(first: SkinMetrics, latest: SkinMetrics): SkinImprovement {
  const round = (n: number) => Math.round(n * 10) / 10;
  const hydration = latest.hydration - first.hydration;
  const pores = first.pores - latest.pores;
  const evenness = latest.evenness - first.evenness;
  const smoothness = latest.smoothness - first.smoothness;
  return {
    overall: Math.round((hydration + pores + evenness + smoothness) / 4),
    hydration: round(hydration),
    pores: round(pores),
    evenness: round(evenness),
    smoothness: round(smoothness),
  };
}

export interface EffectSummary {
  count: number;
  first: EffectRecord;
  latest: EffectRecord;
  /** 首筆與最新一筆都有指標時才有值 */
  improvement: SkinImprovement | undefined;
}

/** 客戶記憶面板用的 Before/After 摘要。沒有紀錄時回傳 undefined。 */
export function summarizeEffects(records: EffectRecord[], customerId: string): EffectSummary | undefined {
  const mine = effectsByCustomer(records, customerId);
  const first = mine[0];
  const latest = mine[mine.length - 1];
  if (!first || !latest) return undefined;
  const withMetrics = mine.filter((r) => r.metrics);
  const firstMetrics = withMetrics[0]?.metrics;
  const latestMetrics = withMetrics[withMetrics.length - 1]?.metrics;
  return {
    count: mine.length,
    first,
    latest,
    improvement:
      firstMetrics && latestMetrics && withMetrics.length >= 2
        ? computeImprovement(firstMetrics, latestMetrics)
        : undefined,
  };
}

export interface RadarAxis {
  key: keyof SkinMetrics;
  /** 0–100，已換算成越高越好 */
  value: number;
  x: number;
  y: number;
}

/** 雷達圖四軸座標（從正上方順時針）。pores 反向為「細緻度」。 */
export function radarAxes(metrics: SkinMetrics, cx: number, cy: number, radius: number): RadarAxis[] {
  const axes: Array<{ key: keyof SkinMetrics; value: number }> = [
    { key: 'hydration', value: metrics.hydration },
    { key: 'pores', value: 100 - metrics.pores },
    { key: 'evenness', value: metrics.evenness },
    { key: 'smoothness', value: metrics.smoothness },
  ];
  return axes.map((axis, i) => {
    const angle = (Math.PI * 2 * i) / axes.length - Math.PI / 2;
    const ratio = Math.max(0, Math.min(100, axis.value)) / 100;
    return {
      ...axis,
      x: Math.round((cx + Math.cos(angle) * radius * ratio) * 100) / 100,
      y: Math.round((cy + Math.sin(angle) * radius * ratio) * 100) / 100,
    };
  });
}
