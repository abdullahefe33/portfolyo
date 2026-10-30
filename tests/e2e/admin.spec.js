import { test, expect } from '@playwright/test';
import { copyFileSync, writeFileSync, appendFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fixture, login, openGroup, openMore } from './helpers.js';
import { E2E_PASS } from '../../playwright.config.js';

const TITLE = `E2E Reklam ${Date.now()}`;

// Kaydet düğmesine basar ve sunucunun gerçekten 200 döndüğünü bekler (eski başarı mesajına güvenmez).
async function saveSite(page) {
  const [res] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith('/api/admin/site') && r.request().method() === 'PUT'),
    page.getByRole('button', { name: 'Değişiklikleri kaydet' }).click(),
  ]);
  expect(res.status()).toBe(200);
}

test.describe.serial('Admin paneli', () => {
  test('yanlış parola hata gösterir, doğru parola panele alır', async ({ page }) => {
    await page.goto('/admin/');
    await page.getByLabel('Kullanıcı adı').fill('e2e');
    await page.getByLabel('Parola').fill('yanlis-parola-xyz');
    await page.getByRole('button', { name: 'Giriş yap' }).click();
    await expect(page.getByRole('alert')).toContainText('hatalı');
    await login(page);
    await expect(page.getByRole('heading', { name: 'Yeni video ekle' })).toBeVisible();
    await page.getByRole('button', { name: 'Dosya yükle' }).click();
    await expect(page.getByText('en fazla 500 MB')).toBeVisible();
  });

  test('video yükle, düzenle, yayından kaldır, sil', async ({ page, request }) => {
    await login(page);

    // --- Yükle ---
    await page.getByRole('button', { name: 'Dosya yükle' }).click();
    await page.getByLabel('Video dosyası').setInputFiles(fixture('sample.webm'));
    await expect(page.getByLabel('Başlık').first()).toHaveValue('sample');
    await page.getByLabel('Başlık').first().fill(TITLE);
    await page.getByLabel('Kategori').first().selectOption('reklam');
    await openMore(page);
    await page.getByLabel('Açıklama (isteğe bağlı)').fill('<img src=x onerror=alert(1)> Test açıklaması');
    await page.getByRole('button', { name: 'Videoyu ekle' }).click();
    const row = page.locator('.project', { hasText: TITLE });
    await expect(row).toBeVisible({ timeout: 30000 });
    await expect(row.getByText('Yayında')).toBeVisible();

    // --- Herkese açık sitede görünür ve oynatılır ---
    const pub = await page.context().newPage();
    await pub.goto('/#calismalar');
    const card = pub.getByRole('button', { name: `${TITLE} videosunu oynat` });
    await expect(card).toBeVisible();
    await card.click();
    const dlg = pub.locator('dialog#player');
    await expect(dlg).toBeVisible();
    await expect(dlg.locator('#player-desc')).toContainText('Test açıklaması');
    // Açıklamadaki HTML çalıştırılmamış, metin olarak gösterilmiş olmalı
    await expect(dlg.locator('#player-desc img')).toHaveCount(0);
    const src = await dlg.locator('video').getAttribute('src');
    expect(src).toMatch(/^\/media\/videos\/[0-9a-f-]{36}\.webm$/);
    // Range desteği (ileri-geri sarma)
    const ranged = await request.get(src, { headers: { range: 'bytes=0-99' } });
    expect(ranged.status()).toBe(206);
    expect(ranged.headers()['content-range']).toMatch(/^bytes 0-99\/\d+$/);
    expect((await ranged.body()).length).toBe(100);
    expect(ranged.headers()['content-type']).toBe('video/webm');
    expect((await request.get(src, { headers: { range: 'bytes=999999999-' } })).status()).toBe(416);
    await pub.keyboard.press('Escape');
    await expect(dlg).toBeHidden();

    // --- Düzenle ---
    await row.getByRole('button', { name: 'Düzenle' }).click();
    const edit = page.locator('.edit');
    await edit.getByLabel('Başlık').fill(`${TITLE} (düzenlendi)`);
    await edit.getByLabel('Kategori').selectOption('tanitim');
    await edit.getByLabel('Sitede yayınla').uncheck();
    await edit.getByRole('button', { name: 'Kaydet' }).click();
    const edited = page.locator('.project', { hasText: `${TITLE} (düzenlendi)` });
    await expect(edited).toBeVisible();
    await expect(edited.getByText('Taslak (gizli)')).toBeVisible();

    // Taslak, herkese açık sitede görünmez
    await pub.reload();
    await expect(pub.getByText(`${TITLE} (düzenlendi)`)).toHaveCount(0);

    // --- Sil ---
    await edited.getByRole('button', { name: /sil$/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Sil' }).click();
    await expect(page.locator('.project', { hasText: TITLE })).toHaveCount(0);
    expect((await request.get(src)).status()).toBe(404); // R2'den de silindi
  });

  test('9 MB üzeri dosya parçalı (multipart) yüklenir', async ({ page }) => {
    const dir = mkdtempSync(join(tmpdir(), 'e2e-'));
    const big = join(dir, 'buyuk.webm');
    copyFileSync(fixture('sample.webm'), big);
    appendFileSync(big, Buffer.alloc(9 * 1024 * 1024)); // 2 parça (8 MB + kalan)
    await login(page);
    await page.getByRole('button', { name: 'Dosya yükle' }).click();
    await page.getByLabel('Video dosyası').setInputFiles(big);
    await page.getByLabel('Başlık').first().fill('Büyük dosya testi');
    let partCalls = 0;
    page.on('request', (r) => /\/parts\/\d+$/.test(r.url()) && partCalls++);
    await page.getByRole('button', { name: 'Videoyu ekle' }).click();
    const row = page.locator('.project', { hasText: 'Büyük dosya testi' });
    await expect(row).toBeVisible({ timeout: 60000 });
    expect(partCalls).toBe(2);
    await row.getByRole('button', { name: /sil$/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Sil' }).click();
    await expect(row).toHaveCount(0);
  });

  test('sınırı aşan dosya yüklenmeden reddedilir', async ({ page }) => {
    const dir = mkdtempSync(join(tmpdir(), 'e2e-'));
    const f = join(dir, 'dev.mp4');
    writeFileSync(f, Buffer.alloc(0));
    await login(page);
    // Sınırı sahte bir yapılandırma ile 1 MB'a indirip arayüz denetimini sınar
    await page.route('**/api/admin/config', async (route) => {
      const res = await route.fetch();
      const body = await res.json();
      await route.fulfill({ response: res, json: { ...body, maxVideoBytes: 1024 * 1024 } });
    });
    await page.reload();
    await page.getByRole('tab', { name: 'Çalışmalar' }).click();
    const big = join(dir, 'yarim-mb-ustu.webm');
    copyFileSync(fixture('sample.webm'), big);
    appendFileSync(big, Buffer.alloc(2 * 1024 * 1024));
    await page.getByRole('button', { name: 'Dosya yükle' }).click();
    await page.getByLabel('Video dosyası').setInputFiles(big);
    await expect(page.locator('.msg[data-state="error"]').first()).toContainText('En fazla 1 MB');
  });

  test('site içeriği düzenlenir ve ana sayfaya yansır; doğum tarihi yaşı değiştirir', async ({ page }) => {
    await login(page);
    await page.getByRole('tab', { name: 'Site içeriği' }).click();
    const tagline = 'E2E: yeni alt başlık metni';
    await page.getByLabel('Kısa tanıtım cümlesi').fill(tagline);
    await expect(page.getByText('Kaydedilmemiş değişiklikler var.')).toBeVisible();
    await openGroup(page, 'Hakkımda');
    await page.getByLabel('Doğum tarihi').fill('2000-01-01');
    const services = await openGroup(page, 'Hizmetler');
    await services.getByRole('button', { name: 'Yeni hizmet ekle' }).click();
    const items = services.locator('.repeat-item').last();
    await items.getByLabel('Başlık').fill('E2E Yeni Hizmet');
    await items.getByLabel('Açıklama').fill('<script>window.__xss=1</script> açıklama');
    await saveSite(page);
    await expect(page.getByText('Her şey kayıtlı.')).toBeVisible();

    const pub = await page.context().newPage();
    await pub.goto('/');
    await expect(pub.getByText(tagline)).toBeVisible();
    await expect(pub.getByRole('heading', { name: 'E2E Yeni Hizmet', level: 3 })).toBeVisible();
    expect(await pub.evaluate(() => window.__xss)).toBeUndefined();
    const age = Number(await pub.locator('[data-age]').textContent());
    expect(age).toBeGreaterThan(24);

    // Geri al
    await page.getByLabel('Doğum tarihi').fill('2004-05-16');
    await page.getByLabel('Kısa tanıtım cümlesi').fill('Fikri sahneye, sahneyi son kareye taşıyorum. Çekim, kurgu ve renk tek elden.');
    await page.locator('details.group').filter({ has: page.locator('.group-title', { hasText: /^Hizmetler$/ }) }).locator('.repeat-item').last().getByRole('button', { name: /sil$/ }).click();
    await saveSite(page);

    await pub.reload();
    await expect(pub.getByText(tagline)).toHaveCount(0);
    expect(Number(await pub.locator('[data-age]').textContent())).toBeLessThan(25); // 2004 doğumlu: 2000 doğumlu (26) değil
  });

  test('iletişim mesajı admin panelinde görünür ve XSS çalışmaz', async ({ page }) => {
    const pub = await page.context().newPage();
    await pub.goto('/#iletisim');
    await pub.waitForTimeout(2800);
    await pub.getByLabel('Adınız').fill('<img src=x onerror=window.__pwn=1>Ziyaretçi');
    await pub.getByLabel('E-posta adresiniz').fill('ziyaretci@example.com');
    await pub.getByLabel('Mesajınız').fill('Klip çekimi için fiyat öğrenmek istiyorum. <script>window.__pwn=1</script>');
    await pub.getByRole('button', { name: 'Mesajı gönder' }).click();
    await expect(pub.locator('.form-status')).toContainText('iletildi');

    await login(page);
    await page.getByRole('tab', { name: /Mesajlar/ }).click();
    const msg = page.locator('.message', { hasText: 'fiyat öğrenmek' }).first();
    await expect(msg).toBeVisible();
    await expect(msg.locator('img')).toHaveCount(0);
    expect(await page.evaluate(() => window.__pwn)).toBeUndefined();
    await expect(msg).toContainText('<img src=x');
    await msg.getByRole('button', { name: 'Sil' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Sil' }).click();
    await expect(msg).toHaveCount(0);
  });

  test('parola değiştirilir ve eski parola geçersiz olur', async ({ page, request }) => {
    await login(page);
    await page.getByRole('tab', { name: 'Hesap' }).click();
    const NEW = 'Yeni-E2E-Parola-99';
    await page.getByLabel('Mevcut parola').fill(E2E_PASS);
    await page.getByLabel('Yeni parola').fill(NEW);
    await page.getByRole('button', { name: 'Parolayı güncelle' }).click();
    await expect(page.locator('.msg[data-state="ok"]')).toContainText('güncellendi');

    const oldLogin = await request.post('/api/auth/login', { headers: { origin: 'http://127.0.0.1:8788', 'cf-connecting-ip': '10.77.0.1' }, data: { username: 'e2e', password: E2E_PASS } });
    expect(oldLogin.status()).toBe(401);

    // Eski parolaya geri dön
    await page.getByLabel('Mevcut parola').fill(NEW);
    await page.getByLabel('Yeni parola').fill(E2E_PASS);
    await page.getByRole('button', { name: 'Parolayı güncelle' }).click();
    await expect(page.locator('.msg[data-state="ok"]')).toContainText('güncellendi');
  });

  test('çıkış yapınca panel kapanır', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Çıkış yap' }).click();
    await expect(page.getByRole('button', { name: 'Giriş yap' })).toBeVisible();
    await page.goto('/admin/');
    await expect(page.getByRole('button', { name: 'Giriş yap' })).toBeVisible();
  });
});
