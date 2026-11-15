// AC-003：新增客戶與服務真正寫入並更新回訪清單；KPI 由資料計算；重新整理後保留。
import { expect, test } from '@playwright/test';
import { customerRow, goToTab, openApp, queueRow } from './helpers';

test.describe('AC-003 新增客戶與服務', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
  });

  test('AC-003: 新增服務 → 回訪清單與 KPI 立即更新 → reload 後仍在', async ({ page }) => {
    const rows = page.getByTestId('recall-queue').getByTestId('queue-row');
    await expect(rows).toHaveCount(5);
    await expect(queueRow(page, 'cust-c')).toContainText('5 天後');
    // KPI 來自資料：本月（2026-11）一店只有 cust-f 的剪髮 1 筆、NT$ 1,200
    await expect(page.getByTestId('kpi-visits')).toHaveText('1');
    await expect(page.getByTestId('kpi-revenue')).toHaveText('NT$ 1,200');
    await expect(page.getByTestId('kpi-return')).toHaveText('33%');

    await page.locator('#open-add').click();
    await page.locator('#visit-customer').selectOption('cust-c');
    await page.locator('#visit-service').selectOption('svc-lash');
    await expect(page.locator('#visit-amount')).toHaveValue('1800');
    await page.locator('#visit-note').fill('自然款，右眼尾加密');
    await page.getByTestId('save-visit').click();
    await expect(page.locator('#toast')).toContainText('服務紀錄已儲存');

    // 美睫週期 21 天：剛做完 → 離開 14 天窗口
    await expect(rows).toHaveCount(4);
    await expect(queueRow(page, 'cust-c')).toHaveCount(0);
    await expect(page.getByTestId('kpi-followups')).toHaveText('4');
    await expect(page.getByTestId('kpi-visits')).toHaveText('2');
    await expect(page.getByTestId('kpi-revenue')).toHaveText('NT$ 3,000');
    await expect(page.getByTestId('funnel-due')).toHaveText('4');
    // 面板顯示剛新增的療程
    await expect(page.getByTestId('memory-panel')).toHaveAttribute('data-customer-id', 'cust-c');
    await expect(page.locator('#profile-service')).toContainText('美睫嫁接');
    await expect(page.getByTestId('memory-panel')).toContainText('自然款，右眼尾加密');

    await page.reload();
    await expect(rows).toHaveCount(4);
    await expect(queueRow(page, 'cust-c')).toHaveCount(0);
    await expect(page.getByTestId('kpi-visits')).toHaveText('2');
    await expect(page.getByTestId('kpi-revenue')).toHaveText('NT$ 3,000');
  });

  test('AC-003: 新增客戶 → 補登服務 → 出現在待聯絡清單 → reload 後保留', async ({ page }) => {
    await goToTab(page, 'clients');
    await expect(page.getByTestId('customer-row')).toHaveCount(6);
    await page.getByTestId('add-customer').click();
    await expect(page.getByTestId('save-customer')).toBeDisabled();
    await page.locator('#customer-name').fill('示範客戶 新');
    await page.locator('#customer-phone').fill('0900000020');
    await page.locator('#customer-email').fill('demo-new@example.com');
    await page.locator('#customer-marketing').selectOption('granted');
    await page.locator('#customer-preferences').fill('自然款, 平日晚上');
    await page.getByTestId('save-customer').click();
    await expect(page.locator('#toast')).toContainText('客戶資料已儲存');
    await expect(page.getByTestId('customer-row')).toHaveCount(7);
    await expect(page.getByTestId('clients-view')).toContainText('示範客戶 新');
    await expect(page.locator('#profile-name')).toHaveText('示範客戶 新');
    await expect(page.locator('#profile-reason')).toHaveText('尚無服務紀錄');

    // 還沒有服務紀錄 → 不在回訪清單
    await goToTab(page, 'today');
    await expect(page.getByTestId('recall-queue')).not.toContainText('示範客戶 新');

    // 補登 10 天前的美睫（21 天週期 → 11 天後到期）
    await page.locator('#open-add').click();
    await page.locator('#visit-customer').selectOption({ label: '示範客戶 新' });
    await page.locator('#visit-service').selectOption('svc-lash');
    await page.locator('#visit-date').fill('2026-11-06');
    await page.getByTestId('save-visit').click();
    await expect(page.getByTestId('recall-queue').getByTestId('queue-row')).toHaveCount(6);
    const newRow = page.getByTestId('recall-queue').getByTestId('queue-row').filter({ hasText: '示範客戶 新' });
    await expect(newRow).toContainText('11 天後');
    await expect(newRow).toContainText('美睫嫁接');

    await page.reload();
    await expect(page.getByTestId('recall-queue').getByTestId('queue-row').filter({ hasText: '示範客戶 新' })).toContainText('11 天後');
    await goToTab(page, 'clients');
    await expect(page.getByTestId('customer-row')).toHaveCount(7);
  });

  test('AC-003: 編輯客戶會保存', async ({ page }) => {
    await goToTab(page, 'clients');
    await customerRow(page, 'cust-d').getByRole('button').click();
    await page.getByTestId('edit-customer').click();
    await expect(page.locator('#customer-name')).toHaveValue('示範客戶 D');
    await page.locator('#customer-name').fill('示範客戶 D（已更名）');
    await page.locator('#customer-notes').fill('偏好靠窗座位');
    await page.getByTestId('save-customer').click();
    await expect(customerRow(page, 'cust-d')).toContainText('示範客戶 D（已更名）');
    await page.reload();
    await goToTab(page, 'clients');
    await expect(customerRow(page, 'cust-d')).toContainText('示範客戶 D（已更名）');
  });

  test('AC-003: 含過敏衝突的服務在儲存前顯示確認', async ({ page }) => {
    await queueRow(page, 'cust-a').click();
    await page.locator('#open-add').click();
    await expect(page.locator('#visit-customer')).toHaveValue('cust-a');
    // 剪髮護理沒有衝突
    await page.locator('#visit-service').selectOption('svc-cut');
    await expect(page.getByTestId('allergy-conflict')).toHaveCount(0);
    await expect(page.getByTestId('save-visit')).toBeEnabled();

    // 染髮補色含香精，與 A 的過敏紀錄衝突
    await page.locator('#visit-service').selectOption('svc-color');
    const conflict = page.getByTestId('allergy-conflict');
    await expect(conflict).toBeVisible();
    await expect(conflict).toContainText('香精');
    await expect(page.getByTestId('save-visit')).toBeDisabled();

    await page.getByTestId('allergy-ack').check();
    await expect(page.getByTestId('save-visit')).toBeEnabled();
    await page.getByTestId('save-visit').click();
    await expect(page.locator('#toast')).toContainText('服務紀錄已儲存');
    // 染髮 45 天週期：A 離開回訪清單
    await expect(queueRow(page, 'cust-a')).toHaveCount(0);
  });

  test('AC-003: 新增服務可扣套票堂數', async ({ page }) => {
    await queueRow(page, 'cust-a').click();
    await expect(page.getByTestId('package-remaining')).toHaveText('剩餘 6 堂');
    await page.locator('#open-add').click();
    await page.locator('#visit-service').selectOption('svc-hydra');
    await page.getByTestId('visit-use-package').check();
    await expect(page.locator('#visit-amount')).toHaveValue('0');
    await page.getByTestId('save-visit').click();
    await expect(page.getByTestId('package-remaining')).toHaveText('剩餘 5 堂');
    await page.reload();
    await queueRow(page, 'cust-e').click();
    await goToTab(page, 'clients');
    await customerRow(page, 'cust-a').getByRole('button').click();
    await expect(page.getByTestId('package-remaining')).toHaveText('剩餘 5 堂');
  });

  test('AC-003: 調整回訪天數後回訪日重算，reload 後保留', async ({ page }) => {
    // E：40 天前做美甲，28 天週期 → 逾期 12 天
    await expect(queueRow(page, 'cust-e')).toContainText('逾期 12 天');
    await goToTab(page, 'settings');
    await expect(page.getByTestId('recall-days-manicure')).toHaveValue('28');
    await page.getByTestId('recall-days-manicure').fill('35');
    await page.getByTestId('save-recall-days').click();
    await expect(page.locator('#toast')).toContainText('回訪天數已更新');
    await goToTab(page, 'today');
    await expect(queueRow(page, 'cust-e')).toContainText('逾期 5 天');

    // 改成 60 天 → 還有 20 天，離開 14 天窗口
    await goToTab(page, 'settings');
    await page.getByTestId('recall-days-manicure').fill('60');
    await page.getByTestId('save-recall-days').click();
    await goToTab(page, 'today');
    await expect(queueRow(page, 'cust-e')).toHaveCount(0);
    await expect(page.getByTestId('recall-queue').getByTestId('queue-row')).toHaveCount(4);

    await page.reload();
    await expect(queueRow(page, 'cust-e')).toHaveCount(0);
    await goToTab(page, 'settings');
    await expect(page.getByTestId('recall-days-manicure')).toHaveValue('60');
    // 不合法的天數不可儲存
    await page.getByTestId('recall-days-manicure').fill('0');
    await expect(page.getByTestId('save-recall-days')).toBeDisabled();
  });

  test('AC-003: 375px 寬可完成新增服務（手機底部導覽）', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.locator('.mobile-nav')).toBeVisible();
    await page.locator('#open-add').click();
    await page.locator('#visit-customer').selectOption('cust-d');
    await page.locator('#visit-service').selectOption('svc-hydra');
    await page.getByTestId('save-visit').click();
    await expect(page.locator('#toast')).toContainText('服務紀錄已儲存');
    await expect(queueRow(page, 'cust-d')).toHaveCount(0);
    await page.locator('[data-mobile-nav="clients"]').click();
    await expect(page.getByTestId('clients-view')).toBeVisible();
  });
});
