import { defineConfig, devices } from '@playwright/test';

// E2E 設定（GOAL AC-008）：
// - 時區固定 Asia/Taipei，避免回訪日跨日 off-by-one。
// - 每個測試使用全新的 browser context（localStorage 為空），並在
//   tests/e2e/helpers.ts 的 openApp() 內再明確清空一次。
// - 以 production build 啟動（next start），不依賴 dev server 編譯時序。
const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    timezoneId: 'Asia/Taipei',
    locale: 'zh-TW',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run build && npm run start -- --hostname 127.0.0.1 --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: { TZ: 'Asia/Taipei' },
  },
});
