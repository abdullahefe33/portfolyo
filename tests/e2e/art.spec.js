import { test, expect } from '@playwright/test';
import { freshIp } from './helpers.js';

test.describe('İllüstrasyonlar ve hareket', () => {
  test('açılış sahnesi çizimleri yerinde, konsol hatası yok (CSP dahil)', async ({ page }) => {
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && !/ERR_TUNNEL|ERR_NAME|Failed to load resource/.test(m.text()) && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    await expect(page.locator('.deco-drone svg')).toBeVisible();
    await expect(page.locator('.deco-clapper svg')).toBeVisible();
    await expect(page.locator('.deco-sun svg')).toBeVisible();
    await expect(page.locator('.hills svg')).toBeAttached();
    await expect(page.locator('.svc .svc-art svg')).toHaveCount(8);
    await expect(page.locator('.steps .step-art svg')).toHaveCount(4);
    await expect(page.locator('.art-mascot')).toBeAttached();
    // Süs çizimleri ekran okuyucudan gizli
    for (const el of await page.locator('svg.art').all()) await expect(el).toHaveAttribute('aria-hidden', 'true');
    expect(errors).toEqual([]);
  });

  test('isim harf harf belirir ama erişilebilir adı bozulmaz', async ({ page }) => {
    await page.goto('/');
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toHaveAttribute('aria-label', 'Mehmet Abdullah Bardakçı');
    await expect(h1).toHaveClass(/is-split/);
    await expect(h1.locator('i')).toHaveCount('MehmetAbdullahBardakçı'.length);
    await expect(h1).toContainText('Bardakçı');
  });

  test('maskotun gözü imleci izler', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/#hakkimda');
    const mascot = page.locator('.art-mascot');
    await mascot.scrollIntoViewIfNeeded();
    const box = await mascot.boundingBox();
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await page.mouse.move(box.x + box.width + 300, box.y + box.height * 0.5);
    await expect.poll(async () => Number(await mascot.evaluate((el) => el.style.getPropertyValue('--ex')))).toBeGreaterThan(8);
    await page.mouse.move(2, box.y + box.height * 0.5); // ekranın sol kenarı
    await expect.poll(async () => Number(await mascot.evaluate((el) => el.style.getPropertyValue('--ex')))).toBeLessThan(-8);
  });

  test('başlık altı çizgi, başlık görününce çizilir', async ({ page }) => {
    await page.goto('/');
    const h2 = page.locator('#work-h');
    await expect(h2).not.toHaveClass(/\bin\b/);
    await h2.scrollIntoViewIfNeeded();
    await expect(h2).toHaveClass(/\bin\b/);
  });

  test('ekran dışındaki çizimler duraklar', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.art-mascot')).toHaveClass(/is-off/); // sayfanın aşağısında
    await page.locator('.art-mascot').scrollIntoViewIfNeeded();
    await expect(page.locator('.art-mascot')).not.toHaveClass(/is-off/);
  });

  test('hareket azaltma tercihi: harf animasyonu yok, çizimler durağan', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).not.toHaveClass(/is-split/);
    const names = await page.evaluate(() => ['.blade', '.drone-bob', '.clap-arm', '.reel-spin', '.sun-rays'].map((s) => getComputedStyle(document.querySelector(s)).animationName));
    expect(names).toEqual(['none', 'none', 'none', 'none', 'none']);
    await ctx.close();
  });

  test('mesaj gönderilince kâğıt uçak uçar', async ({ browser }) => {
    const ctx = await browser.newContext({ extraHTTPHeaders: { 'cf-connecting-ip': freshIp() } });
    const page = await ctx.newPage();
    await page.goto('/#iletisim');
    await page.waitForTimeout(2800);
    await page.getByLabel('Adınız').fill('Uçak Testi');
    await page.getByLabel('E-posta adresiniz').fill('ucak@example.com');
    await page.getByLabel('Mesajınız').fill('Kâğıt uçak animasyonunu denemek için bir mesaj yazıyorum.');
    await page.getByRole('button', { name: 'Mesajı gönder' }).click();
    await expect(page.locator('[data-contact]')).toHaveClass(/sent/);
    await expect(page.locator('.form-status')).toContainText('iletildi');
    await expect(page.locator('[data-contact]')).not.toHaveClass(/sent/, { timeout: 6000 }); // uçak geri döner
    await ctx.close();
  });

  test('telefon ve masaüstünde yatay taşma yok (illüstrasyonlarla)', async ({ page }) => {
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      await page.waitForTimeout(400);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${width}px`).toBeLessThanOrEqual(0);
    }
  });
});
