import { test, expect } from '@playwright/test';
import { apiLogin, freshIp } from './helpers.js';

test.describe('İllüstrasyonlar ve hareket', () => {
  test('el yazısı başlık ve çizimler yerinde, konsol hatası yok (CSP dahil)', async ({ page }) => {
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && !/ERR_TUNNEL|ERR_NAME|Failed to load resource/.test(m.text()) && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    await expect(page.locator('.hero-swoosh svg')).toBeVisible();
    await expect(page.locator('.hl-w')).toHaveText(['Fikir.', 'Kadraj.', 'Hikâye.']);
    await expect(page.locator('.hero-h1')).toHaveCSS('text-transform', 'uppercase');
    await expect(page.locator('.section h2 .scribble')).toHaveCount(6); // Çalışmalar, Hizmetler, Süreç, Hakkımda, Yetenekler, İletişim
    await expect(page.locator('.services .svc')).toHaveCount(8);
    await expect(page.locator('.steps li')).toHaveCount(4);
    await expect(page.locator('.ticker')).toHaveAttribute('aria-hidden', 'true');
    // Süs çizimleri ekran okuyucudan gizli
    for (const el of await page.locator('svg.doodle').all()) await expect(el).toHaveAttribute('aria-hidden', 'true');
    expect(errors).toEqual([]);
  });

  test('başlığın erişilebilir adı kişinin adını içerir', async ({ page }) => {
    await page.goto('/');
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toContainText('Mehmet Abdullah Bardakçı');
    await expect(h1).toContainText('Fikir.');
  });

  test('açılış başlığı panelden değişir ve HTML çalışmaz', async ({ page, request }) => {
    const { csrf } = await apiLogin(request);
    const h = { origin: 'http://127.0.0.1:8788', 'x-csrf-token': csrf };
    const site = await (await request.get('/api/admin/site')).json();
    try {
      site.hero.headline = 'Kısa <b>iş</b>';
      expect((await request.put('/api/admin/site', { headers: h, data: site })).status()).toBe(200);
      await page.goto('/');
      await expect(page.locator('.hl-w')).toHaveText(['Kısa', '<b>iş</b>']);
      await expect(page.locator('.hero-h1 b')).toHaveCount(0);
    } finally {
      site.hero.headline = 'Fikir. Kadraj. Hikâye.';
      await request.put('/api/admin/site', { headers: h, data: site });
    }
  });

  test('başlık altı çizgi, başlık görününce çizilir', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/\bjs\b/);
    const h2 = page.locator('#work-h');
    await expect(h2).not.toHaveClass(/\bin\b/);
    await h2.scrollIntoViewIfNeeded();
    await expect(h2).toHaveClass(/\bin\b/);
  });

  test('hareket azaltma tercihi: animasyonlar kapalı, içerik görünür', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto('/');
    const names = await page.evaluate(() => ['.hl-w', '.status-dot', '.ticker-track', '.hero-swoosh .stroke'].map((s) => getComputedStyle(document.querySelector(s)).animationName));
    expect(names).toEqual(['none', 'none', 'none', 'none']);
    await expect(page.locator('.hl-w').first()).toBeVisible();
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

  test('telefon ve masaüstünde yatay taşma yok', async ({ page }) => {
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      await page.waitForTimeout(400);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${width}px`).toBeLessThanOrEqual(0);
    }
  });
});
