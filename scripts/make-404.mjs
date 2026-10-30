// "Sayfa bulunamadı" sayfasını (public/404.html) üretir: node scripts/make-404.mjs
// Cloudflare Pages, eşleşmeyen adreslerde bu dosyayı 404 koduyla sunar.
import { writeFileSync } from 'node:fs';
import { cloudArt, droneArt, sparkleArt } from '../lib/art.js';

const html = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#F5F6F8">
<title>Sayfa bulunamadı</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/site.css">
<link rel="stylesheet" href="/assets/art.css">
</head>
<body>
<main class="lost">
  <span class="lost-cloud l1">${cloudArt()}</span><span class="lost-cloud l2">${cloudArt()}</span>
  <span class="lost-spark">${sparkleArt('lemon')}</span>
  <div class="lost-drone">${droneArt()}</div>
  <h1>Bu sayfa kadrajdan çıktı</h1>
  <p>Aradığınız sayfa yok ya da taşınmış olabilir. Dron da onu arıyor.</p>
  <a class="btn btn-cobalt" href="/">Ana sayfaya dön</a>
</main>
<script src="/assets/lost.js" defer></script>
</body>
</html>
`;

writeFileSync(new URL('../public/404.html', import.meta.url), html);
console.log('public/404.html hazır');
