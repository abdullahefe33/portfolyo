// Ortak HTTP yardımcıları: JSON yanıtları, hata sınıfı, kaynak (Origin) denetimi.

export class HttpError extends Error {
  constructor(status, message, headers = {}) {
    super(message);
    this.status = status;
    this.headers = headers;
  }
}

const BASE_HEADERS = {
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
};

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...BASE_HEADERS, ...headers },
  });
}

// Tüm API uçları bununla sarılır: beklenmeyen hatalarda iç ayrıntı sızdırılmaz.
export function handler(fn) {
  return async (context) => {
    try {
      return await fn(context);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status, e.headers);
      console.error('Beklenmeyen hata:', e && e.stack ? e.stack : e);
      return json({ error: 'Sunucuda beklenmeyen bir hata oluştu.' }, 500);
    }
  };
}

export function clientIp(request) {
  return request.headers.get('cf-connecting-ip') || '127.0.0.1';
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Durum değiştiren isteklerde tarayıcı her zaman Origin gönderir; aynı kaynak değilse reddet.
export function assertSameOrigin(request) {
  if (SAFE_METHODS.has(request.method)) return;
  const origin = request.headers.get('origin');
  const expected = new URL(request.url).origin;
  if (!origin || origin !== expected) throw new HttpError(403, 'İstek kaynağı doğrulanamadı.');
}

export async function readJson(request, maxBytes = 65536) {
  const type = request.headers.get('content-type') || '';
  if (!type.toLowerCase().startsWith('application/json')) throw new HttpError(415, 'İçerik türü application/json olmalı.');
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > maxBytes) throw new HttpError(413, 'İstek çok büyük.');
  const text = await request.text();
  if (text.length > maxBytes) throw new HttpError(413, 'İstek çok büyük.');
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, 'Geçersiz JSON.');
  }
}

export function uuid() {
  return crypto.randomUUID();
}
