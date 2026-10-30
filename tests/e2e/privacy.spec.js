import { test, expect } from '@playwright/test';
import { apiLogin, freshIp } from './helpers.js';

test.describe('Gizlilik / KVKK sayfası', () => {
  test('sayfa açılır, e-posta içermez ve forma ile altbilgiden bağlanır', async ({ page, request }) => {
    const res = await request.get('/gizlilik');
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html).not.toContain('elifim33hira');
    expect(html).toContain('<link rel="canonical"');

    await page.goto('/');
    await expect(page.locator('.form-legal a[href="/gizlilik"]')).toHaveCount(1);
    await page.locator('footer a[href="/gizlilik"]').click();
    await expect(page.getByRole('heading', { level: 1, name: /Gizlilik ve KVKK/ })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Haklarınız' })).toBeVisible();
    await page.getByRole('link', { name: 'Ana sayfaya dön' }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('site haritasında yer alır', async ({ request }) => {
    const sitemap = await (await request.get('/sitemap.xml')).text();
    expect(sitemap).toContain('/gizlilik</loc>');
  });

  test('Search Console doğrulama kodu yalnızca güvenli karakterlerle kabul edilir', async ({ request }) => {
    const { csrf } = await apiLogin(request, freshIp());
    const site = await (await request.get('/api/admin/site')).json();
    const put = (verification) => request.put('/api/admin/site', {
      headers: { 'x-csrf-token': csrf, origin: 'http://127.0.0.1:8788' },
      data: { ...site, seo: { ...site.seo, verification } },
    });
    try {
      const bad = await (await put('"><script>alert(1)</script>')).json();
      expect(bad.seo.verification).toBe('');
      const ok = await (await put('abcDEF_123-xyz')).json();
      expect(ok.seo.verification).toBe('abcDEF_123-xyz');
      const html = await (await request.get('/')).text();
      expect(html).toContain('<meta name="google-site-verification" content="abcDEF_123-xyz">');
    } finally {
      await put('');
    }
  });
});
