// axe-core ile erişilebilirlik taraması: site (masaüstü + telefon) ve panelin her sekmesi 0 ihlal vermeli.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { login } from './helpers.js';

const axeSource = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');

async function violations(page) {
  await page.evaluate(axeSource); // CDP üzerinden: sayfanın CSP'sinden etkilenmez
  return page.evaluate(async () => {
    const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } });
    return r.violations.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
  });
}

test.describe('erişilebilirlik (axe)', () => {
  for (const [name, width, height] of [['masaüstü', 1440, 900], ['telefon', 390, 844]]) {
    test(`ana sayfa ${name}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/');
      for (const y of [0, 700, 1500, 2400, 3300]) { await page.evaluate((v) => window.scrollTo(0, v), y); await page.waitForTimeout(120); }
      await page.evaluate(() => window.scrollTo(0, 0));
      expect(await violations(page)).toEqual([]);
    });
  }

  test('404 sayfası', async ({ page }) => {
    await page.goto('/yok-boyle-bir-sayfa');
    expect(await violations(page)).toEqual([]);
  });

  test('yönetim paneli: tüm sekmeler', async ({ page }) => {
    await login(page, { tab: 'home' });
    expect(await violations(page), 'genel bakış').toEqual([]);
    for (const name of ['Çalışmalar', 'Site içeriği', 'Mesajlar', 'Hesap']) {
      await page.getByRole('tab', { name: new RegExp(name) }).click();
      if (name === 'Site içeriği') await page.locator('details.group summary').nth(1).click();
      if (name === 'Hesap') await page.locator('details.group summary').first().click();
      expect(await violations(page), name).toEqual([]);
    }
  });
});
