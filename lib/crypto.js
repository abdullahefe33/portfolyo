// Parola özeti, rastgele belirteç ve zamanlama-güvenli karşılaştırma.
// Not: Cloudflare Workers PBKDF2 için en çok 100.000 yineleme destekler.
// Bu sınırı güçlü, rastgele üretilmiş parola + oran sınırlama ile dengeliyoruz.

const enc = new TextEncoder();
export const PBKDF2_ITERATIONS = 100000;

export function toB64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromB64url(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (str.length % 4)) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function randomToken(bytes = 32) {
  return toB64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function sha256hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function timingSafeEqual(a, b) {
  const x = typeof a === 'string' ? enc.encode(a) : a;
  const y = typeof b === 'string' ? enc.encode(b) : b;
  let diff = x.length ^ y.length;
  const len = Math.max(x.length, y.length);
  for (let i = 0; i < len; i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}

async function pbkdf2(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2-sha256$${PBKDF2_ITERATIONS}$${toB64url(salt)}$${toB64url(hash)}`;
}

export async function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2-sha256') return false;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations < 1000 || iterations > PBKDF2_ITERATIONS) return false;
  const hash = await pbkdf2(password, fromB64url(parts[2]), iterations);
  return timingSafeEqual(hash, fromB64url(parts[3]));
}

// Kullanıcı bulunamasa bile aynı işi yapıp zamanlamadan kullanıcı adı sızmasını önler.
export const DUMMY_HASH = 'pbkdf2-sha256$100000$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
