import { test, expect } from '@playwright/test';
import { HUMAN_UA, apiLogin, freshIp } from './helpers.js';

const ORIGIN = 'http://127.0.0.1:8788';

test.describe('404, simge, WhatsApp, canlı önizleme, yanıt notu', () => {
  test('özel 404 sayfası 404 kodu ve noindex ile gelir', async ({ request, page }) => {
    const res = await request.get('/olmayan-bir-sayfa');
    expect(res.status()).toBe(404);
    const html = await res.text();
    expect(html).toContain('Bu sayfa kadrajdan çıktı');
    expect(html).toContain('noindex');
    await page.goto('/olmayan-bir-sayfa');
    await expect(page.getByRole('heading', { name: 'Bu sayfa kadrajdan çıktı' })).toBeVisible();
    await page.getByRole('link', { name: 'Ana sayfaya dön' }).click();
    await expect(page).toHaveURL(`${ORIGIN}/`);
  });

  test('simgeler sunulur', async ({ request }) => {
    expect((await request.get('/favicon.svg')).headers()['content-type']).toContain('svg');
    const touch = await request.get('/apple-touch-icon.png');
    expect(touch.status()).toBe(200);
    expect(touch.headers()['content-type']).toContain('png');
  });

  test('WhatsApp bağlantıları hazır mesajla açılır', async ({ page }) => {
    await page.goto('/');
    const links = page.locator('a[href^="https://wa.me/905467245302"]');
    await expect(links).toHaveCount(2); // iletişim bölümü + mobil çubuk
    for (const a of await links.all()) await expect(a).toHaveAttribute('href', /\?text=Merhaba%2C%20web%20sitenizden%20yaz%C4%B1yorum\.$/);
  });

  test('yanıt süresi notu: boşken yok, doluyken formun altında', async ({ page, request }) => {
    const { csrf } = await apiLogin(request);
    const h = { origin: ORIGIN, 'x-csrf-token': csrf };
    const site = await (await request.get('/api/admin/site')).json();
    await page.goto('/');
    await expect(page.locator('.form-note')).toHaveCount(0);
    site.contact.response = 'Genellikle bir iş günü içinde dönüş yaparım. <b>x</b>';
    expect((await request.put('/api/admin/site', { headers: h, data: site })).status()).toBe(200);
    try {
      await page.reload();
      await expect(page.locator('.form-note')).toHaveText('Genellikle bir iş günü içinde dönüş yaparım. <b>x</b>'); // HTML çalışmaz
    } finally {
      site.contact.response = '';
      await request.put('/api/admin/site', { headers: h, data: site });
    }
  });

  test('ana video YouTube ise geniş ekranda sessiz canlı önizleme yüklenir', async ({ browser, request }) => {
    const { csrf } = await apiLogin(request);
    const created = await request.post('/api/admin/projects', {
      headers: { origin: ORIGIN, 'x-csrf-token': csrf },
      data: { title: 'Canlı önizleme testi', category: 'reklam', published: true, video_url: 'https://youtu.be/dQw4w9WgXcQ' },
    });
    const { id } = await created.json();
    const open = async (opts, viewport) => {
      const ctx = await browser.newContext({ userAgent: HUMAN_UA, viewport, extraHTTPHeaders: { 'cf-connecting-ip': freshIp() }, ...opts });
      const page = await ctx.newPage();
      await page.route('https://www.youtube-nocookie.com/**', (r) => r.fulfill({ contentType: 'text/html', body: '<body style="margin:0;background:#222"></body>' }));
      await page.goto('/');
      return { ctx, page };
    };
    try {
      const wide = await open({}, { width: 1440, height: 900 });
      const frame = wide.page.locator('.hero-embed');
      await expect(frame).toHaveAttribute('src', /^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ\?autoplay=1&mute=1&controls=0&loop=1&playlist=dQw4w9WgXcQ/, { timeout: 10000 });
      await expect(frame).toHaveAttribute('aria-hidden', 'true');
      await expect(frame).toHaveCSS('pointer-events', 'none');
      await expect(wide.page.locator('.hero-reel')).toHaveAttribute('data-embed', /youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/);
      await wide.ctx.close();

      const phone = await open({}, { width: 390, height: 800 });
      await phone.page.waitForTimeout(2500);
      await expect(phone.page.locator('.hero-embed')).toHaveCount(0); // telefonda veri harcamaz
      await phone.ctx.close();

      const calm = await open({ reducedMotion: 'reduce' }, { width: 1440, height: 900 });
      await calm.page.waitForTimeout(2500);
      await expect(calm.page.locator('.hero-embed')).toHaveCount(0); // hareket azaltma tercihi
      await calm.ctx.close();
    } finally {
      await request.delete(`/api/admin/projects/${id}`, { headers: { origin: ORIGIN, 'x-csrf-token': csrf } });
    }
  });
});
