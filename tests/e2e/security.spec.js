import { test, expect } from '@playwright/test';
import { apiLogin, freshIp } from './helpers.js';
import { E2E_USER } from '../../playwright.config.js';

const ORIGIN = 'http://127.0.0.1:8788';

test.describe('Güvenlik (OWASP)', () => {
  test('kimliksiz kullanıcı hiçbir yönetici API ucuna erişemez (Broken Access Control)', async ({ request }) => {
    const gets = ['/api/admin/projects', '/api/admin/site', '/api/admin/messages', '/api/admin/config'];
    for (const p of gets) expect((await request.get(p)).status(), p).toBe(401);
    const writes = [
      ['post', '/api/admin/projects'], ['put', '/api/admin/site'], ['post', '/api/admin/uploads'],
      ['post', '/api/admin/images'], ['post', '/api/admin/password'], ['delete', '/api/admin/messages/00000000-0000-0000-0000-000000000000'],
    ];
    for (const [m, p] of writes) {
      const res = await request[m](p, { headers: { origin: ORIGIN }, data: {} });
      expect(res.status(), `${m} ${p}`).toBe(401);
    }
  });

  test('yanlış giriş genel hata verir, kullanıcı adı sızdırmaz; 5 hatadan sonra kilitlenir', async ({ request }) => {
    const ip = freshIp();
    const attempt = (username, password) =>
      request.post('/api/auth/login', { headers: { origin: ORIGIN, 'cf-connecting-ip': ip }, data: { username, password } });

    const wrongUser = await attempt('yok-boyle-biri', 'x'.repeat(14));
    const wrongPass = await attempt(E2E_USER, 'x'.repeat(14));
    expect(wrongUser.status()).toBe(401);
    expect(wrongPass.status()).toBe(401);
    expect(await wrongUser.json()).toEqual(await wrongPass.json());

    for (let i = 0; i < 3; i++) await attempt(E2E_USER, 'yanlis-parola-1');
    const locked = await attempt(E2E_USER, 'yanlis-parola-1');
    expect(locked.status()).toBe(429);
    expect(Number(locked.headers()['retry-after'])).toBeGreaterThan(0);
    // Doğru parola bile kilitliyken kabul edilmez.
    const { E2E_PASS } = await import('../../playwright.config.js');
    expect((await attempt(E2E_USER, E2E_PASS)).status()).toBe(429);
  });

  test('başka kaynaktan gelen giriş ve yazma istekleri reddedilir (CSRF)', async ({ request }) => {
    const evil = await request.post('/api/auth/login', {
      headers: { origin: 'https://evil.example', 'cf-connecting-ip': freshIp() },
      data: { username: E2E_USER, password: 'x'.repeat(14) },
    });
    expect(evil.status()).toBe(403);

    const { csrf, res } = await apiLogin(request);
    expect(res.status()).toBe(200);
    // Oturum var ama CSRF belirteci yok -> 403
    expect((await request.put('/api/admin/site', { headers: { origin: ORIGIN }, data: {} })).status()).toBe(403);
    // Yanlış belirteç -> 403
    expect((await request.put('/api/admin/site', { headers: { origin: ORIGIN, 'x-csrf-token': 'yanlis' }, data: {} })).status()).toBe(403);
    // Başka Origin + doğru belirteç -> 403
    expect((await request.put('/api/admin/site', { headers: { origin: 'https://evil.example', 'x-csrf-token': csrf }, data: {} })).status()).toBe(403);
  });

  test('oturum çerezi HttpOnly ve SameSite=Strict', async ({ request }) => {
    const { res } = await apiLogin(request);
    const cookie = res.headers()['set-cookie'];
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(cookie).toMatch(/Path=\//);
  });

  test('çıkış yapınca oturum sunucuda da geçersiz olur', async ({ request }) => {
    const { csrf } = await apiLogin(request);
    expect((await request.get('/api/admin/config')).status()).toBe(200);
    await request.post('/api/auth/logout', { headers: { origin: ORIGIN, 'x-csrf-token': csrf } });
    expect((await request.get('/api/admin/config')).status()).toBe(401);
  });

  test('dosya doğrulaması: sahte uzantı, SVG ve yol gezintisi engellenir', async ({ request }) => {
    const { csrf } = await apiLogin(request);
    const h = { origin: ORIGIN, 'x-csrf-token': csrf };

    // Uzantı mp4 ama içerik metin -> ilk parçada reddedilir
    const init = await request.post('/api/admin/uploads', { headers: h, data: { name: 'sahte.mp4', size: 64 } });
    expect(init.status()).toBe(201);
    const { id } = await init.json();
    const part = await request.put(`/api/admin/uploads/${id}/parts/1`, { headers: { ...h, 'content-type': 'application/octet-stream' }, data: Buffer.from('<script>alert(1)</script> bu bir video degil') });
    expect(part.status()).toBe(415);
    await request.delete(`/api/admin/uploads/${id}`, { headers: h });

    // İzin verilmeyen uzantı
    expect((await request.post('/api/admin/uploads', { headers: h, data: { name: 'x.exe', size: 64 } })).status()).toBe(400);
    // Sınırı aşan boyut
    const big = await request.post('/api/admin/uploads', { headers: h, data: { name: 'x.mp4', size: 501 * 1024 * 1024 } });
    expect(big.status()).toBe(413);

    // SVG (XSS taşıyabilir) görsel olarak kabul edilmez
    const svg = await request.post('/api/admin/images?purpose=poster', { headers: { ...h, 'content-type': 'image/svg+xml' }, data: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>') });
    expect(svg.status()).toBe(415);

    // Projeye rastgele R2 anahtarı bağlanamaz
    const forged = await request.post('/api/admin/projects', { headers: h, data: { title: 't', category: 'reklam', video_key: 'videos/00000000-0000-0000-0000-000000000000.mp4' } });
    expect(forged.status()).toBe(400);

    // Medya yolu gezintisi / geçersiz anahtarlar
    for (const p of ['/media/../wrangler.toml', '/media/videos/..%2f..%2fsecret', '/media/videos/abc.mp4', '/media/other/00000000-0000-0000-0000-000000000000.mp4']) {
      expect((await request.get(p)).status(), p).toBe(404);
    }
  });

  test('iletişim formu: bot tuzağı, enjeksiyon ve oran sınırı', async ({ request }) => {
    const ip = freshIp();
    const send = (data) => request.post('/api/contact', { headers: { origin: ORIGIN, 'cf-connecting-ip': ip }, data: { t: Date.now() - 5000, ...data } });
    const valid = { name: 'Ali', email: 'ali@example.com', message: 'Merhaba, bir teklif istiyorum.' };

    expect((await send({ ...valid, email: 'ali@example.com\r\nBcc: hedef@example.com' })).status()).toBe(400);
    expect((await send({ ...valid, email: 'bozuk' })).status()).toBe(400);
    expect((await send({ ...valid, message: 'kısa' })).status()).toBe(400);
    expect((await send({ ...valid, website: 'http://spam.example' })).status()).toBe(200); // sessizce yok sayılır
    const tooFast = await request.post('/api/contact', { headers: { origin: ORIGIN, 'cf-connecting-ip': ip }, data: { ...valid, t: Date.now() } });
    expect(tooFast.status()).toBe(200);

    // Yalnızca geçerli istekler sayılır: 5 başarılı gönderimden sonra 429
    for (let i = 0; i < 5; i++) expect((await send(valid)).status()).toBe(200);
    expect((await send(valid)).status()).toBe(429);
    // Başka kaynaktan istek
    const cross = await request.post('/api/contact', { headers: { origin: 'https://evil.example', 'cf-connecting-ip': freshIp() }, data: { ...valid, t: Date.now() - 5000 } });
    expect(cross.status()).toBe(403);
  });
});
