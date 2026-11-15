// Beauty CRM — 日期工具（只處理「本地日期」YYYY-MM-DD，不經過 UTC）
// 與 reminders.ts 的規則一致：台灣使用者（UTC+8）不可用 toISOString().slice(0,10)。

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isDateOnly(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const m = DATE_ONLY_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d;
}

/** Date → 本地時區的 YYYY-MM-DD。 */
export function toDateOnly(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** YYYY-MM-DD → 本地時區當日 00:00 的 Date。格式錯誤時 throw。 */
export function parseDateOnly(value: string): Date {
  if (!isDateOnly(value)) throw new Error(`invalid date: ${value}`);
  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

/** to - from 的整數天數（依日曆日，不受日光節約或時分秒影響）。 */
export function diffDays(from: string, to: string): number {
  const a = parseDateOnly(from);
  const b = parseDateOnly(to);
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcB - utcA) / 86_400_000);
}

export function addDays(value: string, days: number): string {
  const d = parseDateOnly(value);
  d.setDate(d.getDate() + days);
  return toDateOnly(d);
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isTimeOfDay(value: unknown): value is string {
  return typeof value === 'string' && TIME_RE.test(value);
}
