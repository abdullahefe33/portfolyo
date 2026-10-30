import { HttpError, handler, json, readJson } from '../../../lib/http.js';
import { hashPassword, verifyPassword } from '../../../lib/crypto.js';
import { getSession } from '../../../lib/auth.js';
import { ipKey, rateCheck, rateHit, tooMany } from '../../../lib/auth.js';

export const onRequestPost = handler(async ({ request, env }) => {
  const key = await ipKey(request, env, 'pwchange');
  const r = await rateCheck(env, key, 5, 900);
  if (!r.ok) throw tooMany(r.retryAfter);

  const body = await readJson(request, 2048);
  const current = typeof body.current === 'string' ? body.current : '';
  const next = typeof body.next === 'string' ? body.next : '';
  if (next.length < 12 || next.length > 200) throw new HttpError(400, 'Yeni parola en az 12 karakter olmalı.');

  const row = await env.DB.prepare('SELECT pw_hash FROM admin_users WHERE id = 1').first();
  if (!row || !(await verifyPassword(current, row.pw_hash))) {
    await rateHit(env, key, 900);
    throw new HttpError(400, 'Mevcut parola hatalı.');
  }

  const session = await getSession(request, env);
  await env.DB.batch([
    env.DB.prepare("UPDATE admin_users SET pw_hash = ?, updated_at = datetime('now') WHERE id = 1").bind(await hashPassword(next)),
    // Diğer tüm oturumlar kapatılır.
    env.DB.prepare('DELETE FROM sessions WHERE id != ?').bind(session.id),
    // Kurulum listesi için: parola en az bir kez değiştirildi
    env.DB.prepare("INSERT INTO settings (key, value) VALUES ('pw_changed', '1') ON CONFLICT(key) DO UPDATE SET value = '1'"),
  ]);
  return json({ ok: true });
});
