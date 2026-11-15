// AC-007 假資料掃描器（測試用 helper，無外部依賴）。
// 規則來源：PRD/SPEC.md §6.4、AGENTS.md §4.1。
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

export const REPO_ROOT = resolve(__dirname, '..', '..');

const PHONE_RE = /(?<![\d.])09\d{2}[ -]?\d{3}[ -]?\d{3}(?![\d.])/g;
const FAKE_PHONE_RE = /^09000000\d{2}$/;
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const FAKE_NAME_RE = /^(示範|測試|Demo |Test )/;

/** 找出不在假號碼範圍（09000000xx）的台灣手機號。 */
export function findUnsafePhones(text: string): string[] {
  return (text.match(PHONE_RE) ?? []).filter((raw) => !FAKE_PHONE_RE.test(raw.replace(/[ -]/g, '')));
}

/** 找出不是 @example.com 的 Email。 */
export function findUnsafeEmails(text: string): string[] {
  return (text.match(EMAIL_RE) ?? []).filter((raw) => !raw.toLowerCase().endsWith('@example.com'));
}

/**
 * 找出程式碼中「人名欄位」的字串常值裡沒有假資料前綴者。
 * 檢查 createCustomer 的 name 參數，以及 clientName、customerName 欄位。
 * 空字串（測試必填驗證用）與含 ${} 的樣板字串只檢查其固定前綴。
 */
export function findUnsafeNames(source: string): string[] {
  const found: string[] = [];
  const patterns = [
    /createCustomer\(\{[^}]*?\bname:\s*(['"`])((?:(?!\1).)*)\1/gs,
    /\b(?:clientName|customerName):\s*(['"`])((?:(?!\1).)*)\1/g,
  ];
  for (const re of patterns) {
    for (const match of source.matchAll(re)) {
      const value = match[2] ?? '';
      if (value === '') continue;
      if (!FAKE_NAME_RE.test(value)) found.push(value);
    }
  }
  return found;
}

export function isFakeName(name: string): boolean {
  return FAKE_NAME_RE.test(name);
}

export function isFakePhone(phone: string): boolean {
  return FAKE_PHONE_RE.test(phone.replace(/[ -]/g, ''));
}

function walk(dir: string, exts: string[], out: string[]): void {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, exts, out);
    else if (exts.some((ext) => entry.endsWith(ext))) out.push(full);
  }
}

/** seed、測試、fixture、原型與文件的掃描清單（相對路徑）。 */
export function listScanTargets(): string[] {
  const files: string[] = [];
  walk(join(REPO_ROOT, 'src'), ['.ts', '.tsx'], files);
  walk(join(REPO_ROOT, 'tests'), ['.ts', '.tsx', '.json'], files);
  walk(join(REPO_ROOT, 'PRD'), ['.md'], files);
  for (const entry of readdirSync(REPO_ROOT)) {
    if (entry.endsWith('.html') || entry.endsWith('.md')) files.push(join(REPO_ROOT, entry));
  }
  return files.map((f) => relative(REPO_ROOT, f)).sort();
}

export function readTarget(rel: string): string {
  return readFileSync(join(REPO_ROOT, rel), 'utf8');
}
