// 測試 vercel.json 是 valid JSON + 有必要欄位
// 對齊 v0.4.0 commit 6 deploy 設定

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const VERCEL_JSON_PATH = resolve(__dirname, '..', 'vercel.json');

describe('deploy — vercel.json', () => {
  it('AC: vercel.json 存在', () => {
    const raw = readFileSync(VERCEL_JSON_PATH, 'utf-8');
    expect(raw.length).toBeGreaterThan(0);
  });

  it('AC: vercel.json 是 valid JSON', () => {
    const raw = readFileSync(VERCEL_JSON_PATH, 'utf-8');
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it('AC: 必要欄位齊全（framework / buildCommand / outputDirectory）', () => {
    const raw = readFileSync(VERCEL_JSON_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Record<string, string>;
    expect(parsed.framework).toBe('nextjs');
    expect(parsed.buildCommand).toBe('npm run build');
    expect(parsed.outputDirectory).toBe('.next');
  });

  it('AC: 含 $schema 連結（讓 Vercel 知道用哪個 schema 驗證）', () => {
    const raw = readFileSync(VERCEL_JSON_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Record<string, string>;
    expect(parsed.$schema).toContain('vercel.json');
  });
});

describe('deploy — .gitignore', () => {
  it('AC: .next/ 在 .gitignore', () => {
    const raw = readFileSync(resolve(__dirname, '..', '.gitignore'), 'utf-8');
    expect(raw).toContain('.next/');
  });

  it('AC: node_modules/ 在 .gitignore', () => {
    const raw = readFileSync(resolve(__dirname, '..', '.gitignore'), 'utf-8');
    expect(raw).toContain('node_modules/');
  });
});
