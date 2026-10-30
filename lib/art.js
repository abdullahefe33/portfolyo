// Elle çizilmiş çizgi süsler (tek renk, kalın fırça çizgisi). Renk ve çizilme hareketi public/assets/site.css'ten gelir.
// Hepsi süs olduğu için ekran okuyuculardan gizlidir.

const svg = (cls, viewBox, body) =>
  `<svg class="doodle ${cls}" viewBox="${viewBox}" aria-hidden="true" focusable="false">${body}</svg>`;

// Başlığın altına çekilen el yazısı çizgi (üç farklı fırça darbesi). pathLength=1: çizilme animasyonu için.
const SCRIBBLES = [
  'M4 22 C 60 8, 130 30, 200 14 S 320 8, 396 18',
  'M4 16 C 80 30, 150 4, 230 20 S 340 26, 396 10 M30 30 C 120 36, 230 30, 330 34',
  'M6 20 C 70 10, 120 28, 190 18 S 300 14, 394 22',
];
export const scribbleArt = (n = 0) =>
  svg('scribble', '0 0 400 40', `<path class="stroke" pathLength="1" d="${SCRIBBLES[n % SCRIBBLES.length]}"/>`);

// Hero başlığın altındaki belirgin çizgi
export const swooshArt = () =>
  svg('swoosh', '0 0 520 60', '<path class="stroke" pathLength="1" d="M6 38 C 90 14, 170 50, 260 30 S 430 16, 514 34"/><path class="stroke s2" pathLength="1" d="M60 50 C 160 36, 300 54, 420 42"/>');

// El çizimi ok (bağlantılar için)
export const arrowArt = () =>
  `<svg class="doodle arrow" viewBox="0 0 48 24" aria-hidden="true" focusable="false"><path class="stroke" pathLength="1" d="M3 13 C 14 9, 28 14, 43 11 M34 3 C 38 7, 41 9, 44 11 C 41 14, 38 17, 33 21"/></svg>`;

// Yıldız / parıltı karalaması
export const sparkArt = () =>
  `<svg class="doodle spark" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><path class="stroke" pathLength="1" d="M20 3 L22 17 L37 20 L22 23 L20 37 L18 23 L3 20 L18 17 Z"/></svg>`;

// Kamera merceği: video yokken ve fotoğraf yokken görünen çizgi çizim
export const lensArt = () => `<svg class="doodle lens" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
  <circle class="stroke" pathLength="1" cx="100" cy="100" r="86"/>
  <circle class="stroke" pathLength="1" cx="100" cy="100" r="52"/>
  <circle class="stroke" pathLength="1" cx="100" cy="100" r="18"/>
  <path class="stroke" pathLength="1" d="M100 14 L128 62 M186 100 L136 128 M100 186 L72 138 M14 100 L64 72 M154 36 L128 62 M154 164 L136 128 M46 164 L72 138 M46 36 L64 72"/>
  <circle class="dot" cx="140" cy="60" r="5"/>
</svg>`;

// Kâğıt uçak (mesaj gönderilince uçar)
export const planeArt = () => `<svg class="doodle plane" viewBox="0 0 120 80" aria-hidden="true" focusable="false">
  <path class="line" d="M6 38 L112 6 L82 74 L58 50 Z M58 50 L112 6 M58 50 L56 70 L70 58"/>
</svg>`;

// Süreç adımları ve hizmetler için numara yerine küçük çizgi simgeleri kullanılmaz; sade numara yeterli.
