// AC-005：用假帳號切換身分與店別，畫面依權限隱藏資料與動作。
import { expect, test } from '@playwright/test';
import { customerRow, goToTab, openApp, queueRow, switchAccount, switchStore } from './helpers';

test.describe('AC-005 身分與店別切換', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
  });

  test('AC-005: 店主可切換兩家店，各自只看到該店客戶', async ({ page }) => {
    await expect(page.getByTestId('store-switcher').locator('option')).toHaveCount(2);
    await goToTab(page, 'clients');
    await expect(page.getByTestId('customer-row')).toHaveCount(6);
    await expect(customerRow(page, 'cust-g')).toHaveCount(0);
    await switchStore(page, 'store-2');
    await expect(page.getByTestId('customer-row')).toHaveCount(2);
    await expect(customerRow(page, 'cust-g')).toBeVisible();
    await expect(customerRow(page, 'cust-a')).toHaveCount(0);
  });

  test('AC-005: 二店設計師看不到一店客戶，店別選單只有自己的店', async ({ page }) => {
    await switchAccount(page, 'acc-designer-c');
    await expect(page.getByTestId('store-switcher').locator('option')).toHaveCount(1);
    await expect(page.getByTestId('store-switcher')).toHaveValue('store-2');
    await expect(queueRow(page, 'cust-a')).toHaveCount(0);
    await expect(page.getByTestId('recall-queue')).not.toContainText('示範客戶 A');
    await goToTab(page, 'clients');
    await expect(page.getByTestId('customer-row')).toHaveCount(2);
    await expect(page.getByTestId('clients-view')).not.toContainText('示範客戶 A');
  });

  test('AC-005: 非負責設計師看不到 S 級欄位；負責設計師可以', async ({ page }) => {
    await switchAccount(page, 'acc-designer-b');
    await queueRow(page, 'cust-a').click();
    await expect(page.getByTestId('sensitive-no-permission')).toBeVisible();
    await expect(page.getByTestId('sensitive-reveal')).toHaveCount(0);
    await expect(page.getByTestId('memory-panel')).not.toContainText('香精');
    await expect(page.getByTestId('effect-count')).toHaveCount(0);

    await switchAccount(page, 'acc-designer-a');
    await queueRow(page, 'cust-a').click();
    await expect(page.getByTestId('sensitive-content')).toBeVisible();
    await page.getByTestId('sensitive-reveal').click();
    await expect(page.getByTestId('sensitive-content')).toContainText('香精');
  });

  test('AC-005: 只有店主可匯出、刪除與清除；店長可改設定，設計師不可', async ({ page }) => {
    await expect(page.getByTestId('export-data')).toBeVisible();
    await queueRow(page, 'cust-a').click();
    await expect(page.getByTestId('delete-customer')).toBeVisible();

    await switchAccount(page, 'acc-manager');
    await expect(page.getByTestId('export-data')).toHaveCount(0);
    await queueRow(page, 'cust-a').click();
    await expect(page.getByTestId('delete-customer')).toHaveCount(0);
    await goToTab(page, 'settings');
    await expect(page.getByTestId('data-no-permission')).toBeVisible();
    await expect(page.getByTestId('clear-all')).toHaveCount(0);
    await expect(page.getByTestId('recall-days-hair')).toBeEnabled();

    await switchAccount(page, 'acc-designer-a');
    await expect(page.getByTestId('recall-no-permission')).toBeVisible();
    await expect(page.getByTestId('recall-days-hair')).toBeDisabled();
    await expect(page.getByTestId('settings-export')).toHaveCount(0);
  });
});
