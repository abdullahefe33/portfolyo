// Ana sayfanın sunucu tarafında üretilen HTML'i. Tüm dinamik değerler kaçışlanır (XSS).
import { CATEGORIES, ageFrom } from './content.js';
import { embedUrl, safeThumb } from './embed.js';
import { clapperArt, cloudArt, droneArt, hillsArt, mascotArt, planeArt, reelArt, serviceIcon, sparkleArt, stepIcon, sunArt } from './art.js';

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

function phoneParts(raw) {
  const digits = String(raw).replace(/\D/g, '');
  const national = digits.length >= 10 ? digits.slice(-10) : digits;
  const display =
    national.length === 10 ? `0${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6, 8)} ${national.slice(8)}` : raw;
  return { display, tel: `+90${national}`, wa: `90${national}` };
}

const svg = (path, size = 20) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" focusable="false">${path}</svg>`;
const ICON_PLAY = svg('<path d="M8 5.5v13l11-6.5z" fill="currentColor"/>', 22);
const ICON_APERTURE = svg('<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 3l3.2 5.5M21 12h-6.4M18.4 18.4l-3.2-5.5M12 21l-3.2-5.5M3 12h6.4M5.6 5.6l3.2 5.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>', 26);
const ICON_IG = svg('<rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor"/>');
const ICON_PHONE = svg('<path d="M6.6 3.5h3l1.4 4-2 1.3a11 11 0 0 0 5.2 5.2l1.3-2 4 1.4v3a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>');
const ICON_WA = svg('<path d="M12 3.5a8.5 8.5 0 0 0-7.3 12.8L3.5 20.5l4.3-1.1A8.5 8.5 0 1 0 12 3.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 8.5c.3 3 2.8 5.8 6 6.5l1-1.6-2-1-.9.8a5 5 0 0 1-2.4-2.4l.8-.9-1-2z" fill="currentColor"/>');

// Mozaik düzeni: ilk iki kart büyük, sonraki üçü küçük, desen tekrar eder (JS filtrelemede aynısını uygular).
export const BENTO = ['s7', 's5', 's4', 's4', 's4'];

const embedOf = (p) => (p.provider ? embedUrl({ provider: p.provider, id: p.provider_id, hash: p.provider_hash || '' }) : '');
// Kapak: önce yüklenen görsel, yoksa YouTube/Vimeo küçük resmi (yalnızca izinli adreslerden).
const thumbOf = (p) => (p.poster_key ? `/media/${p.poster_key}` : safeThumb(p.thumb_url));

const videoAttrs = (p, cat) => {
  const embed = embedOf(p);
  const source = embed ? `data-embed="${esc(embed)}"` : `data-video="/media/${esc(p.video_key)}"`;
  const poster = thumbOf(p);
  return `${source} data-id="${esc(p.id)}" data-title="${esc(p.title)}" data-role="${esc(p.role || '')}" data-desc="${esc(p.description)}" data-cat="${esc(cat)}"${poster ? ` data-poster="${esc(poster)}"` : ''}`;
};

function projectCard(p, i) {
  const cat = CATEGORIES[p.category] || CATEGORIES.diger;
  const thumb = thumbOf(p);
  const poster = thumb ? `<img src="${esc(thumb)}" alt="" loading="lazy" decoding="async" width="1280" height="720">` : '';
  return `<li class="reel-item ${BENTO[i % BENTO.length]}" data-category="${esc(p.category)}">
  <button type="button" class="reel cat-${esc(p.category)}" ${videoAttrs(p, cat)}>
    ${poster}
    ${p.video_key ? `<video class="reel-preview" muted loop playsinline preload="none" tabindex="-1" aria-hidden="true" data-src="/media/${esc(p.video_key)}"></video>` : ''}
    <span class="reel-scrim"></span>
    <span class="reel-play" aria-hidden="true">${ICON_PLAY}</span>
    <span class="reel-meta"><span class="reel-cat">${esc(cat)}</span><span class="reel-title">${esc(p.title)}</span><span class="sr-only"> videosunu oynat</span>${p.role ? `<span class="reel-role">${esc(p.role)}</span>` : ''}</span>
  </button>
</li>`;
}

function heroTile(feature, age) {
  const deco = `<div class="deco deco-drone">${droneArt()}</div><div class="deco deco-clapper">${clapperArt()}</div>`;
  const badge = `<span class="age-badge"><strong data-age-hero>${age}</strong><span>yaşında</span></span>`;
  const spin = `<span class="spin-badge" aria-hidden="true"><svg viewBox="0 0 120 120" width="124" height="124" focusable="false"><defs><path id="spin-path" d="M60,60 m-45,0 a45,45 0 1,1 90,0 a45,45 0 1,1 -90,0"/></defs><text><textPath href="#spin-path" textLength="276" lengthAdjust="spacing">Kamera — Kurgu — Drone — Renk — </textPath></text></svg><i>${ICON_APERTURE}</i></span>`;
  if (!feature) {
    return `<div class="hero-tile">
    <span class="deco-sun" aria-hidden="true">${sunArt()}</span>
    <div class="hero-art" role="img" aria-label="Ana video için ayrılmış alan"><span class="hero-sun"></span><span class="hero-hills"></span><span class="hero-note">Showreel çok yakında</span></div>
    ${badge}${deco}
  </div>`;
  }
  const cat = CATEGORIES[feature.category] || CATEGORIES.diger;
  return `<div class="hero-tile">
    <span class="deco-sun" aria-hidden="true">${sunArt()}</span>
    <button type="button" class="reel hero-reel cat-${esc(feature.category)}" ${videoAttrs(feature, cat)}>
      ${thumbOf(feature) ? `<img src="${esc(thumbOf(feature))}" alt="" decoding="async" width="1280" height="720">` : ''}
      ${feature.video_key ? `<video class="hero-video" muted loop playsinline preload="metadata" data-hero-video${feature.poster_key ? ` poster="/media/${esc(feature.poster_key)}"` : ''}><source src="/media/${esc(feature.video_key)}"></video>` : ''}
      <span class="reel-scrim"></span>
      <span class="reel-play reel-play-lg" aria-hidden="true">${ICON_PLAY}</span>
      <span class="reel-meta"><span class="reel-cat">${esc(cat)}</span><span class="reel-title">${esc(feature.title)}</span><span class="sr-only"> ana videosunu oynat</span>${feature.role ? `<span class="reel-role">${esc(feature.role)}</span>` : ''}</span>
    </button>
    ${badge}${deco}
  </div>`;
}

export function renderHome({ site, projects, origin = '', now = new Date() }) {
  const { hero, about, contact, seo } = site;
  const age = ageFrom(about.birth_date, now);
  const ph = phoneParts(contact.phone);
  const ig = contact.instagram;
  const year = new Intl.DateTimeFormat('en', { timeZone: 'Europe/Istanbul', year: 'numeric' }).format(now);

  const feature = projects.find((p) => p.id === hero.showreel_project_id) || projects[0] || null;
  const usedCats = [...new Set(projects.map((p) => p.category))].filter((c) => CATEGORIES[c]);
  const nameWords = hero.title.split(/\s+/).filter(Boolean);

  const person = {
    '@type': 'Person',
    '@id': `${origin}/#kisi`,
    name: hero.title,
    jobTitle: hero.roles,
    birthPlace: about.birthplace,
    url: `${origin}/`,
    sameAs: [`https://www.instagram.com/${ig}/`],
  };
  const videos = projects.slice(0, 20).map((p) => {
    const thumb = thumbOf(p);
    const embed = embedOf(p);
    const node = {
      '@type': 'VideoObject',
      name: p.title,
      description: p.description || p.title,
      uploadDate: String(p.created_at || '').slice(0, 10) || undefined,
      author: { '@id': `${origin}/#kisi` },
    };
    if (thumb) node.thumbnailUrl = thumb.startsWith('/') ? `${origin}${thumb}` : thumb;
    if (embed) node.embedUrl = embed;
    else if (p.video_key) node.contentUrl = `${origin}/media/${p.video_key}`;
    return node;
  }).filter((v) => v.thumbnailUrl && v.uploadDate);
  const jsonLd = JSON.stringify({ '@context': 'https://schema.org', '@graph': [person, ...videos] }).replace(/</g, '\\u003c');
  const ogImage = origin ? `${origin}/og.jpg` : '/og.jpg';

  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(seo.title)}</title>
<meta name="description" content="${esc(seo.description)}">
<meta name="theme-color" content="#F5F6F8">
<meta name="color-scheme" content="light">
${origin ? `<link rel="canonical" href="${esc(origin)}/">\n<meta property="og:url" content="${esc(origin)}/">` : ''}
<meta property="og:type" content="website">
<meta property="og:locale" content="tr_TR">
<meta property="og:site_name" content="${esc(hero.title)}">
<meta property="og:title" content="${esc(seo.title)}">
<meta property="og:description" content="${esc(seo.description)}">
<meta property="og:image" content="${esc(ogImage)}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(hero.title)}: ${esc(hero.roles)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(seo.title)}">
<meta name="twitter:description" content="${esc(seo.description)}">
<meta name="twitter:image" content="${esc(ogImage)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/assets/fonts/bricolage-grotesque-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/instrument-sans-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/site.css">
<link rel="stylesheet" href="/assets/art.css">
<script type="application/ld+json">${jsonLd}</script>
</head>
<body>
<a class="skip" href="#icerik">İçeriğe geç</a>

<header class="nav" data-nav>
  <a class="nav-mark" href="#top">${esc(hero.title)}</a>
  <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="nav-links">Menü</button>
  <nav id="nav-links" class="nav-links" aria-label="Ana menü">
    <a href="#calismalar">Çalışmalar</a>
    <a href="#hizmetler">Hizmetler</a>
    <a href="#hakkimda">${esc(about.heading)}</a>
    <a href="#yetenekler">Yetenekler</a>
    <a class="nav-cta" href="#iletisim">${esc(hero.cta_secondary)}</a>
  </nav>
</header>

<main id="icerik">
<section class="hero" id="top" aria-labelledby="hero-title" data-hero>
  <div class="sky" aria-hidden="true">
    <span class="cloud cl1">${cloudArt()}</span><span class="cloud cl2">${cloudArt()}</span><span class="cloud cl3">${cloudArt()}</span>
    <span class="sp sp1">${sparkleArt('lemon')}</span><span class="sp sp2">${sparkleArt('mint')}</span><span class="sp sp3">${sparkleArt('coral')}</span><span class="sp sp4">${sparkleArt('lilac')}</span>
  </div>
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <h1 id="hero-title" class="hero-name">${nameWords.map((w) => `<span>${esc(w)}</span>`).join(' ')}</h1>
      <p class="hero-roles">${esc(hero.roles)}</p>
      <p class="hero-tag">${esc(hero.tagline)}</p>
      <p class="hero-actions"><a class="btn btn-cobalt" href="#calismalar">${esc(hero.cta_primary)}</a><a class="btn btn-line" href="#iletisim">${esc(hero.cta_secondary)}</a></p>
    </div>
    ${heroTile(feature, age)}
  </div>
  <div class="hills" aria-hidden="true">${hillsArt()}</div>
</section>

<section class="section" id="calismalar" aria-labelledby="work-h">
  <div class="wrap">
    <div class="sec-head">
      <h2 id="work-h">Çalışmalar</h2>
      ${usedCats.length > 1 ? `<div class="filters" role="group" aria-label="Kategoriye göre filtrele">
        <button type="button" class="chip" data-filter="all" aria-pressed="true">Tümü</button>
        ${usedCats.map((c) => `<button type="button" class="chip" data-filter="${esc(c)}" aria-pressed="false">${esc(CATEGORIES[c])}</button>`).join('\n        ')}
      </div>` : ''}
    </div>
    ${projects.length
      ? `<ul class="reels">\n${projects.map(projectCard).join('\n')}\n</ul>`
      : '<p class="empty" role="status">Çalışmalar çok yakında burada olacak.</p>'}
  </div>
</section>

<section class="section" id="hizmetler" aria-labelledby="services-h">
  <div class="wrap">
    <div class="sec-head"><h2 id="services-h">Neler yapıyorum</h2></div>
    <ul class="services">
      ${site.services.map((s, i) => `<li class="svc svc-${i % 4}"><span class="svc-art">${serviceIcon(i)}</span><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></li>`).join('\n      ')}
    </ul>
  </div>
</section>

${site.process.steps.length ? `<section class="section" id="surec" aria-labelledby="process-h">
  <div class="wrap">
    <div class="sec-head"><h2 id="process-h">${esc(site.process.heading)}</h2></div>
    <ol class="steps">
      ${site.process.steps.map((st, i) => `<li><span class="step-art">${stepIcon(i)}</span><span class="step-no" aria-hidden="true">${i + 1}</span><h3>${esc(st.title)}</h3><p>${esc(st.text)}</p></li>`).join('\n      ')}
    </ol>
  </div>
</section>
` : ''}
<section class="section" id="hakkimda" aria-labelledby="about-h">
  <div class="wrap about-grid">
    ${about.photo
      ? `<img class="portrait" src="/media/${esc(about.photo)}" alt="${esc(hero.title)}" width="640" height="800" loading="lazy" decoding="async">`
      : `<div class="portrait portrait-art" role="img" aria-label="Çizgi film kamerası maskotu"><span class="mascot-bubble">Çekime hazır mısın?</span><span class="mascot-cloud">${cloudArt()}</span>${mascotArt()}</div>`}
    <div class="about-text">
      <h2 id="about-h">${esc(about.heading)}</h2>
      ${about.body.map((p, i) => `<p${i > 0 ? ' class="muted"' : ''}>${esc(p)}</p>`).join('\n      ')}
      <dl class="facts">
        <div><dt>Yaş</dt><dd data-age>${age}</dd></div>
        <div><dt>Doğum yeri</dt><dd>${esc(about.birthplace)}</dd></div>
        <div><dt>Eğitim</dt><dd>${esc(about.education)}</dd></div>
        <div><dt>Ehliyet</dt><dd>${esc(about.license)}</dd></div>
      </dl>
      ${about.companies.length ? `<p class="companies-label">Birlikte çalıştığı yapımlar</p>
      <ul class="companies">${about.companies.map((c, i) => `<li class="co-${i % 3}">${esc(c)}</li>`).join('')}</ul>` : ''}
    </div>
  </div>
</section>

<section class="section" id="yetenekler" aria-labelledby="skills-h">
  <div class="wrap">
    <div class="sec-head"><h2 id="skills-h">Yetenekler</h2></div>
    <ul class="skills">
      ${site.skills.map((s) => `<li>${esc(s.title)}</li>`).join('\n      ')}
    </ul>
  </div>
</section>

${site.testimonials.length ? `<section class="section" id="referanslar" aria-labelledby="refs-h">
  <div class="wrap">
    <div class="sec-head"><h2 id="refs-h">Müşteriler ne diyor</h2></div>
    <ul class="quotes">
      ${site.testimonials.map((t, i) => `<li class="quote q-${i % 3}"><blockquote><p>${esc(t.quote)}</p></blockquote><p class="quote-by"><strong>${esc(t.name)}</strong>${t.role ? `<span>${esc(t.role)}</span>` : ''}</p></li>`).join('\n      ')}
    </ul>
  </div>
</section>
` : ''}
<section class="section contact-section" id="iletisim" aria-labelledby="contact-h">
  <div class="wrap">
    <div class="contact-panel" data-contact>
      <div class="contact-art" aria-hidden="true"><span class="plane">${planeArt()}</span><span class="csp csp1">${sparkleArt('lemon')}</span><span class="csp csp2">${sparkleArt('mint')}</span><span class="reel-deco">${reelArt()}</span></div>
      <div class="contact-text">
        <h2 id="contact-h">${esc(contact.heading)}</h2>
        <p>${esc(contact.text)}</p>
        <ul class="links">
          <li><a href="https://www.instagram.com/${esc(ig)}/" target="_blank" rel="noopener noreferrer">${ICON_IG}<span>@${esc(ig)}</span></a></li>
          <li><a href="tel:${esc(ph.tel)}">${ICON_PHONE}<span>${esc(ph.display)}</span></a></li>
          <li><a href="https://wa.me/${esc(ph.wa)}" target="_blank" rel="noopener noreferrer">${ICON_WA}<span>WhatsApp'tan yaz</span></a></li>
        </ul>
      </div>
      <form class="form" id="contact-form" novalidate>
        <div class="form-summary" role="alert" tabindex="-1" hidden></div>
        <div class="form-row">
          <div class="field"><label for="f-name">Adınız</label><input id="f-name" name="name" type="text" autocomplete="name" required maxlength="100" aria-describedby="e-name"><p class="field-err" id="e-name" hidden></p></div>
          <div class="field"><label for="f-email">E-posta adresiniz</label><input id="f-email" name="email" type="email" autocomplete="email" required maxlength="254" aria-describedby="e-email"><p class="field-err" id="e-email" hidden></p></div>
        </div>
        <div class="form-row">
          <div class="field"><label for="f-phone">Telefon <span class="opt">(isteğe bağlı)</span></label><input id="f-phone" name="phone" type="tel" autocomplete="tel" maxlength="30"></div>
          <div class="field"><label for="f-subject">Konu</label>
            <select id="f-subject" name="subject">
              <option value="">Seçiniz</option>
              ${site.services.map((s) => `<option>${esc(s.title)}</option>`).join('\n              ')}
              <option>Diğer</option>
            </select></div>
        </div>
        <div class="field"><label for="f-message">Mesajınız</label><textarea id="f-message" name="message" rows="5" required maxlength="4000" aria-describedby="e-message"></textarea><p class="field-err" id="e-message" hidden></p></div>
        <div class="hp" aria-hidden="true"><label for="f-web">Web sitesi</label><input id="f-web" name="website" type="text" tabindex="-1" autocomplete="off"></div>
        <button class="btn btn-lemon" type="submit">Mesajı gönder</button>
        <p class="form-status" role="status" aria-live="polite"></p>
      </form>
    </div>
  </div>
</section>
</main>

<footer class="footer">
  <div class="filmstrip" aria-hidden="true"></div>
  <div class="wrap"><p>© ${year} ${esc(hero.title)}</p><a href="#top">Başa dön</a></div>
</footer>

<nav class="dock" data-dock aria-label="Hızlı iletişim">
  <a href="tel:${esc(ph.tel)}" data-cta="tel">${ICON_PHONE}<span>Ara</span></a>
  <a href="https://wa.me/${esc(ph.wa)}" target="_blank" rel="noopener noreferrer" data-cta="whatsapp">${ICON_WA}<span>WhatsApp</span></a>
  <a class="dock-main" href="#iletisim" data-cta="form">${esc(hero.cta_secondary)}</a>
</nav>

<dialog class="player" id="player" aria-label="Video oynatıcı">
  <div class="player-bar"><p class="player-title" id="player-title"></p><button type="button" class="player-close" data-close aria-label="Videoyu kapat">Kapat</button></div>
  <video controls playsinline preload="none"></video>
  <div class="player-embed" hidden></div>
  <p class="player-desc" id="player-desc"></p>
</dialog>

<script src="/assets/site.js" defer></script>
</body>
</html>`;
}
