// Elle çizilmiş SVG illüstrasyonlar. Renk ve çizgi kalınlığı public/assets/art.css'ten gelir;
// hareketler de orada (CSS animasyonu). Hepsi süs olduğu için ekran okuyuculardan gizlidir.

const svg = (cls, viewBox, body, extra = '') =>
  `<svg class="art ${cls}" viewBox="${viewBox}" aria-hidden="true" focusable="false"${extra}>${body}</svg>`;

// ---- Dron ----
export const droneArt = () => svg('art-drone', '0 0 220 150', `
  <g class="drone-bob">
    <path class="o" fill="none" stroke-width="4" d="M88 94 L78 120 M132 94 L142 120 M68 120 H90 M130 120 H152"/>
    <path class="arm-o" d="M80 68 L36 48 M140 68 L184 48"/>
    <path class="arm-f" d="M80 68 L36 48 M140 68 L184 48"/>
    <rect class="o f-ink" x="28" y="42" width="14" height="12" rx="3"/>
    <rect class="o f-ink" x="178" y="42" width="14" height="12" rx="3"/>
    <ellipse class="blade b1" cx="35" cy="34" rx="33" ry="5"/>
    <ellipse class="blade b2" cx="185" cy="34" rx="33" ry="5"/>
    <circle class="f-ink" cx="35" cy="36" r="4"/><circle class="f-ink" cx="185" cy="36" r="4"/>
    <rect class="o f-coral" x="72" y="54" width="76" height="42" rx="18"/>
    <path class="o f-lemon" d="M88 56 Q110 34 132 56 Z"/>
    <circle class="o f-mint led" cx="110" cy="78" r="5"/>
    <rect class="o f-ink" x="104" y="96" width="12" height="8" rx="2"/>
    <g class="gimbal">
      <circle class="o f-white" cx="110" cy="114" r="13"/>
      <circle class="o f-cobalt" cx="110" cy="114" r="7"/>
      <circle fill="#fff" cx="107" cy="111" r="2.2"/>
    </g>
  </g>`);

// ---- Klaket ----
const stripes = (y, h, id) => {
  let p = '';
  for (let i = 0; i < 8; i++) {
    const x = 16 + i * 20;
    p += `<polygon class="${i % 2 ? 'f-white' : 'f-ink'}" points="${x},${y} ${x + 20},${y} ${x + 10},${y + h} ${x - 10},${y + h}"/>`;
  }
  return `<clipPath id="${id}"><rect x="16" y="${y}" width="138" height="${h}" rx="4"/></clipPath><g clip-path="url(#${id})">${p}</g><rect class="o" fill="none" x="16" y="${y}" width="138" height="${h}" rx="4"/>`;
};
export const clapperArt = () => svg('art-clapper', '0 0 170 160', `
  <rect class="o f-ink" x="16" y="62" width="138" height="88" rx="8"/>
  <rect class="f-white" x="30" y="84" width="58" height="5" rx="2.5"/>
  <rect class="f-white" x="30" y="100" width="86" height="5" rx="2.5"/>
  <rect class="f-white" x="30" y="116" width="42" height="5" rx="2.5"/>
  <circle class="o f-lemon" cx="130" cy="120" r="12"/>
  <circle class="o f-coral" cx="128" cy="86" r="8"/>
  ${stripes(44, 18, 'clap-bar')}
  <g class="clap-arm">${stripes(24, 18, 'clap-top')}</g>`);

// ---- Film makarası ----
export const reelArt = () => svg('art-reel', '0 0 80 80', `
  <g class="reel-spin">
    <circle class="o f-lemon" cx="40" cy="40" r="36"/>
    ${[0, 72, 144, 216, 288].map((a) => `<circle class="o f-paper" cx="${(40 + 22 * Math.cos((a - 90) * Math.PI / 180)).toFixed(1)}" cy="${(40 + 22 * Math.sin((a - 90) * Math.PI / 180)).toFixed(1)}" r="7"/>`).join('')}
    <circle class="o f-ink" cx="40" cy="40" r="9"/>
    <circle fill="#fff" cx="40" cy="40" r="3"/>
  </g>`);

// ---- Kamera maskotu (imleci gözüyle takip eder) ----
export const mascotArt = () => svg('art-mascot', '0 0 320 310', `
  <ellipse cx="160" cy="298" rx="96" ry="8" fill="#0f1115" opacity=".14"/>
  <path class="o" fill="none" stroke-width="9" d="M160 236 L98 296 M160 236 L160 300 M160 236 L222 296"/>
  <rect class="o f-ink" x="118" y="228" width="84" height="12" rx="4"/>
  <g class="reel-l"><circle class="o f-lemon" cx="108" cy="88" r="30"/><circle class="o f-paper" cx="108" cy="70" r="6"/><circle class="o f-paper" cx="90" cy="96" r="6"/><circle class="o f-paper" cx="126" cy="96" r="6"/><circle class="o f-ink" cx="108" cy="88" r="5"/></g>
  <g class="reel-r"><circle class="o f-coral" cx="214" cy="88" r="30"/><circle class="o f-paper" cx="214" cy="70" r="6"/><circle class="o f-paper" cx="196" cy="96" r="6"/><circle class="o f-paper" cx="232" cy="96" r="6"/><circle class="o f-ink" cx="214" cy="88" r="5"/></g>
  <rect class="o f-ink" x="138" y="86" width="46" height="22" rx="8"/>
  <rect fill="#0f1115" x="80" y="116" width="168" height="124" rx="22"/>
  <rect class="o f-cobalt" x="72" y="108" width="168" height="124" rx="22"/>
  <circle class="o f-coral tally" cx="216" cy="130" r="7"/>
  <rect class="o f-lemon" x="88" y="122" width="30" height="8" rx="4"/>
  <circle class="o f-ink" cx="156" cy="164" r="46"/>
  <circle class="o f-white" cx="156" cy="164" r="38"/>
  <clipPath id="eyeClip"><circle cx="156" cy="164" r="38"/></clipPath>
  <g clip-path="url(#eyeClip)">
    <g class="iris"><circle class="o f-lemon" cx="156" cy="164" r="26"/>
      <g class="pupil"><circle class="f-ink" cx="156" cy="164" r="13"/><circle fill="#fff" cx="151" cy="158" r="4.5"/></g></g>
    <rect class="lid f-cobalt" x="116" y="124" width="80" height="80"/>
  </g>
  <circle cx="98" cy="206" r="9" fill="#ff6a4d" opacity=".95"/><circle cx="214" cy="206" r="9" fill="#ff6a4d" opacity=".95"/>
  <path class="o" fill="none" d="M140 214 Q156 228 172 214"/>`);

// ---- Kâğıt uçak ----
export const planeArt = () => svg('art-plane', '0 0 120 90', `
  <path class="o f-white" d="M6 44 L112 6 L72 84 L56 54 Z"/>
  <path class="o f-lilac" d="M56 54 L112 6 L72 84 Z"/>
  <path class="o" fill="none" d="M6 44 L56 54"/>`);

// ---- Bulut ----
export const cloudArt = () => svg('art-cloud', '0 0 160 76', `
  <path class="o f-white" d="M32 66 a22 22 0 0 1 3 -43 a30 30 0 0 1 58 -7 a24 24 0 0 1 38 19 a19 19 0 0 1 -3 31 Z"/>`);

// ---- Güneş (ışınlı) ----
export const sunArt = () => svg('art-sun', '0 0 200 200', `
  <g class="sun-rays">${Array.from({ length: 12 }, (_, i) => `<rect class="f-ink" x="97" y="4" width="6" height="22" rx="3" transform="rotate(${i * 30})"/>`).join('')}</g>
  <circle class="o f-lemon" cx="100" cy="100" r="54"/>
  <path class="o" fill="none" d="M82 96 q6 -8 12 0 M110 96 q6 -8 12 0 M86 116 q14 12 28 0"/>`);

// ---- Parıltı (4 köşeli yıldız) ----
export const sparkleArt = (color = 'lemon') => svg(`art-spark f-${color}`, '0 0 24 24',
  '<path class="o" d="M12 1 C13 8 16 11 23 12 C16 13 13 16 12 23 C11 16 8 13 1 12 C8 11 11 8 12 1Z"/>');

// ---- Hizmet ikonları (8 farklı; fazla hizmet eklenirse başa döner) ----
const ICONS = [
  // 1 Müzik klibi: kulaklık + ses çubukları
  `<path class="o" fill="none" d="M14 46 V38 a22 22 0 0 1 44 0 V46"/>
   <rect class="o f-cobalt" x="8" y="42" width="14" height="22" rx="6"/><rect class="o f-cobalt" x="50" y="42" width="14" height="22" rx="6"/>
   <rect class="o f-lemon eq e1" x="27" y="34" width="5" height="26" rx="2.5"/><rect class="o f-coral eq e2" x="34" y="34" width="5" height="26" rx="2.5"/><rect class="o f-mint eq e3" x="41" y="34" width="5" height="26" rx="2.5"/>`,
  // 2 Reklam: megafon
  `<path class="o f-coral" d="M12 30 L44 14 V54 L12 42 Z"/><rect class="o f-ink" x="7" y="30" width="9" height="12" rx="3"/>
   <path class="o f-lemon" d="M18 42 L24 60 a4 4 0 0 0 8 -2 L28 48 Z"/>
   <path class="o wave w1" fill="none" d="M50 28 q5 8 0 16"/><path class="o wave w2" fill="none" d="M56 22 q8 14 0 28"/><path class="o wave w3" fill="none" d="M62 16 q10 20 0 40"/>`,
  // 3 Tanıtım: şehir silüeti
  `<rect class="o f-cobalt" x="8" y="28" width="18" height="36"/><rect class="o f-lemon" x="26" y="12" width="20" height="52"/><rect class="o f-mint" x="46" y="34" width="18" height="30"/>
   <rect class="win wa" x="12" y="34" width="4" height="4"/><rect class="win wb" x="18" y="42" width="4" height="4"/><rect class="win wb" x="31" y="19" width="4" height="4"/><rect class="win wa" x="38" y="29" width="4" height="4"/><rect class="win wc" x="31" y="40" width="4" height="4"/><rect class="win wa" x="51" y="40" width="4" height="4"/><rect class="win wc" x="57" y="48" width="4" height="4"/>
   <path class="o" fill="none" d="M4 64 H68"/>`,
  // 4 Drone
  `<g class="mini-bob"><path class="o" fill="none" d="M24 38 L14 28 M48 38 L58 28"/>
   <ellipse class="blade b1" cx="12" cy="24" rx="12" ry="3"/><ellipse class="blade b2" cx="60" cy="24" rx="12" ry="3"/>
   <rect class="o f-coral" x="22" y="34" width="28" height="14" rx="7"/><path class="o f-lemon" d="M28 35 Q36 24 44 35 Z"/>
   <circle class="o f-white" cx="36" cy="55" r="7"/><circle class="o f-cobalt" cx="36" cy="55" r="3.5"/></g>`,
  // 5 Fotoğraf: fotoğraf makinesi + flaş
  `<rect class="o f-ink" x="22" y="16" width="18" height="10" rx="3"/><rect class="o f-lilac" x="8" y="24" width="56" height="38" rx="8"/>
   <circle class="o f-white" cx="34" cy="44" r="14"/><circle class="o f-cobalt" cx="34" cy="44" r="8"/><circle fill="#fff" cx="31" cy="41" r="2.5"/>
   <path class="o f-lemon flash" d="M56 28 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z"/>`,
  // 6 Kurgu ve renk: zaman çizelgesi
  `<rect class="o f-white" x="6" y="12" width="60" height="50" rx="6"/>
   <rect class="o f-cobalt" x="12" y="18" width="26" height="10" rx="3"/><rect class="o f-coral" x="40" y="18" width="20" height="10" rx="3"/>
   <rect class="o f-lemon" x="12" y="32" width="18" height="10" rx="3"/><rect class="o f-mint" x="32" y="32" width="28" height="10" rx="3"/>
   <rect class="o f-lilac" x="12" y="46" width="36" height="10" rx="3"/><rect class="o f-cobalt" x="50" y="46" width="10" height="10" rx="3"/>
   <g class="playhead"><path d="M36 14 V60" stroke="#ff6a4d" stroke-width="3.5" stroke-linecap="round"/><path class="o f-coral" d="M30 8 h12 l-6 8z"/></g>`,
  // 7 Yapay zekâ: ekran + parıltılar
  `<rect class="o f-ink" x="6" y="22" width="48" height="36" rx="8"/><path class="o f-white" d="M24 32 L38 40 L24 48 Z"/>
   <path class="o f-lemon spark s1" d="M54 4 c1 8 4 11 12 12 c-8 1 -11 4 -12 12 c-1 -8 -4 -11 -12 -12 c8 -1 11 -4 12 -12z"/>
   <path class="o f-mint spark s2" d="M60 48 c.6 4 2 5.4 6 6 c-4 .6 -5.4 2 -6 6 c-.6 -4 -2 -5.4 -6 -6 c4 -.6 5.4 -2 6 -6z"/>
   <path class="o f-lilac spark s3" d="M10 6 c.6 4 2 5.4 6 6 c-4 .6 -5.4 2 -6 6 c-.6 -4 -2 -5.4 -6 -6 c4 -.6 5.4 -2 6 -6z"/>`,
  // 8 Senaryo: kâğıt + kalem
  `<rect class="o f-white" x="10" y="8" width="42" height="56" rx="6"/>
   <path class="o line l1" fill="none" d="M18 22 H44"/><path class="o line l2" fill="none" d="M18 32 H38"/><path class="o line l3" fill="none" d="M18 42 H46"/>
   <g class="pen"><path class="o f-coral" d="M44 42 l14 -14 l7 7 l-14 14 z"/><path class="o f-lemon" d="M44 42 l-5 12 l12 -5 z"/></g>`,
];
export const serviceIcon = (i) => svg('art-icon', '0 0 72 72', ICONS[i % ICONS.length]);

// ---- Süreç ikonları (4) ----
const STEPS = [
  // 1 Tanışma: konuşma balonları
  `<path class="o f-cobalt" d="M10 10 h42 a8 8 0 0 1 8 8 v18 a8 8 0 0 1 -8 8 h-26 l-10 10 v-10 h-6 a8 8 0 0 1 -8 -8 v-18 a8 8 0 0 1 8 -8z"/>
   <circle class="dot d1" fill="#fff" cx="21" cy="27" r="3.5"/><circle class="dot d2" fill="#fff" cx="31" cy="27" r="3.5"/><circle class="dot d3" fill="#fff" cx="41" cy="27" r="3.5"/>
   <path class="o f-coral" d="M44 46 h26 a8 8 0 0 1 8 8 v12 a8 8 0 0 1 -8 8 h-2 v8 l-10 -8 h-14 a8 8 0 0 1 -8 -8 v-12 a8 8 0 0 1 8 -8z" transform="translate(0 -4) scale(.98)"/>`,
  // 2 Planlama: storyboard
  `<rect class="o f-white" x="8" y="10" width="72" height="68" rx="8"/>
   <rect class="o f-cobalt fr fr1" x="16" y="18" width="26" height="22" rx="4"/><rect class="o f-coral fr fr2" x="46" y="18" width="26" height="22" rx="4"/>
   <rect class="o f-lemon fr fr3" x="16" y="46" width="26" height="22" rx="4"/><rect class="o f-mint fr fr4" x="46" y="46" width="26" height="22" rx="4"/>`,
  // 3 Çekim: vizör
  `<path class="o" fill="none" stroke-width="5" d="M10 28 V12 H28 M60 12 H78 V28 M78 60 V76 H60 M28 76 H10 V60"/>
   <circle class="o f-white focus" cx="44" cy="44" r="14"/><circle class="f-cobalt" cx="44" cy="44" r="7"/>
   <circle class="o f-coral led" cx="20" cy="22" r="5"/>`,
  // 4 Kurgu ve teslim: dışa aktarma
  `<rect class="o f-white" x="8" y="52" width="72" height="22" rx="11"/><rect class="f-mint prog" x="12" y="56" width="64" height="14" rx="7"/>
   <circle class="o f-lemon up" cx="44" cy="28" r="20"/><path class="o f-ink up" d="M44 36 V20 M36 27 L44 19 L52 27" fill="none" stroke-width="4"/>`,
];
export const stepIcon = (i) => svg('art-step', '0 0 88 88', STEPS[i % STEPS.length]);

// ---- Tepe silueti (açılış bölümünün altı): dolgu kenarsız, yalnızca üst çizgi çizili ----
export const hillsArt = () => svg('art-hills', '0 0 1440 120', `
  <path class="f-lilac" d="M0 120 V70 Q180 20 360 64 T720 58 T1080 70 T1440 40 V120 Z"/>
  <path class="o" fill="none" d="M-10 70 Q180 20 360 64 T720 58 T1080 70 T1450 40"/>
  <path class="f-mint" d="M0 120 V92 Q220 54 440 90 T880 86 T1440 76 V120 Z"/>
  <path class="o" fill="none" d="M-10 92 Q220 54 440 90 T880 86 T1450 76"/>`, ' preserveAspectRatio="none"');
