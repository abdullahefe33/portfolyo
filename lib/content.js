// Site içeriği: varsayılanlar, doğrulama/temizleme ve yaş hesabı.

export const CATEGORIES = {
  'muzik-klibi': 'Müzik klibi',
  reklam: 'Reklam filmi',
  tanitim: 'Tanıtım filmi',
  drone: 'Drone çekimi',
  fotograf: 'Fotoğraf',
  'yapay-zeka': 'Yapay zekâ videosu',
  diger: 'Diğer',
};

export const DEFAULT_SITE = {
  hero: {
    title: 'Mehmet Abdullah Bardakçı',
    roles: 'Kameraman, kurgucu ve drone operatörü',
    tagline: 'Fikri sahneye, sahneyi son kareye taşıyorum. Çekim, kurgu ve renk tek elden.',
    cta_primary: 'Çalışmaları izle',
    cta_secondary: 'Teklif iste',
    showreel_project_id: '',
  },
  about: {
    heading: 'Hakkımda',
    body: [
      'Fırat Üniversitesi Radyo, Televizyon ve Sinema bölümü mezunuyum. Aksakal Medya, Crepix Medya ve Juntos Medya gibi medya şirketleriyle çalışarak müzik kliplerinden reklam filmlerine kadar farklı formatlarda prodüksiyon deneyimi edindim.',
      'Çekimden kurguya, renk düzenlemeden senaryoya kadar süreci baştan sona yönetiyorum. Hem geleneksel çekim hem de yapay zekâ destekli üretim yöntemleriyle markanızın hikâyesini anlatıyorum.',
    ],
    birth_date: '2004-05-16',
    birthplace: 'Tarsus, Mersin',
    education: 'Fırat Üniversitesi, Radyo Televizyon ve Sinema',
    license: 'B sınıfı',
    companies: ['Aksakal Medya', 'Crepix Medya', 'Juntos Medya'],
    photo: '',
  },
  services: [
    { title: 'Müzik klibi', text: 'Şarkının temposuna göre planlanan, sinematik çekim ve ritmik kurguyla hazırlanan müzik klibi prodüksiyonu.' },
    { title: 'Reklam filmi', text: 'Marka mesajını kısa sürede net anlatan, platformlara uygun formatlarda reklam çekimi ve kurgusu.' },
    { title: 'Tanıtım filmi', text: 'Şirketinizi, ürününüzü veya mekânınızı güçlü bir hikâyeyle anlatan kurumsal tanıtım filmleri.' },
    { title: 'Drone çekimi', text: 'Emlak ve konum tanıtımları için havadan çekim. Mülkü ve çevresini tek bakışta gösterir.' },
    { title: 'Fotoğraf çekimi ve düzenleme', text: 'Konsept fotoğraf çekimleri; rötuş, renk ve ton düzenlemesiyle tamamlanmış kareler.' },
    { title: 'Kurgu ve renk düzenleme', text: 'Premiere Pro ile kurgu, ses-görüntü uyumu ve renk düzenlemesiyle ham görüntüyü yayına hazır hale getirme.' },
    { title: 'Yapay zekâ ile video üretimi', text: 'Bütçe ya da mekân kısıtı olan fikirler için yapay zekâ destekli video ve görsel üretimi.' },
    { title: 'Senaryo ve fikir geliştirme', text: 'Kampanya, klip ve film fikirlerinin üretilmesi; senaryo ve metin olarak geliştirilmesi.' },
  ],
  skills: [
    { title: 'Kameramanlık', text: 'Set ve saha çekimlerinde kadraj, ışık ve hareket yönetimi.' },
    { title: 'Premiere Pro', text: 'Kurgu, geçişler, ses ve renk akışı.' },
    { title: 'Drone operatörlüğü', text: 'Planlı ve güvenli havadan çekim.' },
    { title: 'Yazarlık', text: 'Senaryo, metin ve fikir geliştirme.' },
    { title: 'İletişim', text: 'Müşteri ve ekiple açık, hızlı iletişim.' },
    { title: 'B sınıfı ehliyet', text: 'Lokasyon çekimlerinde esnek ulaşım.' },
  ],
  contact: {
    heading: 'Projenizi konuşalım',
    text: 'Formu doldurun, mesajınız doğrudan bana ulaşır. En kısa sürede dönüş yaparım.',
    phone: '05467245302',
    instagram: 'm.abdullah_bardakci',
  },
  seo: {
    title: 'Mehmet Abdullah Bardakçı | Kameraman, Video Kurgu ve Drone Çekimi',
    description:
      'Müzik klibi, reklam ve tanıtım filmi, drone çekimi, fotoğraf, renk düzenleme ve yapay zekâ video üretimi. Mehmet Abdullah Bardakçı portfolyo sitesi.',
  },
};

// ---- Doğrulama / temizleme -------------------------------------------------

const str = (max) => (v, d) => (typeof v === 'string' ? clean(v, max) : d);
const lines = (maxItems, maxLen) => (v, d) =>
  Array.isArray(v) ? v.map((x) => clean(x, maxLen)).filter(Boolean).slice(0, maxItems) : d;
const list = (maxItems, shape) => (v, d) =>
  Array.isArray(v) ? v.slice(0, maxItems).map((x) => build(shape, x, {})).filter((x) => Object.values(x).some(Boolean)) : d;

function clean(value, max) {
  // Kontrol karakterlerini at, uzunluğu sınırla.
  return String(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);
}

function build(shape, input, fallback) {
  const out = {};
  const src = input && typeof input === 'object' ? input : {};
  for (const [k, fn] of Object.entries(shape)) out[k] = fn(src[k], fallback[k] ?? '');
  return out;
}

const KEY_RE = /^(portraits|posters)\/[0-9a-f-]{36}\.(jpg|png|webp)$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const SHAPE = {
  hero: {
    title: str(120), roles: str(160), tagline: str(300), cta_primary: str(40), cta_secondary: str(40),
    showreel_project_id: (v) => (typeof v === 'string' && /^[0-9a-f-]{36}$/.test(v) ? v : ''),
  },
  about: {
    heading: str(80), body: lines(6, 1200),
    birth_date: (v, d) => (typeof v === 'string' && DATE_RE.test(v) && !Number.isNaN(Date.parse(v)) ? v : d),
    birthplace: str(80), education: str(160), license: str(60), companies: lines(12, 80),
    photo: (v) => (typeof v === 'string' && KEY_RE.test(v) ? v : ''),
  },
  contact: {
    heading: str(100), text: str(400),
    phone: (v, d) => (typeof v === 'string' && /^[0-9+\s()-]{7,20}$/.test(v.trim()) ? v.trim() : d),
    instagram: (v, d) => (typeof v === 'string' && /^[A-Za-z0-9._]{1,30}$/.test(v.replace(/^@/, '')) ? v.replace(/^@/, '') : d),
  },
  seo: { title: str(120), description: str(300) },
};

export function sanitizeSite(input) {
  const src = input && typeof input === 'object' ? input : {};
  const out = {};
  for (const [section, shape] of Object.entries(SHAPE)) out[section] = build(shape, src[section], DEFAULT_SITE[section]);
  const item = { title: str(100), text: str(500) };
  out.services = list(12, item)(src.services, DEFAULT_SITE.services);
  out.skills = list(12, { title: str(60), text: str(200) })(src.skills, DEFAULT_SITE.skills);
  return out;
}

export async function getSite(env) {
  const row = await env.DB.prepare("SELECT value FROM settings WHERE key = 'site'").first();
  if (!row) return structuredClone(DEFAULT_SITE);
  try {
    return sanitizeSite({ ...structuredClone(DEFAULT_SITE), ...JSON.parse(row.value) });
  } catch {
    return structuredClone(DEFAULT_SITE);
  }
}

// ---- Yaş (Türkiye saatine göre, her istekte yeniden hesaplanır) ---------------

export function ageFrom(birthDate, now = new Date()) {
  const [y, m, d] = birthDate.split('-').map(Number);
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(now)
    .reduce((a, p) => ((a[p.type] = Number(p.value)), a), {});
  let age = parts.year - y;
  if (parts.month < m || (parts.month === m && parts.day < d)) age -= 1;
  return age;
}
