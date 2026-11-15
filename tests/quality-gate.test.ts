// AC-008 品質閘門：package.json scripts、next 固定版本、單一 lockfile、CI 不吞錯、
// production 部署只能手動觸發。
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf8');

describe('AC-008 品質閘門', () => {
  const pkg = JSON.parse(read('package.json')) as {
    scripts: Record<string, string>;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  };
  const ci = read('.github/workflows/ci.yml');

  it('AC-008: package.json 有 typecheck 與 e2e script', () => {
    expect(pkg.scripts.typecheck).toBe('tsc --noEmit');
    expect(pkg.scripts.e2e).toContain('playwright');
    for (const name of ['lint', 'test', 'build']) {
      expect(pkg.scripts[name]).toBeTruthy();
    }
  });

  it('AC-008: next 為固定版本，不使用 latest 或範圍', () => {
    expect(pkg.dependencies.next).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('AC-008: 新增的 Playwright 依賴固定版本', () => {
    expect(pkg.devDependencies['@playwright/test']).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('AC-008: 只保留 npm lockfile', () => {
    expect(existsSync(resolve(root, 'package-lock.json'))).toBe(true);
    expect(existsSync(resolve(root, 'pnpm-lock.yaml'))).toBe(false);
    expect(existsSync(resolve(root, 'yarn.lock'))).toBe(false);
  });

  it('AC-008: CI 不吞錯（無 continue-on-error、無 || echo、無安裝 fallback）', () => {
    expect(ci).not.toMatch(/continue-on-error/);
    expect(ci).not.toMatch(/\|\|\s*echo/);
    expect(ci).not.toMatch(/npm ci[^\n]*\|\|/);
  });

  it('AC-008: CI 包含 lint、typecheck、test、build、e2e 五個檢查', () => {
    for (const cmd of ['npm run lint', 'npm run typecheck', 'npm test', 'npm run build', 'npm run e2e']) {
      expect(ci).toContain(cmd);
    }
  });

  it('AC-008: production 部署只能手動觸發，且需等全部檢查通過', () => {
    const deploy = ci.slice(ci.indexOf('\n  deploy:'));
    expect(deploy).toContain("github.event_name == 'workflow_dispatch'");
    expect(deploy).toContain('inputs.deploy_production');
    expect(deploy).not.toMatch(/github\.event_name == 'push'/);
    expect(deploy).toMatch(/needs: \[lint, typecheck, test, build, e2e\]/);
  });

  it('AC-008: e2e 固定 Asia/Taipei 時區', () => {
    expect(read('playwright.config.ts')).toContain("timezoneId: 'Asia/Taipei'");
  });
});
