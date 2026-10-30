import { test, expect } from '@playwright/test';
import { apiLogin, login, openMore } from './helpers.js';

const ORIGIN = 'http://127.0.0.1:8788';
const TITLE = `E2E YouTube ${Date.now()}`;

test.describe('YouTube / Vimeo bağlantılı videolar', () => {
  test('geçersiz ve tehlikeli bağlantılar reddedilir', async ({ request }) => {
    const { csrf } = await apiLogin(request);
    const h = { origin: ORIGIN, 'x-csrf-token': csrf };
    const bad = [
      'javascript:alert(1)',
      'https://evil.example/watch?v=dQw4w9WgXcQ',
      'https://www.youtube.com.evil.example/watch?v=dQw4w9WgXcQ',
      'https://www.youtube.com/results?v=dQw4w9WgXcQ',
      'https://youtu.be/kisa',
      'https://vimeo.com.evil.example/123456789',
      'data:text/html,<script>alert(1)</script>',
      'x'.repeat(400),
    ];
    for (const url of bad) {
      const preview = await request.get(`/api/admin/link-preview?url=${encodeURIComponent(url)}`);
      expect(preview.status(), url).toBe(400);
      const create = await request.post('/api/admin/projects', { headers: h, data: { title: 't', category: 'reklam', video_url: url } });
      expect(create.status(), url).toBe(400);
    }
  });

  test('geçerli bağlantı biçimleri tanınır', async ({ request }) => {
    await apiLogin(request);
    const good = [
      ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube'],
      ['https://youtu.be/dQw4w9WgXcQ?si=abc', 'youtube'],
      ['https://youtube.com/shorts/dQw4w9WgXcQ', 'youtube'],
      ['https://vimeo.com/123456789', 'vimeo'],
      ['https://vimeo.com/123456789/abcdef1234', 'vimeo'],
    ];
    for (const [url, provider] of good) {
      const res = await request.get(`/api/admin/link-preview?url=${encodeURIComponent(url)}`);
      expect(res.status(), url).toBe(200);
      const body = await res.json();
      expect(body.provider).toBe(provider);
      expect(body.embed).toMatch(/^https:\/\/(www\.youtube-nocookie\.com\/embed\/|player\.vimeo\.com\/video\/)/);
    }
  });

  test('panelden bağlantı ekle, sitede göster, oynat, sil', async ({ page, request }) => {
    await login(page);
    await page.getByLabel('Video bağlantısı').fill('https://youtu.be/dQw4w9WgXcQ');
    await page.getByLabel('Video bağlantısı').blur();
    await expect(page.getByText('YouTube videosu bulundu.')).toBeVisible({ timeout: 20000 });
    await page.getByLabel('Başlık').first().fill(TITLE);
    await openMore(page);
    await page.getByLabel('Açıklama (isteğe bağlı)').fill('Bağlantıyla eklenen test videosu <b>kalın</b>');
    await page.getByRole('button', { name: 'Videoyu ekle' }).click();
    const row = page.locator('.project', { hasText: TITLE });
    await expect(row).toBeVisible({ timeout: 20000 });
    await expect(row.getByText('YouTube bağlantısı')).toBeVisible();

    const pub = await page.context().newPage();
    await pub.goto('/#calismalar');
    const card = pub.getByRole('button', { name: `${TITLE} videosunu oynat` });
    await expect(card).toBeVisible();
    await expect(card.locator('img')).toHaveAttribute('src', /^https:\/\/i\.ytimg\.com\/vi\/dQw4w9WgXcQ\//);
    await card.click();
    const dlg = pub.locator('dialog#player');
    await expect(dlg).toBeVisible();
    const frame = dlg.locator('.player-embed iframe');
    await expect(frame).toHaveAttribute('src', /^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ\?.*autoplay=1/);
    await expect(frame).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    await expect(dlg.locator('#player-desc')).toContainText('<b>kalın</b>'); // HTML çalışmaz, metin görünür
    await pub.keyboard.press('Escape');
    await expect(dlg).toBeHidden();
    await expect(dlg.locator('.player-embed iframe')).toHaveCount(0);

    await row.getByRole('button', { name: /sil$/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Sil' }).click();
    await expect(page.locator('.project', { hasText: TITLE })).toHaveCount(0);
    await pub.reload();
    await expect(pub.getByText(TITLE)).toHaveCount(0);
  });

  test('CSP yalnızca YouTube ve Vimeo çerçevelerine izin verir', async ({ request }) => {
    for (const path of ['/', '/admin/']) {
      const csp = (await request.get(path)).headers()['content-security-policy'];
      expect(csp).toContain('frame-src https://www.youtube-nocookie.com https://player.vimeo.com');
      expect(csp).not.toMatch(/frame-src[^;]*\*/);
      expect(csp).toContain("script-src 'self'");
    }
  });

  test('görsel sınırı 1 MB: büyük görsel reddedilir, küçük görsel veritabanından sunulur', async ({ request }) => {
    const { csrf } = await apiLogin(request);
    const h = { origin: ORIGIN, 'x-csrf-token': csrf, 'content-type': 'image/png' };
    const big = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]), Buffer.alloc(1.5 * 1024 * 1024)]);
    expect((await request.post('/api/admin/images?purpose=poster', { headers: h, data: big })).status()).toBe(413);

    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    const up = await request.post('/api/admin/images?purpose=poster', { headers: h, data: png });
    expect(up.status()).toBe(201);
    const { key } = await up.json();
    const served = await request.get(`/media/${key}`);
    expect(served.status()).toBe(200);
    expect(served.headers()['content-type']).toBe('image/png');
    expect(served.headers()['x-content-type-options']).toBe('nosniff');
    expect((await served.body()).length).toBe(png.length);
  });
});
