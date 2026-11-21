// AC-006 敏感個資同意、遮罩、刪除；AC-004 LINE dry-run（UI 不發送任何網路請求）。
import { expect, test } from '@playwright/test';
import { customerRow, decodeSensitiveVault, dumpLocalStorage, goToTab, openApp, queueRow } from './helpers';

test.describe('AC-006 敏感個資同意與遮罩', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
  });

  test('AC-006: S 級欄位預設遮罩，需明確點擊才顯示；切換客戶後重新遮罩', async ({ page }) => {
    await queueRow(page, 'cust-a').click();
    const content = page.getByTestId('sensitive-content');
    await expect(content).toHaveAttribute('data-revealed', 'false');
    await expect(content).not.toContainText('香精');
    await expect(content).toContainText('••••••');
    await page.getByTestId('sensitive-reveal').click();
    await expect(content).toHaveAttribute('data-revealed', 'true');
    await expect(content).toContainText('香精');
    await expect(content).toContainText('換季時頭皮容易乾燥');
    await expect(page.getByTestId('effect-change')).toHaveText('+20');

    await queueRow(page, 'cust-b').click();
    await queueRow(page, 'cust-a').click();
    await expect(page.getByTestId('sensitive-content')).toHaveAttribute('data-revealed', 'false');
  });

  test('AC-006: localStorage 內沒有 S 級明文', async ({ page }) => {
    await queueRow(page, 'cust-a').click();
    const raw = await dumpLocalStorage(page);
    expect(raw).not.toContain('換季時頭皮容易乾燥');
    expect(raw).not.toContain('曾對酸類產品泛紅');
    expect(raw).not.toContain('"skinCondition"');
    expect(raw).toContain('beauty-crm:m1:sensitive=b64:');
    expect(await decodeSensitiveVault(page)).toContain('換季時頭皮容易乾燥');
  });

  test('AC-006: 未同意時不可填敏感欄位；新增時勾選同意才可填', async ({ page }) => {
    await queueRow(page, 'cust-c').click();
    await expect(page.getByTestId('sensitive-no-consent')).toBeVisible();
    await page.getByTestId('edit-customer').click();
    await expect(page.locator('#customer-allergies')).toBeDisabled();
    await page.keyboard.press('Escape');

    await goToTab(page, 'clients');
    await page.getByTestId('add-customer').click();
    await page.locator('#customer-name').fill('示範客戶 敏感');
    await page.locator('#customer-phone').fill('0900000021');
    await expect(page.locator('#customer-allergies')).toBeDisabled();
    await page.locator('#customer-sensitive-consent').check();
    await page.locator('#customer-allergies').fill('示範過敏原');
    await page.getByTestId('save-customer').click();
    await expect(page.getByTestId('consent-sensitive')).toHaveAttribute('data-status', 'granted');
    await page.getByTestId('sensitive-reveal').click();
    await expect(page.getByTestId('sensitive-content')).toContainText('示範過敏原');
  });

  test('AC-006: 撤回敏感個資同意會清除 S 級資料與效果紀錄', async ({ page }) => {
    await queueRow(page, 'cust-a').click();
    await page.getByTestId('sensitive-revoke').click();
    await page.getByTestId('sensitive-revoke-confirm').click();
    await expect(page.getByTestId('consent-sensitive')).toHaveAttribute('data-status', 'revoked');
    await expect(page.getByTestId('sensitive-no-consent')).toBeVisible();
    await expect(page.getByTestId('effect-count')).toHaveCount(0);
    const vault = await decodeSensitiveVault(page);
    expect(vault).not.toContain('香精');
    expect(vault).not.toContain('換季時頭皮容易乾燥');
    expect(vault).not.toContain('seed-e1');
    await page.reload();
    await queueRow(page, 'cust-a').click();
    await expect(page.getByTestId('consent-sensitive')).toHaveAttribute('data-status', 'revoked');
  });

  test('AC-006: 店主刪除單一客戶，localStorage 內找不到該客戶', async ({ page }) => {
    await queueRow(page, 'cust-a').click();
    await page.getByTestId('delete-customer').click();
    await page.getByTestId('delete-customer-confirm').click();
    await expect(page.locator('#toast')).toContainText('已刪除');
    await expect(queueRow(page, 'cust-a')).toHaveCount(0);
    const raw = await dumpLocalStorage(page);
    expect(raw).not.toContain('cust-a');
    expect(raw).not.toContain('示範客戶 A');
    expect(await decodeSensitiveVault(page)).not.toContain('cust-a');
    await page.reload();
    await goToTab(page, 'clients');
    await expect(customerRow(page, 'cust-a')).toHaveCount(0);
  });

  test('AC-006: 清除本機全部資料', async ({ page }) => {
    await goToTab(page, 'settings');
    await page.getByTestId('clear-all').click();
    await page.getByTestId('clear-all-confirm').click();
    await expect(page.locator('#toast')).toContainText('本機資料已清除');
    const raw = await dumpLocalStorage(page);
    expect(raw).not.toContain('示範客戶');
    expect(raw).not.toMatch(/09000000\d{2}/);
    await page.reload();
    await goToTab(page, 'clients');
    await expect(page.getByTestId('clients-empty')).toBeVisible();
  });

  test('AC-006: 匯出檔標註含個資與版本', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('export-data').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('含個資');
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    const payload = JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
    expect(payload.formatVersion).toBe(2);
    expect(payload.containsPersonalData).toBe(true);
    expect(String(payload.notice)).toContain('含個資');
  });
});

test.describe('AC-004 LINE dry-run（UI）', () => {
  test('AC-004: 核准草稿 → 產生 dry-run 紀錄，沒有任何對外網路請求', async ({ page }) => {
    const external: string[] = [];
    page.on('request', (request) => {
      const host = new URL(request.url()).hostname;
      if (host !== '127.0.0.1' && host !== 'localhost') external.push(request.url());
    });
    await openApp(page);
    await queueRow(page, 'cust-a').click();
    await page.getByTestId('view-draft').click();
    await expect(page.getByTestId('line-dry-run')).toBeDisabled();
    await page.locator('#draft-copy').fill('示範客戶 A 您好，想幫您留下週的時段。');
    await expect(page.getByTestId('draft-status')).toHaveAttribute('data-status', 'draft');
    await page.locator('#approve-draft').click();
    await expect(page.getByTestId('draft-status')).toHaveAttribute('data-status', 'approved');
    await page.getByTestId('line-dry-run').click();
    await expect(page.locator('#toast')).toContainText('未實際發送');
    await expect(page.getByTestId('draft-status')).toHaveAttribute('data-status', 'sent');

    await page.reload();
    await goToTab(page, 'retention');
    const item = page.getByTestId('send-log-item');
    await expect(item).toHaveCount(1);
    await expect(item).toContainText('dry-run');
    await expect(item).toContainText('示範客戶 A 您好，想幫您留下週的時段。');
    expect(external).toEqual([]);
  });

  test('AC-004: 未同意行銷的客戶不出現草稿與送出動作', async ({ page }) => {
    await openApp(page);
    await queueRow(page, 'cust-e').click();
    await expect(page.getByTestId('broadcast-guard')).toBeVisible();
    await expect(page.getByTestId('view-draft')).toHaveCount(0);
    await expect(page.getByTestId('line-dry-run')).toHaveCount(0);
  });
});

test.describe('AC-003 本機資料損毀時不覆寫', () => {
  test('AC-003: 資料讀不出來時顯示警告、不覆寫；店主重新載入示範資料後恢復', async ({ page }) => {
    await openApp(page);
    const broken = '{"schemaVersion":1,"workspace":'; // 只寫了一半的 JSON
    await page.evaluate((raw) => window.localStorage.setItem('beauty-crm:m1:data', raw), broken);
    await page.reload();
    await expect(page.getByTestId('storage-corrupt')).toBeVisible();
    await queueRow(page, 'cust-a').click();
    await page.getByTestId('mark-contacted').click();
    expect(await page.evaluate(() => window.localStorage.getItem('beauty-crm:m1:data'))).toBe(broken);

    await goToTab(page, 'settings');
    await page.getByTestId('reload-demo').click();
    await expect(page.getByTestId('storage-corrupt')).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId('storage-corrupt')).toHaveCount(0);
    await expect(queueRow(page, 'cust-a')).toBeVisible();
  });
});
