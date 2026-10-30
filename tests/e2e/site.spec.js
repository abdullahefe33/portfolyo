import { test, expect } from '@playwright/test';

test.describe('Herkese açık site', () => {
  test('ana sayfa içeriği, yaş ve bölümler', async ({ page }) => {
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(e.message));
    const res = await page.goto('/');
    expect(res.status()).toBe(200);

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Mehmet');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Bardakçı');
    for (const name of ['Hakkımda', 'Neler yapıyorum', 'Çalışmalar', 'Yetenekler', 'Projenizi konuşalım']) {
      await expect(page.getByRole('heading', { name, level: 2 })).toBeVisible();
    }

    // Yaş 16.05.2004 doğum tarihinden, Türkiye saatine göre hesaplanır.
    const expected = await page.evaluate(() => {
      const t = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
      let a = t.getFullYear() - 2004;
      if (t.getMonth() < 4 || (t.getMonth() === 4 && t.getDate() < 16)) a -= 1;
      return a;
    });
    await expect(page.locator('[data-age]')).toHaveText(String(expected));

    // İletişim: Instagram ve telefon görünür, e-posta adresi hiçbir yerde yok.
    await expect(page.getByRole('link', { name: '@m.abdullah_bardakci' })).toHaveAttribute('href', /instagram\.com\/m\.abdullah_bardakci/);
    await expect(page.getByRole('link', { name: /0546 724 53 02/ })).toHaveAttribute('href', 'tel:+905467245302');
    const html = await page.content();
    expect(html).not.toMatch(/@gmail\.com|@hotmail\.com|mailto:/i); // e-posta adresi sayfada hiçbir yerde olmamalı
    expect(errors).toEqual([]);
  });

  test('güvenlik başlıkları ve CSP (ana sayfa ve statik dosyalar)', async ({ request }) => {
    for (const path of ['/', '/assets/site.css', '/admin/']) {
      const h = (await request.get(path)).headers();
      expect(h['content-security-policy'], path).toContain("default-src 'self'");
      expect(h['content-security-policy'], path).toContain("frame-ancestors 'none'");
      expect(h['x-content-type-options'], path).toBe('nosniff');
      expect(h['x-frame-options'], path).toBe('DENY');
      expect(h['referrer-policy'], path).toBeTruthy();
    }
    expect((await request.get('/admin/')).headers()['x-robots-tag']).toContain('noindex');
  });

  for (const width of [320, 390, 768, 1024, 1440]) {
    test(`yatay kaydırma yok ve içerik taşmıyor (${width}px)`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });
  }

  test('mobil menü açılır ve klavye ile kapanır', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('/');
    const toggle = page.getByRole('button', { name: 'Menü' });
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('link', { name: 'Hizmetler' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  test('iletişim formu doğrulaması ve gönderimi', async ({ page }) => {
    await page.goto('/#iletisim');
    await page.getByRole('button', { name: 'Mesajı gönder' }).click();
    await expect(page.locator('.form-summary')).toBeVisible();
    await expect(page.locator('.form-summary')).toContainText('3 alanı düzeltin');
    await expect(page.getByLabel('Adınız')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#e-name')).toContainText('adınızı yazın');
    await expect(page.locator('.form-summary')).toBeFocused();
    await page.locator('.form-summary a').first().click();
    await expect(page.getByLabel('Adınız')).toBeFocused();

    await page.waitForTimeout(2800); // form çok hızlı doldurulmuş sayılmasın
    await page.getByLabel('Adınız').fill('Test Kişisi');
    await page.getByLabel('E-posta adresiniz').fill('test.kisi@example.com');
    await page.getByLabel('Konu', { exact: true }).selectOption({ index: 1 });
    await page.getByLabel('Mesajınız').fill('Merhaba, bir müzik klibi için teklif almak istiyorum. <b>test</b>');
    await page.getByRole('button', { name: 'Mesajı gönder' }).click();
    await expect(page.locator('.form-status')).toContainText('Mesajınız iletildi');
  });

  test('klavye ile atlama bağlantısı çalışır', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'İçeriğe geç' })).toBeFocused();
  });
});
