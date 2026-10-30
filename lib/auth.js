// Oturum yönetimi, CSRF doğrulaması ve oran sınırlama.
import { HttpError, assertSameOrigin, clientIp } from './http.js';
import { randomToken, sha256hex, timingSafeEqual } from './crypto.js';

const ABSOLUTE_TTL = 12 * 3600; // saniye
const IDLE_TTL = 2 * 3600;

export function cookieName(request) {
  // __Host- öneki yalnızca HTTPS'te (Secure) kullanılabilir.
  return new URL(request.url).protocol === 'https:' ? '__Host-sid' : 'sid';
}

function readCookie(request, name) {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}

export function sessionCookie(request, token, maxAge) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${cookieName(request)}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

export async function createSession(env) {
  const token = randomToken(32);
  const csrf = randomToken(24);
  const now = Math.floor(Date.now() / 1000);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE expires_at < ? OR last_seen < ?').bind(now, now - IDLE_TTL),
    env.DB.prepare('INSERT INTO sessions (id, csrf, created_at, last_seen, expires_at) VALUES (?, ?, ?, ?, ?)').bind(
      await sha256hex(token), csrf, now, now, now + ABSOLUTE_TTL,
    ),
  ]);
  return { token, csrf, maxAge: ABSOLUTE_TTL };
}

export async function getSession(request, env) {
  const token = readCookie(request, cookieName(request));
  if (!token || token.length < 20 || token.length > 200) return null;
  const id = await sha256hex(token);
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare('SELECT id, csrf, last_seen, expires_at FROM sessions WHERE id = ?').bind(id).first();
  if (!row || row.expires_at < now || row.last_seen < now - IDLE_TTL) return null;
  if (now - row.last_seen > 60) await env.DB.prepare('UPDATE sessions SET last_seen = ? WHERE id = ?').bind(now, id).run();
  return row;
}

export async function destroySession(request, env) {
  const token = readCookie(request, cookieName(request));
  if (token) await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(await sha256hex(token)).run();
}

// Yönetici uçları için: oturum + (yazma isteklerinde) Origin ve CSRF belirteci.
export async function requireAdmin(context) {
  const { request, env } = context;
  const session = await getSession(request, env);
  if (!session) throw new HttpError(401, 'Oturum gerekli.');
  assertSameOrigin(request);
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    const sent = request.headers.get('x-csrf-token') || '';
    if (!timingSafeEqual(sent, session.csrf)) throw new HttpError(403, 'Güvenlik belirteci geçersiz.');
  }
  return session;
}

export async function ipKey(request, env, prefix) {
  return `${prefix}:${await sha256hex(`${env.IP_PEPPER || 'pepper'}|${clientIp(request)}`)}`;
}

// Artırmadan kontrol eder.
export async function rateCheck(env, key, limit, windowSec) {
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare('SELECT count, window_start FROM rate_limits WHERE key = ?').bind(key).first();
  if (!row || now - row.window_start >= windowSec) return { ok: true };
  if (row.count >= limit) return { ok: false, retryAfter: row.window_start + windowSec - now };
  return { ok: true };
}

export async function rateHit(env, key, windowSec) {
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    `INSERT INTO rate_limits (key, count, window_start) VALUES (?, 1, ?)
     ON CONFLICT(key) DO UPDATE SET
       count = CASE WHEN ? - window_start >= ? THEN 1 ELSE count + 1 END,
       window_start = CASE WHEN ? - window_start >= ? THEN ? ELSE window_start END`,
  ).bind(key, now, now, windowSec, now, windowSec, now).run();
}

export async function rateReset(env, key) {
  await env.DB.prepare('DELETE FROM rate_limits WHERE key = ?').bind(key).run();
}

export function tooMany(retryAfter) {
  return new HttpError(429, 'Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin.', {
    'retry-after': String(retryAfter || 60),
  });
}
