// Tarayıcı gerektirmeyen saf mantık testleri.
import { test, expect } from '@playwright/test';
import { parseVideoUrl, embedUrl, fetchOembed, safeThumb } from '../../lib/embed.js';
import { isBot, sourceLabel, dayKey } from '../../lib/stats.js';
import { ageFrom, sanitizeSite, DEFAULT_SITE } from '../../lib/content.js';
import { esc } from '../../lib/render.js';

test.describe('bağlantı ayrıştırma', () => {
  test('geçerli YouTube ve Vimeo biçimleri', () => {
    expect(parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s')).toMatchObject({ provider: 'youtube', id: 'dQw4w9WgXcQ' });
    expect(parseVideoUrl('https://m.youtube.com/watch?v=dQw4w9WgXcQ')).toMatchObject({ provider: 'youtube' });
    expect(parseVideoUrl('https://youtu.be/dQw4w9WgXcQ?si=x')).toMatchObject({ id: 'dQw4w9WgXcQ' });
    expect(parseVideoUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toMatchObject({ id: 'dQw4w9WgXcQ' });
    expect(parseVideoUrl('https://vimeo.com/123456789/abcdef1234')).toEqual({ provider: 'vimeo', id: '123456789', hash: 'abcdef1234' });
    expect(parseVideoUrl('https://player.vimeo.com/video/123456789?h=abcdef1234')).toEqual({ provider: 'vimeo', id: '123456789', hash: 'abcdef1234' });
  });
  test('sahte ve tehlikeli adresler reddedilir', () => {
    for (const bad of ['javascript:alert(1)', 'https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ', 'https://evil.example/https://youtu.be/dQw4w9WgXcQ',
      'https://youtube.com/results?v=dQw4w9WgXcQ', 'https://youtu.be/', 'https://vimeo.com/abc', 'ftp://youtu.be/dQw4w9WgXcQ', '', null, 42, 'x'.repeat(500)]) {
      expect(parseVideoUrl(bad), String(bad).slice(0, 40)).toBeNull();
    }
  });
  test('gömme adresi yalnızca doğrulanmış kimlikten kurulur', () => {
    expect(embedUrl({ provider: 'youtube', id: 'dQw4w9WgXcQ' })).toMatch(/^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ\?/);
    expect(embedUrl({ provider: 'youtube', id: '"><script>' })).toBe('');
    expect(embedUrl({ provider: 'vimeo', id: '123', hash: '' })).toBe('');
    expect(embedUrl({ provider: 'x', id: 'dQw4w9WgXcQ' })).toBe('');
  });
  test('küçük resim yalnızca izinli sunuculardan', () => {
    expect(safeThumb('https://i.ytimg.com/vi/x/hqdefault.jpg')).toContain('ytimg');
    expect(safeThumb('https://evil.example/a.jpg')).toBe('');
    expect(safeThumb('http://i.ytimg.com/x.jpg')).toBe('');
    expect(safeThumb('javascript:alert(1)')).toBe('');
  });
});

test.describe('oEmbed', () => {
  const real = globalThis.fetch;
  test.afterEach(() => { globalThis.fetch = real; });
  const p = { provider: 'youtube', id: 'dQw4w9WgXcQ', hash: '' };

  test('gizli/silinmiş video engellenmiş sayılır', async () => {
    for (const status of [401, 403, 404]) {
      globalThis.fetch = async () => new Response('{}', { status });
      expect(await fetchOembed(p)).toMatchObject({ blocked: true });
    }
  });
  test('ağ hatasında null döner (engelli sanılmaz)', async () => {
    globalThis.fetch = async () => { throw new Error('ağ yok'); };
    expect(await fetchOembed(p)).toBeNull();
    globalThis.fetch = async () => new Response('{}', { status: 500 });
    expect(await fetchOembed(p)).toBeNull();
  });
  test('başlık temizlenir, kötü küçük resim atılır', async () => {
    globalThis.fetch = async () => new Response(JSON.stringify({ title: `Güzel\u0000 video ${'x'.repeat(300)}`, thumbnail_url: 'https://evil.example/t.jpg' }), { status: 200 });
    const info = await fetchOembed(p);
    expect(info.title.length).toBeLessThanOrEqual(120);
    expect(info.title).not.toContain('\u0000');
    expect(info.thumbnail).toBe('');
  });
});

test.describe('istatistik yardımcıları', () => {
  test('robotlar ayıklanır', () => {
    for (const ua of ['Googlebot/2.1', 'WhatsApp/2.23', 'facebookexternalhit/1.1', 'curl/8.4', 'HeadlessChrome', '', null]) expect(isBot(ua), String(ua)).toBe(true);
    expect(isBot('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1')).toBe(false);
  });
  const req = (url, referer) => new Request(url, { headers: referer ? { referer } : {} });
  test('kaynak etiketi: utm, bilinen siteler, doğrudan, kendi sitemiz', () => {
    expect(sourceLabel(req('https://site.pages.dev/?utm_source=Instagram'))).toBe('instagram');
    expect(sourceLabel(req('https://site.pages.dev/?utm_source=<script>'))).toBe('(doğrudan)');
    expect(sourceLabel(req('https://site.pages.dev/', 'https://l.instagram.com/?u=x'))).toBe('Instagram');
    expect(sourceLabel(req('https://site.pages.dev/', 'https://www.google.com.tr/search?q=a'))).toBe('Google');
    expect(sourceLabel(req('https://site.pages.dev/', 'https://blog.ornek.com/yazi'))).toBe('blog.ornek.com');
    expect(sourceLabel(req('https://site.pages.dev/'))).toBe('(doğrudan)');
    expect(sourceLabel(req('https://site.pages.dev/', 'https://site.pages.dev/'))).toBeNull(); // kendi sayfa yenilemesi
    expect(sourceLabel(req('https://site.pages.dev/', 'not a url'))).toBe('(doğrudan)');
  });
  test('gün anahtarı Türkiye saatine göre', () => {
    expect(dayKey(new Date('2026-05-15T21:30:00Z'))).toBe('2026-05-16'); // 00:30 Türkiye
    expect(dayKey(new Date('2026-05-15T20:59:00Z'))).toBe('2026-05-15');
  });
});

test.describe('yaş hesabı (Türkiye saatiyle, doğum 2004-05-16)', () => {
  test('doğum günü öncesi, günü ve sonrası', () => {
    expect(ageFrom('2004-05-16', new Date('2026-05-15T12:00:00Z'))).toBe(21);
    expect(ageFrom('2004-05-16', new Date('2026-05-16T12:00:00Z'))).toBe(22);
    expect(ageFrom('2004-05-16', new Date('2026-12-31T12:00:00Z'))).toBe(22);
    expect(ageFrom('2004-05-16', new Date('2026-05-15T21:10:00Z'))).toBe(22); // Türkiye'de 16 Mayıs 00:10
    expect(ageFrom('2004-05-16', new Date('2026-05-15T20:50:00Z'))).toBe(21);
  });
});

test.describe('içerik temizleme', () => {
  test('uzunluk sınırı, kontrol karakteri ve geçersiz alanlar', () => {
    const dirty = structuredClone(DEFAULT_SITE);
    dirty.hero.title = `Ad\u0000\u0007 Soyad ${'a'.repeat(500)}`;
    dirty.about.birth_date = 'yarın';
    dirty.about.photo = '../../etc/passwd';
    dirty.hero.showreel_project_id = 'x';
    dirty.contact.instagram = '@bad name!';
    dirty.contact.phone = 'abc';
    dirty.testimonials = [{ quote: 'Harika', name: 'Ali', role: 'A.Ş.' }, { quote: 'Adı yok', name: '' }, { quote: '', name: 'Quote yok' }];
    dirty.services = Array.from({ length: 30 }, (_, i) => ({ title: `H${i}`, text: 't' }));
    const clean = sanitizeSite(dirty);
    expect(clean.hero.title.length).toBeLessThanOrEqual(120);
    expect(clean.hero.title).not.toMatch(/[\u0000-\u001F]/);
    expect(clean.about.birth_date).toBe(DEFAULT_SITE.about.birth_date);
    expect(clean.about.photo).toBe('');
    expect(clean.hero.showreel_project_id).toBe('');
    expect(clean.contact.instagram).toBe(DEFAULT_SITE.contact.instagram);
    expect(clean.contact.phone).toBe(DEFAULT_SITE.contact.phone);
    expect(clean.testimonials).toEqual([{ quote: 'Harika', name: 'Ali', role: 'A.Ş.' }]);
    expect(clean.services.length).toBe(12);
  });
  test('HTML kaçışı', () => {
    expect(esc('<img src=x onerror="a()">&\'')).toBe('&lt;img src=x onerror=&quot;a()&quot;&gt;&amp;&#39;');
  });
});
