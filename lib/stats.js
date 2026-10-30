// Gizlilik dostu sayaçlar: çerez yok, IP veya kullanıcı kimliği saklanmaz; yalnızca günlük toplamlar.

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|curl|wget|python|node-fetch|headless|lighthouse|monitor|uptime|pingdom|bytespider/i;
export const isBot = (ua) => !ua || BOT.test(ua);

// Gün, Türkiye saatine göre (YYYY-MM-DD).
export function dayKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export async function record(env, metric, label = '') {
  try {
    await env.DB.prepare(
      `INSERT INTO stats (day, metric, label, count) VALUES (?, ?, ?, 1)
       ON CONFLICT(day, metric, label) DO UPDATE SET count = count + 1`,
    ).bind(dayKey(), metric, String(label).slice(0, 80)).run();
  } catch (e) {
    console.error('İstatistik yazılamadı:', e && e.message);
  }
}

const KNOWN = [
  [/(^|\.)instagram\.com$/, 'Instagram'], [/(^|\.)(whatsapp\.com|wa\.me)$/, 'WhatsApp'], [/(^|\.)google\./, 'Google'],
  [/(^|\.)(facebook\.com|fb\.com)$/, 'Facebook'], [/(^|\.)(youtube\.com|youtu\.be)$/, 'YouTube'], [/(^|\.)(t\.co|twitter\.com|x\.com)$/, 'X'],
  [/(^|\.)linkedin\.com$/, 'LinkedIn'], [/(^|\.)(bing|yandex|duckduckgo)\./, 'Arama motoru'],
];

// Ziyaretçinin geldiği yer: önce ?utm_source=, yoksa Referer'in yalnızca alan adı.
export function sourceLabel(request) {
  const url = new URL(request.url);
  const utm = (url.searchParams.get('utm_source') || '').toLowerCase();
  if (/^[a-z0-9._-]{1,30}$/.test(utm)) return utm;
  const ref = request.headers.get('referer');
  if (!ref) return '(doğrudan)';
  let host;
  try { host = new URL(ref).hostname.toLowerCase().replace(/^www\./, ''); } catch { return '(doğrudan)'; }
  if (host === url.hostname.toLowerCase()) return null; // kendi sitemizden gelen sayfa yenilemesi sayılmaz
  for (const [re, name] of KNOWN) if (re.test(host)) return name;
  return host.slice(0, 60);
}
