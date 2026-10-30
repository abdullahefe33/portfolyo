import { test, expect } from '@playwright/test';
import { HUMAN_UA, apiLogin, freshIp, login } from './helpers.js';

const ORIGIN = 'http://127.0.0.1:8788';
const uid = () => Math.random().toString(16).slice(2, 10);

async function adminStats(request) {
  const res = await request.get('/api/admin/stats');
  expect(res.status()).toBe(200);
  return res.json();
}

test.describe('İstatistikler ve Genel bakış', () => {
  test('ziyaret kaynağı sayılır, robotlar sayılmaz', async ({ request }) => {
    await apiLogin(request);
    const human = `ziyaretci${uid()}`;
    const bot = `robot${uid()}`;
    await request.get(`/?utm_source=${human}`, { headers: { 'user-agent': HUMAN_UA } });
    await request.get(`/?utm_source=${bot}`, { headers: { 'user-agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)' } });
    await request.get(`/?utm_source=${bot}x`, { headers: { 'user-agent': 'WhatsApp/2.23 A' } });
    await expect.poll(async () => (await adminStats(request)).refs.map((r) => r.label), { timeout: 10000 }).toContain(human);
    const refs = (await adminStats(request)).refs.map((r) => r.label);
    expect(refs).not.toContain(bot);
    expect(refs).not.toContain(`${bot}x`);
    expect((await adminStats(request)).views30).toBeGreaterThan(0);
  });

  test('etkinlik ucu: yalnızca bilinen etkinlikler, aynı kaynaktan, kişisel veri yok', async ({ request }) => {
    const h = { origin: ORIGIN, 'user-agent': HUMAN_UA, 'cf-connecting-ip': freshIp() };
    const ok = await request.post('/api/event', { headers: h, data: { e: 'cta', l: 'whatsapp' } });
    expect(ok.status()).toBe(202);
    expect((await request.post('/api/event', { headers: h, data: { e: 'cta', l: 'rastgele' } })).status()).toBe(400);
    expect((await request.post('/api/event', { headers: h, data: { e: 'play', l: "'; DROP TABLE stats;--" } })).status()).toBe(400);
    expect((await request.post('/api/event', { headers: h, data: { e: 'bilinmeyen', l: 'x' } })).status()).toBe(400);
    expect((await request.post('/api/event', { headers: { ...h, origin: 'https://evil.example' }, data: { e: 'cta', l: 'tel' } })).status()).toBe(403);
    // Robot sessizce yok sayılır
    expect((await request.post('/api/event', { headers: { ...h, 'user-agent': 'curl/8' }, data: { e: 'cta', l: 'tel' } })).status()).toBe(202);
    // Oran sınırı
    const ip = freshIp();
    let last = 0;
    for (let i = 0; i < 205; i++) {
      last = (await request.post('/api/event', { headers: { ...h, 'cf-connecting-ip': ip }, data: { e: 'cta', l: 'form' } })).status();
      if (last === 429) break;
    }
    expect(last).toBe(429);
  });

  test('tarayıcıdan iletişim tıklaması sayılır', async ({ browser, request }) => {
    await apiLogin(request);
    const before = (await adminStats(request)).cta.find((c) => c.label === 'tel')?.n || 0;
    const ctx = await browser.newContext({ userAgent: HUMAN_UA, extraHTTPHeaders: { 'cf-connecting-ip': freshIp() } });
    const page = await ctx.newPage();
    await page.goto('/');
    await page.getByRole('link', { name: /0546 724 53 02/ }).click({ noWaitAfter: true }).catch(() => {});
    await expect.poll(async () => (await adminStats(request)).cta.find((c) => c.label === 'tel')?.n || 0, { timeout: 10000 }).toBeGreaterThan(before);
    await ctx.close();
  });

  test('Genel bakış ekranı ve kurulum listesi', async ({ page }) => {
    await login(page, { tab: 'home' });
    await expect(page.getByRole('tab', { name: 'Genel bakış' })).toHaveAttribute('aria-selected', 'true');
    for (const t of ['Son 7 gün ziyaret', 'Son 30 gün ziyaret', 'Okunmamış mesaj', 'Yayındaki çalışma']) await expect(page.getByText(t, { exact: true })).toBeVisible();
    await expect(page.getByRole('img', { name: /Son 30 günün günlük ziyaret sayısı/ })).toBeVisible();
    await expect(page.getByLabel('Instagram için site bağlantısı')).toHaveValue(`${ORIGIN}/?utm_source=instagram`);
    await expect(page.getByText('Kurulum kontrol listesi')).toBeVisible();
    await expect(page.getByText('Mesajların e-postanıza da gelmesini kurun')).toBeVisible();
    // Telefon genişliğinde yatay kaydırma yok
    await page.setViewportSize({ width: 390, height: 800 });
    await page.reload();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('yedek indirilir ve gizli bilgi içermez', async ({ page }) => {
    await login(page, { tab: 'home' });
    await page.getByRole('tab', { name: 'Hesap' }).click();
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Yedeği indir' }).click()]);
    expect(download.suggestedFilename()).toMatch(/^portfolyo-yedek-\d{4}-\d{2}-\d{2}\.json$/);
    const path = await download.path();
    const text = (await import('node:fs')).readFileSync(path, 'utf8');
    const data = JSON.parse(text);
    expect(data.site.hero.title).toBe('Mehmet Abdullah Bardakçı');
    expect(Array.isArray(data.projects)).toBe(true);
    expect(text).not.toMatch(/pbkdf2|pw_hash|csrf|sessions/i);
  });

  test('yedek ve istatistik uçları giriş ister', async ({ request }) => {
    for (const p of ['/api/admin/export', '/api/admin/stats']) expect((await request.get(p)).status(), p).toBe(401);
  });

  test('mesaja e-posta ve WhatsApp ile yanıt düğmeleri', async ({ page, request }) => {
    const msg = `Yanıt testi ${uid()}`;
    const res = await request.post('/api/contact', {
      headers: { origin: ORIGIN, 'cf-connecting-ip': freshIp() },
      data: { name: msg, email: 'musteri@example.com', phone: '0555 111 22 33', message: 'Merhaba, bir proje için konuşmak istiyorum.', t: Date.now() - 5000 },
    });
    expect(res.status()).toBe(200);
    await login(page, { tab: 'home' });
    await page.getByRole('tab', { name: /Mesajlar/ }).click();
    const card = page.locator('.message', { hasText: msg });
    await expect(card.getByRole('link', { name: 'E-postayla yanıtla' })).toHaveAttribute('href', /^mailto:musteri@example\.com\?subject=/);
    await expect(card.getByRole('link', { name: "WhatsApp'tan yaz" })).toHaveAttribute('href', 'https://wa.me/905551112233');
    await card.getByRole('button', { name: 'Sil' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Sil' }).click();
    await expect(card).toHaveCount(0);
  });
});
