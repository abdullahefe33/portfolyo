// Paylaşım önizleme görselini (public/og.jpg, 1200x630) üretir.
// Önce `npm run dev` ile siteyi açın, sonra: node scripts/make-og.mjs
import { chromium } from '@playwright/test';

const base = process.argv[2] || 'http://127.0.0.1:8788';
const html = `<!doctype html><html lang="tr"><meta charset="utf-8"><style>
@font-face{font-family:H;src:url(${base}/assets/fonts/just-another-hand-latin-400-normal.woff2)}
@font-face{font-family:H;src:url(${base}/assets/fonts/just-another-hand-latin-ext-400-normal.woff2);unicode-range:U+0100-02BA,U+1E00-1EFF}
@font-face{font-family:I;font-weight:400 700;src:url(${base}/assets/fonts/instrument-sans-latin-wght-normal.woff2)}
*{box-sizing:border-box}body{margin:0;width:1200px;height:630px;background:#0a0a0b;font-family:I,sans-serif;color:#f5f4f0;position:relative;overflow:hidden}
.n{position:absolute;left:72px;top:60px;font:400 56px/1 H;transform:skewX(-6deg)}
h1{position:absolute;left:72px;top:128px;margin:0;font:400 150px/0.86 H;text-transform:uppercase;transform:skewX(-7deg);transform-origin:left bottom}
p{position:absolute;left:76px;top:540px;margin:0;font:600 30px/1.2 I;color:#a6a6ad}
.s{position:absolute;left:72px;top:470px;width:420px;height:44px}
.dot{position:absolute;right:72px;top:64px;display:flex;align-items:center;gap:12px;border:2px solid rgba(255,255,255,.4);border-radius:99px;padding:10px 22px 10px 18px;font:500 26px I}
.dot i{width:16px;height:16px;border-radius:50%;background:#ffd23f}
.lens{position:absolute;right:72px;bottom:56px;width:300px;height:300px;color:rgba(255,255,255,.55)}
</style>
<div class="n">Mehmet Abdullah Bardakçı</div><h1>Fikir.<br>Kadraj.<br>Hikâye.</h1>
<svg class="s" viewBox="0 0 520 60"><path d="M6 38 C 90 14, 170 50, 260 30 S 430 16, 514 34" fill="none" stroke="#f5f4f0" stroke-width="4" stroke-linecap="round"/></svg>
<p>Kameraman, kurgucu ve drone operatörü</p>
<div class="dot"><i></i>Yeni projelere açığım</div>
<svg class="lens" viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><circle cx="100" cy="100" r="86"/><circle cx="100" cy="100" r="52"/><circle cx="100" cy="100" r="18"/><path d="M100 14 L128 62 M186 100 L136 128 M100 186 L72 138 M14 100 L64 72 M154 36 L128 62 M154 164 L136 128 M46 164 L72 138 M46 36 L64 72"/><circle cx="140" cy="60" r="5" fill="#ffd23f" stroke="none"/></svg>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.evaluate(() => Promise.all([document.fonts.load('150px H', 'İÂâ'), document.fonts.load('56px H', 'çıı'), document.fonts.load('600 30px I', 'ığç')]));
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);
await page.screenshot({ path: new URL('../public/og.jpg', import.meta.url).pathname, type: 'jpeg', quality: 86 });
// Ana ekran simgesi (180x180)
const icon = await browser.newPage({ viewport: { width: 180, height: 180 } });
await icon.setContent(`<body style="margin:0">${(await import('node:fs')).readFileSync(new URL('../public/favicon.svg', import.meta.url), 'utf8').replace('<svg ', '<svg width="180" height="180" ')}</body>`);
await icon.screenshot({ path: new URL('../public/apple-touch-icon.png', import.meta.url).pathname });
// Yönetim paneli uygulama simgeleri (ana ekrana ekleme)
for (const size of [192, 512]) {
  const pg = await browser.newPage({ viewport: { width: size, height: size } });
  await pg.setContent(`<body style="margin:0">${(await import('node:fs')).readFileSync(new URL('../public/favicon.svg', import.meta.url), 'utf8').replace('<svg ', `<svg width="${size}" height="${size}" `)}</body>`);
  await pg.screenshot({ path: new URL(`../public/admin/icon-${size}.png`, import.meta.url).pathname });
}
await browser.close();
console.log('public/og.jpg, apple-touch-icon.png ve yönetim paneli simgeleri hazır');
