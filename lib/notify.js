// Yeni mesaj bildirimi: Telegram botu (ücretsiz, telefona anında bildirim).
// Gizli değerler Cloudflare'de tutulur: TELEGRAM_BOT_TOKEN ve TELEGRAM_CHAT_ID.

const strip = (s) => String(s).replace(/[\r\n]+/g, ' ').slice(0, 200);
const TOKEN_RE = /^\d{5,12}:[A-Za-z0-9_-]{30,60}$/;
const CHAT_RE = /^-?\d{3,20}$/;

export async function notifyTelegram(env, msg, origin = '') {
  if (!TOKEN_RE.test(env.TELEGRAM_BOT_TOKEN || '') || !CHAT_RE.test(String(env.TELEGRAM_CHAT_ID || ''))) return false;
  const text = [
    `Yeni mesaj: ${strip(msg.name)}`,
    msg.subject ? `Konu: ${strip(msg.subject)}` : null,
    `E-posta: ${strip(msg.email)}`,
    msg.phone ? `Telefon: ${strip(msg.phone)}` : null,
    '',
    String(msg.body).slice(0, 700),
    origin ? `\nPanel: ${origin}/admin/` : null,
  ].filter((l) => l !== null).join('\n');

  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    // parse_mode yok: ziyaretçi metni biçimlendirme olarak yorumlanmaz
    body: JSON.stringify({ chat_id: String(env.TELEGRAM_CHAT_ID), text, disable_web_page_preview: true }),
    signal: AbortSignal.timeout(6000),
  });
  return res.ok;
}
