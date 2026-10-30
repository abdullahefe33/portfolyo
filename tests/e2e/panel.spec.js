import { test, expect } from '@playwright/test';
import { apiLogin, freshIp, login } from './helpers.js';

const ORIGIN = 'http://127.0.0.1:8788';
const uid = () => Math.random().toString(16).slice(2, 8);

async function createProject(request, csrf, data) {
  const res = await request.post('/api/admin/projects', {
    headers: { origin: ORIGIN, 'x-csrf-token': csrf },
    data: { category: 'reklam', description: '', role: '', published: true, ...data },
  });
  expect(res.status()).toBe(201);
  const project = await res.json();
  made.push(project.id);
  return project;
}
const removeProject = (request, csrf, id) => request.delete(`/api/admin/projects/${id}`, { headers: { origin: ORIGIN, 'x-csrf-token': csrf } });

// Test sırasında oluşturulan her proje, test başarısız olsa bile silinir.
const made = [];
test.afterEach(async ({ request }) => {
  if (!made.length) return;
  const { csrf } = await apiLogin(request);
  for (const id of made.splice(0)) await removeProject(request, csrf, id);
  const list = await (await request.get('/api/admin/projects')).json();
  for (const p of list.filter((x) => /^Video \d+$/.test(x.title))) await removeProject(request, csrf, p.id); // toplu eklemenin bıraktıkları
});

test.describe('Panel kolaylıkları', () => {
  test('birden fazla bağlantı tek seferde eklenir', async ({ page, request }) => {
    const { csrf } = await apiLogin(request);
    const before = (await (await request.get('/api/admin/projects')).json()).length;
    await login(page);
    await page.getByLabel('Video bağlantısı').fill(['https://youtu.be/aaaaaaaaaaa', 'https://youtu.be/bbbbbbbbbbb', 'https://vimeo.com/123456789'].join('\n'));
    await page.getByLabel('Video bağlantısı').blur();
    await expect(page.getByText('3 bağlantı bulundu.')).toBeVisible();
    await expect(page.getByLabel('Başlık')).toBeHidden(); // toplu modda tek başlık alanı gizli
    await page.getByRole('button', { name: 'Videoyu ekle' }).click();
    await expect(page.locator('.project')).toHaveCount(before + 3, { timeout: 40000 });
    const list = await (await request.get('/api/admin/projects')).json();
    for (const p of list.slice(0, 3)) await removeProject(request, csrf, p.id);
  });

  test('kategori başlıktan tahmin edilir, elle seçilirse bozulmaz', async ({ page }) => {
    await login(page);
    const title = page.getByLabel('Başlık').first();
    const cat = page.getByLabel('Kategori').first();
    await title.fill('Emlak projesi drone çekimi');
    await expect(cat).toHaveValue('drone');
    await title.fill('Yaz sezonu reklam filmi');
    await expect(cat).toHaveValue('reklam');
    await title.fill('Şarkı için klip');
    await expect(cat).toHaveValue('muzik-klibi');
    await cat.selectOption('tanitim'); // elle seçti
    await title.fill('Bir drone videosu');
    await expect(cat).toHaveValue('tanitim');
  });

  test('yayın anahtarı: taslağa al, geri aç; ana video yap', async ({ page, request }) => {
    const { csrf } = await apiLogin(request);
    const a = await createProject(request, csrf, { title: `Birinci ${uid()}`, video_url: 'https://youtu.be/ccccccccccc' });
    const b = await createProject(request, csrf, { title: `İkinci ${uid()}`, video_url: 'https://youtu.be/ddddddddddd' });
    await login(page);
    const rowA = page.locator('.project', { hasText: a.title });

    // Taslağa al
    await rowA.getByRole('switch').uncheck();
    await expect(rowA.getByText('Taslak (gizli)')).toBeVisible();
    const pub = await page.context().newPage();
    await pub.goto('/');
    await expect(pub.getByText(a.title)).toHaveCount(0);
    await page.locator('.project', { hasText: a.title }).getByRole('switch').check();
    await expect(page.locator('.project', { hasText: a.title }).getByText('Yayında')).toBeVisible();
    await pub.reload();
    await expect(pub.getByRole('button', { name: `${a.title} videosunu oynat` }).first()).toBeVisible();

    // Ana video yap (liste sırasında ikincisi ilk olduğundan b zaten ana video; a'yı seç)
    await expect(page.locator('.project', { hasText: b.title }).locator('.badge-star')).toBeVisible();
    await page.locator('.project', { hasText: a.title }).getByRole('button', { name: 'Ana video yap' }).click();
    await expect(page.locator('.project', { hasText: a.title }).locator('.badge-star')).toBeVisible();
    await pub.reload();
    await expect(pub.locator('.hero-reel')).toHaveAttribute('aria-label', `Ana video: ${a.title}`);

    await removeProject(request, csrf, a.id);
    await removeProject(request, csrf, b.id);
  });

  test('düzenlerken video bağlantısı başka bir videoyla değiştirilir', async ({ page, request }) => {
    const { csrf } = await apiLogin(request);
    const p = await createProject(request, csrf, { title: `Bağlantı ${uid()}`, video_url: 'https://youtu.be/eeeeeeeeeee' });
    await login(page);
    const row = page.locator('.project', { hasText: p.title });
    await expect(row.getByText('YouTube bağlantısı')).toBeVisible();
    await row.getByRole('button', { name: 'Düzenle' }).click();
    await page.getByLabel('Video bağlantısını değiştir (isteğe bağlı)').fill('https://vimeo.com/987654321/abcdef1234');
    await page.getByRole('button', { name: 'Kaydet' }).click();
    await expect(page.locator('.project', { hasText: p.title }).getByText('Vimeo bağlantısı')).toBeVisible();
    const after = (await (await request.get('/api/admin/projects')).json()).find((x) => x.id === p.id);
    expect(after.provider).toBe('vimeo');
    expect(after.provider_id).toBe('987654321');
    expect(after.provider_hash).toBe('abcdef1234');
    await removeProject(request, csrf, p.id);
  });

  test('kaydedilmemiş değişiklik varken sekme değiştirmek uyarır', async ({ page }) => {
    await login(page);
    await page.getByRole('tab', { name: 'Site içeriği' }).click();
    const original = await page.getByLabel('Kısa tanıtım cümlesi').inputValue();
    await page.getByLabel('Kısa tanıtım cümlesi').fill('Geçici deneme metni');
    await expect(page.getByText('Kaydedilmemiş değişiklikler var.')).toBeVisible();

    await page.getByRole('tab', { name: 'Çalışmalar' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('kaydedilmemiş değişiklikler');
    await dialog.getByRole('button', { name: 'Vazgeç' }).click();
    await expect(page.getByRole('tab', { name: 'Site içeriği' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByLabel('Kısa tanıtım cümlesi')).toHaveValue('Geçici deneme metni');

    await page.getByRole('tab', { name: 'Çalışmalar' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Kaydetmeden çık' }).click();
    await expect(page.getByRole('tab', { name: 'Çalışmalar' })).toHaveAttribute('aria-selected', 'true');
    await page.getByRole('tab', { name: 'Site içeriği' }).click();
    await expect(page.getByLabel('Kısa tanıtım cümlesi')).toHaveValue(original); // atılan değişiklik geri gelmedi
  });

  test('mesajlar: yeni filtresi ve hepsini okundu yapma', async ({ page, request }) => {
    const { csrf } = await apiLogin(request);
    const tag = uid();
    for (const n of [1, 2]) {
      const res = await request.post('/api/contact', {
        headers: { origin: ORIGIN, 'cf-connecting-ip': freshIp() },
        data: { name: `Toplu ${tag} ${n}`, email: 'toplu@example.com', message: 'Merhaba, toplu okundu testi için mesaj.', t: Date.now() - 5000 },
      });
      expect(res.status()).toBe(200);
    }
    await login(page);
    await page.getByRole('tab', { name: /Mesajlar/ }).click();
    await page.getByRole('button', { name: /^Yeni \(/ }).click();
    await expect(page.locator('.message', { hasText: `Toplu ${tag} 1` })).toBeVisible();
    await page.getByRole('button', { name: 'Hepsini okundu yap' }).click();
    await expect(page.getByText('Okunmamış mesaj yok. Hepsini okudunuz.')).toBeVisible();
    await page.getByRole('button', { name: /^Tümü \(/ }).click();
    for (const n of [1, 2]) {
      const card = page.locator('.message', { hasText: `Toplu ${tag} ${n}` });
      await card.getByRole('button', { name: 'Sil' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Sil' }).click();
      await expect(card).toHaveCount(0);
    }
    void csrf;
  });

  test('yardım bölümü sade Türkçe ile açılır', async ({ page }) => {
    await login(page);
    await page.getByRole('tab', { name: 'Hesap' }).click();
    await expect(page.getByRole('heading', { name: /Sık sorulanlar/ })).toBeVisible();
    await page.locator('details.group').filter({ has: page.locator('.group-title', { hasText: 'ne demek' }) }).locator('summary').click();
    await expect(page.getByText('Bağlantıyı bilen herkes izler')).toBeVisible();
  });

  test('genel bakış hızlı eylemleri çalışır', async ({ page }) => {
    await login(page, { tab: 'home' });
    await expect(page.getByRole('heading', { name: 'Hoş geldiniz' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Siteyi görüntüle' })).toHaveAttribute('href', '/');
    await page.getByRole('button', { name: 'Video ekle' }).first().click();
    await expect(page.getByRole('tab', { name: 'Çalışmalar' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByLabel('Video bağlantısı')).toBeFocused();
  });

  test('telefonda sekmeler altta sabit, dokunma alanları yeterli, taşma yok', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await login(page, { tab: 'home' });
    const bar = page.locator('.tabbar');
    const box = await bar.boundingBox();
    expect(Math.round(box.y + box.height)).toBe(800); // ekranın en altına yapışık
    await expect(bar).toHaveCSS('position', 'fixed');
    for (const tab of await page.getByRole('tab').all()) expect((await tab.boundingBox()).height).toBeGreaterThanOrEqual(44);
    for (const name of ['Çalışmalar', 'Site içeriği', 'Mesajlar', 'Hesap', 'Genel bakış']) {
      await page.getByRole('tab', { name: new RegExp(name) }).click();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, name).toBeLessThanOrEqual(0);
    }
  });
});
