import { HttpError, assertSameOrigin, handler, json, readJson, uuid } from '../../lib/http.js';
import { ipKey, rateCheck, rateHit, tooMany } from '../../lib/auth.js';
import { notifyByMail } from '../../lib/mail.js';
import { notifyTelegram } from '../../lib/notify.js';
import { record } from '../../lib/stats.js';

// Yalnızca güvenli karakterler: ? & = gibi URL/mailto anlamı taşıyanlar reddedilir (mailto parametre enjeksiyonu).
const EMAIL_RE = /^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
const LIMIT = 5; // saatte IP başına en çok 5 mesaj
const WINDOW = 3600;
const MIN_FILL_MS = 2500;

const field = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max) : '');

export const onRequestPost = handler(async (context) => {
  const { request, env } = context;
  assertSameOrigin(request);
  const key = await ipKey(request, env, 'contact');
  const r = await rateCheck(env, key, LIMIT, WINDOW);
  if (!r.ok) throw tooMany(r.retryAfter);

  const body = await readJson(request, 12000);

  // Bot tuzakları: görünmeyen alan dolu ya da form çok hızlı gönderildiyse başarılı gibi yanıtla, kaydetme.
  const filledMs = Date.now() - Number(body.t || 0);
  if (field(body.website, 200) || !Number.isFinite(filledMs) || filledMs < MIN_FILL_MS) return json({ ok: true });

  const msg = {
    name: field(body.name, 100),
    email: field(body.email, 254),
    phone: field(body.phone, 30),
    subject: field(body.subject, 100),
    body: field(body.message, 4000).replace(/\r\n/g, '\n'),
  };
  if (msg.name.length < 2) throw new HttpError(400, 'Lütfen adınızı yazın.');
  if (!EMAIL_RE.test(msg.email)) throw new HttpError(400, 'Geçerli bir e-posta adresi yazın.');
  if (msg.phone && !/^[0-9+\s()-]{7,30}$/.test(msg.phone)) throw new HttpError(400, 'Telefon numarası geçersiz.');
  if (msg.body.length < 10) throw new HttpError(400, 'Mesajınız en az 10 karakter olmalı.');

  await rateHit(env, key, WINDOW);
  const id = uuid();
  await env.DB.prepare('INSERT INTO messages (id, name, email, phone, subject, body) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, msg.name, msg.email, msg.phone, msg.subject, msg.body).run();

  context.waitUntil(record(env, 'msg'));

  // Mesaj önce veritabanına yazılır; e-posta gitmese bile kaybolmaz (admin panelinde görünür).
  const origin = new URL(request.url).origin;
  const send = Promise.allSettled([notifyByMail(env, msg), notifyTelegram(env, msg, origin)])
    .then((results) => {
      results.forEach((r) => r.status === 'rejected' && console.error('Bildirim gönderilemedi:', r.reason && r.reason.message));
      const delivered = results.some((r) => r.status === 'fulfilled' && r.value);
      return delivered && env.DB.prepare('UPDATE messages SET mailed = 1 WHERE id = ?').bind(id).run();
    })
    .catch((e) => console.error('Bildirim hatası:', e && e.message));
  context.waitUntil(send);

  return json({ ok: true });
});
