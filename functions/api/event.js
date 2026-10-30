// Sayfadaki iki etkinliği sayar: video oynatma ve iletişim yolu tıklaması. Kimlik/IP saklanmaz.
import { HttpError, assertSameOrigin, handler, json, readJson } from '../../lib/http.js';
import { ipKey, rateCheck, rateHit, tooMany } from '../../lib/auth.js';
import { isBot, record } from '../../lib/stats.js';

const CTA = new Set(['tel', 'whatsapp', 'instagram', 'form']);
const LIMIT = 200;
const WINDOW = 3600;

export const onRequestPost = handler(async ({ request, env }) => {
  assertSameOrigin(request);
  if (isBot(request.headers.get('user-agent'))) return json({ ok: true }, 202);

  const key = await ipKey(request, env, 'event');
  const r = await rateCheck(env, key, LIMIT, WINDOW);
  if (!r.ok) throw tooMany(r.retryAfter);

  const body = await readJson(request, 512);
  if (body.e === 'play' && typeof body.l === 'string' && /^[0-9a-f-]{36}$/.test(body.l)) await record(env, 'play', body.l);
  else if (body.e === 'cta' && CTA.has(body.l)) await record(env, 'cta', body.l);
  else throw new HttpError(400, 'Geçersiz etkinlik.');
  await rateHit(env, key, WINDOW);
  return json({ ok: true }, 202);
});
