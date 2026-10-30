// Paylaşım önizleme görselini (public/og.jpg, 1200x630) üretir.
// Önce `npm run dev` ile siteyi açın, sonra: node scripts/make-og.mjs
import { chromium } from '@playwright/test';

const base = process.argv[2] || 'http://127.0.0.1:8788';
const html = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:B;font-weight:200 800;src:url(${base}/assets/fonts/bricolage-grotesque-latin-wght-normal.woff2)}
@font-face{font-family:B;font-weight:200 800;src:url(${base}/assets/fonts/bricolage-grotesque-latin-ext-wght-normal.woff2);unicode-range:U+0100-02BA,U+1E00-1EFF}
@font-face{font-family:I;font-weight:400 700;src:url(${base}/assets/fonts/instrument-sans-latin-wght-normal.woff2)}
*{box-sizing:border-box}body{margin:0;width:1200px;height:630px;background:#f5f6f8;font-family:I,sans-serif;color:#0f1115;position:relative;overflow:hidden}
h1{position:absolute;left:72px;top:72px;margin:0;font:800 118px/0.92 B,sans-serif;letter-spacing:-0.045em}
p{position:absolute;left:76px;bottom:70px;margin:0;font:700 34px/1.2 B,sans-serif;letter-spacing:-0.02em;max-width:560px}
.tile{position:absolute;right:72px;top:72px;width:430px;height:486px;border-radius:40px;background:linear-gradient(180deg,#ffd23f 0%,#ff6a4d 46%,#3b4bff 100%);overflow:hidden}
.sun{position:absolute;left:50%;top:20%;width:34%;aspect-ratio:1;translate:-50% 0;border-radius:50%;background:#fff6d6}
.hills{position:absolute;inset:auto 0 0 0;height:38%;background:#0f1115;clip-path:polygon(0 100%,0 52%,18% 24%,34% 54%,52% 6%,70% 48%,84% 22%,100% 50%,100% 100%)}
.play{position:absolute;left:50%;top:50%;translate:-50% -50%;width:96px;height:96px;border-radius:50%;background:#fff;display:grid;place-items:center}
.play i{border-left:30px solid #0f1115;border-top:19px solid transparent;border-bottom:19px solid transparent;margin-left:8px}
.age{position:absolute;right:48px;bottom:34px;width:150px;height:150px;border-radius:50%;background:#19c48e;display:grid;place-items:center;text-align:center;box-shadow:0 0 0 8px #f5f6f8;font:800 40px/1 B;letter-spacing:-0.03em}
.age small{display:block;font:600 17px/1.15 I;letter-spacing:0;margin-top:4px;padding:0 18px}
.dot{position:absolute;right:40px;top:40px;width:124px;height:124px;border-radius:50%;background:#ffd23f;box-shadow:0 0 0 8px #f5f6f8}
</style>
<h1>Mehmet<br>Abdullah<br>Bardakçı</h1><p>Kameraman, kurgucu ve drone operatörü</p>
<div class="tile"><div class="sun"></div><div class="hills"></div><div class="play"><i></i></div></div><div class="dot"></div><div class="age"><span>Video<small>çekim ve kurgu</small></span></div>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
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
