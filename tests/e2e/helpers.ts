// E2E 共用 helper（GOAL AC-008）：固定時間、每次清空 localStorage。
import { expect, type Locator, type Page } from '@playwright/test';

/** 固定在 2026-11-16 10:00（Asia/Taipei），示範資料的逾期天數因此是固定值。 */
export const FIXED_NOW = '2026-11-16T10:00:00+08:00';

/** 開啟 App：固定時鐘 → 清空 localStorage → 重新載入，確保每個測試從示範資料開始。 */
export async function openApp(page: Page): Promise<void> {
  await page.clock.setFixedTime(new Date(FIXED_NOW));
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(page.getByTestId('recall-queue')).toBeVisible();
}

export function queueRow(page: Page, customerId: string): Locator {
  return page.locator(`[data-testid="queue-row"][data-customer-id="${customerId}"]`);
}

export function customerRow(page: Page, customerId: string): Locator {
  return page.locator(`[data-testid="customer-row"][data-customer-id="${customerId}"]`);
}

export async function goToTab(page: Page, tab: 'today' | 'clients' | 'retention' | 'insights' | 'settings'): Promise<void> {
  await page.locator(`[data-nav="${tab}"]`).click();
}

export async function switchAccount(page: Page, accountId: string): Promise<void> {
  await page.getByTestId('account-switcher').selectOption(accountId);
}

export async function switchStore(page: Page, storeId: string): Promise<void> {
  await page.getByTestId('store-switcher').selectOption(storeId);
}

/** 整個 localStorage 串成一個字串，方便斷言「某段文字不存在於任何 key」。 */
export async function dumpLocalStorage(page: Page): Promise<string> {
  return page.evaluate(() =>
    Object.keys(window.localStorage)
      .map((key) => `${key}=${window.localStorage.getItem(key) ?? ''}`)
      .join('\n'),
  );
}

/** 還原 S 級保管箱（Base64）後的 JSON 字串。 */
export async function decodeSensitiveVault(page: Page): Promise<string> {
  return page.evaluate(() => {
    const raw = window.localStorage.getItem('beauty-crm:m1:sensitive') ?? '';
    if (!raw.startsWith('b64:')) return '';
    const binary = atob(raw.slice(4));
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  });
}
