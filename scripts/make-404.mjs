// "Sayfa bulunamadı" sayfasını (public/404.html) üretir: node scripts/make-404.mjs
// Cloudflare Pages, eşleşmeyen adreslerde bu dosyayı 404 koduyla sunar.
import { writeFileSync } from 'node:fs';
import { lensArt } from '../lib/art.js';

const html = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#0A0A0B">
<meta name="color-scheme" content="dark">
<title>Sayfa bulunamadı</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/site.css">
</head>
<body>
<main class="lost">
  ${lensArt()}
  <h1>Bu sayfa kadrajdan çıktı</h1>
  <p>Aradığınız sayfa yok ya da taşınmış olabilir.</p>
  <a class="btn btn-solid" href="/">Ana sayfaya dön</a>
</main>
</body>
</html>
`;

writeFileSync(new URL('../public/404.html', import.meta.url), html);
console.log('public/404.html hazır');
