import { defineConfig, devices } from '@playwright/test';

export const E2E_USER = 'e2e';
export const E2E_PASS = 'E2e-Test-Parola-1';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:8788', trace: 'retain-on-failure', locale: 'tr-TR', timezoneId: 'Europe/Istanbul' },
  webServer: {
    command: `npm run db:local && node scripts/set-admin.mjs --username ${E2E_USER} --password ${E2E_PASS} && npx wrangler pages dev public --r2=MEDIA --port 8788 --ip 127.0.0.1`,
    url: 'http://127.0.0.1:8788/',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
