import { HttpError, assertSameOrigin, handler, json, readJson } from '../../../lib/http.js';
import { createSession, ipKey, rateCheck, rateHit, rateReset, sessionCookie, tooMany } from '../../../lib/auth.js';
import { DUMMY_HASH, timingSafeEqual, verifyPassword } from '../../../lib/crypto.js';

const IP_LIMIT = 5; // 15 dakikada en çok 5 başarısız deneme (IP başına)
const IP_WINDOW = 900;
const GLOBAL_LIMIT = 40; // saatte en çok 40 başarısız deneme (toplam)
const GLOBAL_WINDOW = 3600;

export const onRequestPost = handler(async ({ request, env }) => {
  assertSameOrigin(request);
  const ipk = await ipKey(request, env, 'login');
  for (const [key, limit, win] of [[ipk, IP_LIMIT, IP_WINDOW], ['login:all', GLOBAL_LIMIT, GLOBAL_WINDOW]]) {
    const r = await rateCheck(env, key, limit, win);
    if (!r.ok) throw tooMany(r.retryAfter);
  }

  const body = await readJson(request, 2048);
  const username = typeof body.username === 'string' ? body.username.slice(0, 100) : '';
  const password = typeof body.password === 'string' ? body.password.slice(0, 200) : '';

  const row = await env.DB.prepare('SELECT username, pw_hash FROM admin_users WHERE id = 1').first();
  // Kullanıcı olmasa da özet hesaplanır: yanıt süresinden bilgi sızmasın.
  const passOk = await verifyPassword(password, row ? row.pw_hash : DUMMY_HASH);
  const userOk = row ? timingSafeEqual(username, row.username) : false;

  if (!(row && userOk && passOk)) {
    await rateHit(env, ipk, IP_WINDOW);
    await rateHit(env, 'login:all', GLOBAL_WINDOW);
    throw new HttpError(401, 'Kullanıcı adı veya parola hatalı.');
  }

  await rateReset(env, ipk);
  const { token, csrf, maxAge } = await createSession(env);
  return json({ ok: true, csrf }, 200, { 'set-cookie': sessionCookie(request, token, maxAge) });
});
