// AC-002：合併後 UI 單一入口——客戶記憶面板的三個合併區塊與回流漏斗。
import { expect, test } from '@playwright/test';
import { goToTab, openApp, queueRow } from './helpers';

test.describe('AC-002 合併面板與回流漏斗', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
  });

  test('AC-002: 客戶記憶面板顯示套票剩餘堂數、下次預約、Before/After 示意圖', async ({ page }) => {
    await queueRow(page, 'cust-a').click();
    const panel = page.getByTestId('memory-panel');
    await expect(panel).toHaveAttribute('data-customer-id', 'cust-a');

    // 套票：10 堂已用 4 堂
    await expect(panel.getByTestId('memory-package')).toBeVisible();
    await expect(panel.getByTestId('package-remaining')).toHaveText('剩餘 6 堂');
    await expect(panel.getByTestId('memory-package')).toContainText('示範保濕套票 10 堂');
    await expect(panel.getByTestId('memory-package')).toContainText('4/10');

    // 下次預約：A 尚未預約
    await expect(panel.getByTestId('memory-appointment')).toBeVisible();
    await expect(panel.getByTestId('appointment-next')).toHaveText('尚未預約');

    // Before/After：本機示意圖（內嵌 SVG），3 筆紀錄，指標預設遮罩
    const effect = panel.getByTestId('memory-effect');
    await expect(effect).toBeVisible();
    await expect(effect.getByTestId('effect-placeholder-before')).toBeVisible();
    await expect(effect.getByTestId('effect-placeholder-after')).toBeVisible();
    await expect(effect.getByTestId('effect-count')).toHaveText('3 筆紀錄');
    await expect(effect.getByTestId('effect-change')).toHaveText('••••••');
    await expect(effect).toContainText('示意圖，非真人照片');

    // B 有預約：顯示日期時間與「已預約」
    await queueRow(page, 'cust-b').click();
    await expect(panel).toHaveAttribute('data-customer-id', 'cust-b');
    await expect(panel.getByTestId('appointment-next')).toHaveText('2026-11-19 14:00');
    await expect(panel.getByTestId('package-remaining')).toHaveText('沒有可用套票');
  });

  test('AC-002: 頁面沒有任何照片或遠端圖片', async ({ page }) => {
    const remote: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') remote.push(request.url());
    });
    await queueRow(page, 'cust-a').click();
    await page.getByTestId('sensitive-reveal').click();
    await expect(page.getByTestId('effect-detail')).toBeVisible();
    await expect(page.locator('img')).toHaveCount(0);
    await expect(page.locator('[style*="background-image"]')).toHaveCount(0);
    expect(remote).toEqual([]);
  });

  test('AC-002: 回流漏斗在主入口可見，數字由資料計算並隨操作改變', async ({ page }) => {
    const funnel = page.getByTestId('funnel');
    await expect(funnel).toBeVisible();
    // 示範資料：一店佇列 5 人；C 已聯絡、B 已預約
    await expect(page.getByTestId('recall-queue').getByTestId('queue-row')).toHaveCount(5);
    await expect(funnel.getByTestId('funnel-due')).toHaveText('5');
    await expect(funnel.getByTestId('funnel-contacted')).toHaveText('2');
    await expect(funnel.getByTestId('funnel-booked')).toHaveText('1');
    await expect(funnel.getByTestId('funnel-contact-to-book')).toHaveText('50%');
    await expect(funnel.getByTestId('funnel-overall')).toHaveText('20%');
    await expect(page.getByTestId('kpi-followups')).toHaveText('5');

    // 標記 A 已聯絡 → 已聯絡 +1
    await queueRow(page, 'cust-a').click();
    await page.getByTestId('mark-contacted').click();
    await expect(funnel.getByTestId('funnel-contacted')).toHaveText('3');
    await expect(queueRow(page, 'cust-a').locator('[data-badge="contacted"]')).toBeVisible();

    // 替 A 記錄預約 → 已預約 +1，轉換率跟著變
    await page.getByTestId('appointment-date').fill('2026-11-20');
    await page.getByTestId('appointment-time').fill('15:30');
    await page.getByTestId('appointment-add').click();
    await expect(page.getByTestId('appointment-next')).toHaveText('2026-11-20 15:30');
    await expect(funnel.getByTestId('funnel-booked')).toHaveText('2');
    await expect(funnel.getByTestId('funnel-contact-to-book')).toHaveText('67%');
    await expect(funnel.getByTestId('funnel-overall')).toHaveText('40%');

    // 取消預約 → 回到 1
    await page.getByTestId('appointment-cancel').click();
    await expect(funnel.getByTestId('funnel-booked')).toHaveText('1');

    // 重新整理後漏斗仍是資料算出來的結果
    await page.reload();
    await expect(page.getByTestId('funnel-contacted')).toHaveText('3');
    await expect(page.getByTestId('funnel-booked')).toHaveText('1');
  });

  test('AC-002: 只有一套工作台，五個分頁都有實際內容', async ({ page }) => {
    await expect(page.locator('.rail [data-nav]')).toHaveCount(5);
    await goToTab(page, 'clients');
    await expect(page.getByTestId('clients-view')).toBeVisible();
    await expect(page.getByTestId('customer-row')).toHaveCount(6);
    await goToTab(page, 'retention');
    await expect(page.getByTestId('retention-view')).toBeVisible();
    await expect(page.getByTestId('funnel')).toBeVisible();
    await expect(page.getByTestId('calendar-month')).toHaveText('2026-11');
    // 月曆只顯示：B 的預約在 11/19；C 的建議回訪日在 11/21
    await expect(page.locator('[data-date="2026-11-19"]')).toHaveAttribute('data-appointment', '1');
    await expect(page.locator('[data-date="2026-11-21"]')).toHaveAttribute('data-recall', '1');
    await goToTab(page, 'insights');
    await expect(page.getByTestId('insights-view')).toBeVisible();
    await goToTab(page, 'settings');
    await expect(page.getByTestId('settings-view')).toBeVisible();
    await goToTab(page, 'today');
    await expect(page.getByTestId('recall-queue')).toBeVisible();
  });
});
