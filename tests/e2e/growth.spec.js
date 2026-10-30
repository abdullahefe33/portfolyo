import { test, expect } from '@playwright/test';
import { login, openGroup, openMore } from './helpers.js';

const BASE = 'http://127.0.0.1:8788';

test.describe('Güven, paylaşım ve arama motoru', () => {
  test('süreç bölümü görünür, yorumlar boşken bölüm yok', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Nasıl çalışıyorum', level: 2 })).toBeVisible();
    await expect(page.locator('#surec .steps li')).toHaveCount(4);
    await expect(page.locator('#referanslar')).toHaveCount(0);
  });

  test('paylaşım önizlemesi, kanonik adres ve yapılandırılmış veri', async ({ page, request }) => {
    await page.goto('/');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${BASE}/`);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', `${BASE}/og.jpg`);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
    const ld = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
    expect(ld['@graph'][0]['@type']).toBe('Person');
    expect(ld['@graph'][0].name).toBe('Mehmet Abdullah Bardakçı');

    const og = await request.get('/og.jpg');
    expect(og.status()).toBe(200);
    expect(og.headers()['content-type']).toContain('image/jpeg');
    expect((await og.body()).length).toBeLessThan(300 * 1024); // WhatsApp/Instagram için hafif

    const robots = await (await request.get('/robots.txt')).text();
    expect(robots).toContain('Disallow: /admin');
    expect(robots).toContain(`Sitemap: ${BASE}/sitemap.xml`);
    const sitemap = await (await request.get('/sitemap.xml')).text();
    expect(sitemap).toContain(`<loc>${BASE}/</loc>`);
  });

  test('mobil hızlı iletişim çubuğu: açılışta ve formda gizli, aradaki bölümlerde açık', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('/');
    const dock = page.locator('[data-dock]');
    await expect(dock).not.toHaveClass(/is-on/);
    await page.evaluate(() => document.getElementById('hizmetler').scrollIntoView());
    await expect(dock).toHaveClass(/is-on/);
    await expect(dock.getByRole('link', { name: 'Ara' })).toHaveAttribute('href', 'tel:+905467245302');
    await expect(dock.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', 'https://wa.me/905467245302');
    await page.evaluate(() => document.getElementById('iletisim').scrollIntoView());
    await expect(dock).not.toHaveClass(/is-on/);
    // Tüm bağlantılar en az 44 piksel yüksekliğinde
    await page.evaluate(() => document.getElementById('hizmetler').scrollIntoView());
    for (const a of await dock.locator('a').all()) {
      expect((await a.boundingBox()).height).toBeGreaterThanOrEqual(44);
    }
  });

  test('masaüstünde çubuk hiç görünmez', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.locator('[data-dock]')).toBeHidden();
  });

  test('panelden yorum ve rol ekle: sitede görünür, HTML çalışmaz', async ({ page }) => {
    await login(page);
    // Rolü olan bir bağlantılı proje
    await page.getByLabel('Video bağlantısı').fill('https://youtu.be/dQw4w9WgXcQ');
    await page.getByLabel('Video bağlantısı').blur();
    await page.getByLabel('Başlık').first().fill('Rol testi videosu');
    await openMore(page);
    await page.getByLabel('Bu projedeki rolüm (isteğe bağlı)').fill('Çekim, kurgu, renk');
    await page.getByRole('button', { name: 'Videoyu ekle' }).click();
    const row = page.locator('.project', { hasText: 'Rol testi videosu' });
    await expect(row).toBeVisible({ timeout: 20000 });

    // Yorum ekle
    await page.getByRole('tab', { name: 'Site içeriği' }).click();
    const card = await openGroup(page, 'Müşteri yorumları');
    await card.getByRole('button', { name: 'Yeni yorum ekle' }).click();
    const item = card.locator('.repeat-item').last();
    await item.getByLabel('Yorum', { exact: true }).fill('Çok profesyonel çalıştı. <script>window.__q=1</script>');
    await item.getByLabel('Kişi adı').fill('Test Müşteri');
    await item.getByLabel('Unvan veya şirket (isteğe bağlı)').fill('Test A.Ş.');
    const [res] = await Promise.all([
      page.waitForResponse((r) => r.url().endsWith('/api/admin/site') && r.request().method() === 'PUT'),
      page.getByRole('button', { name: 'Değişiklikleri kaydet' }).click(),
    ]);
    expect(res.status()).toBe(200);

    const pub = await page.context().newPage();
    await pub.goto('/');
    await expect(pub.getByRole('heading', { name: 'Müşteriler ne diyor', level: 2 })).toBeVisible();
    await expect(pub.locator('#referanslar .quote')).toContainText('Çok profesyonel çalıştı.');
    await expect(pub.locator('#referanslar .quote-by')).toContainText('Test Müşteri');
    expect(await pub.evaluate(() => window.__q)).toBeUndefined();
    await expect(pub.locator('.reel-role', { hasText: 'Çekim, kurgu, renk' }).first()).toBeVisible();
    await pub.getByRole('button', { name: 'Rol testi videosu videosunu oynat' }).first().click();
    await expect(pub.locator('#player-desc')).toContainText('Rolüm: Çekim, kurgu, renk.');
    const ld = JSON.parse(await pub.locator('script[type="application/ld+json"]').textContent());
    expect(ld['@graph'].some((n) => n['@type'] === 'VideoObject' && n.embedUrl?.includes('dQw4w9WgXcQ'))).toBe(true);

    // Temizlik: yorumu sil, projeyi sil
    await card.locator('.repeat-item').last().getByRole('button', { name: /sil$/ }).click();
    const [res2] = await Promise.all([
      page.waitForResponse((r) => r.url().endsWith('/api/admin/site') && r.request().method() === 'PUT'),
      page.getByRole('button', { name: 'Değişiklikleri kaydet' }).click(),
    ]);
    expect(res2.status()).toBe(200);
    await page.getByRole('tab', { name: 'Çalışmalar' }).click();
    await page.locator('.project', { hasText: 'Rol testi videosu' }).getByRole('button', { name: /sil$/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Sil' }).click();
    await expect(page.locator('.project', { hasText: 'Rol testi videosu' })).toHaveCount(0);
    await pub.reload();
    await expect(pub.locator('#referanslar')).toHaveCount(0);
  });
});
