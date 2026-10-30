import { fromBase64 } from '../../lib/files.js';

// R2'deki medya dosyalarını Range desteğiyle (video ileri-geri sarma) sunar.
const KEY_RE = /^(videos|posters|portraits)\/[0-9a-f-]{36}\.(mp4|mov|webm|jpg|png|webp)$/;

function parseRange(header, size) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header || '');
  if (!m || (m[1] === '' && m[2] === '')) return null;
  let start;
  let end;
  if (m[1] === '') {
    const suffix = Math.min(Number(m[2]), size);
    start = size - suffix;
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  if (start > end || start >= size) return 'invalid';
  return { offset: start, length: end - start + 1 };
}

// Görseller (kapak, portre) veritabanında base64 olarak saklanır.
async function serveImage(env, key) {
  const row = await env.DB.prepare("SELECT mime, data FROM assets WHERE key = ? AND kind IN ('poster', 'portrait') AND data IS NOT NULL")
    .bind(key).first();
  if (!row) return new Response('Bulunamadı', { status: 404 });
  const bytes = fromBase64(row.data);
  return new Response(bytes, {
    headers: {
      'content-type': row.mime,
      'content-length': String(bytes.byteLength),
      'cache-control': 'public, max-age=31536000, immutable',
      'x-content-type-options': 'nosniff',
      'cross-origin-resource-policy': 'same-origin',
      'content-disposition': 'inline',
    },
  });
}

async function serve({ request, env, params }) {
  const key = Array.isArray(params.path) ? params.path.join('/') : String(params.path || '');
  if (!KEY_RE.test(key)) return new Response('Bulunamadı', { status: 404 });
  if (!key.startsWith('videos/')) return serveImage(env, key);
  if (!env.MEDIA) return new Response('Bulunamadı', { status: 404 });

  const head = await env.MEDIA.head(key);
  if (!head) return new Response('Bulunamadı', { status: 404 });

  const headers = new Headers({
    'content-type': head.httpMetadata?.contentType || 'application/octet-stream',
    'accept-ranges': 'bytes',
    'cache-control': 'public, max-age=31536000, immutable',
    etag: head.httpEtag,
    'x-content-type-options': 'nosniff',
    'cross-origin-resource-policy': 'same-origin',
    'content-disposition': 'inline',
  });

  const range = parseRange(request.headers.get('range'), head.size);
  if (range === 'invalid') {
    headers.set('content-range', `bytes */${head.size}`);
    return new Response(null, { status: 416, headers });
  }

  if (request.method === 'HEAD') {
    headers.set('content-length', String(head.size));
    return new Response(null, { status: 200, headers });
  }

  const object = await env.MEDIA.get(key, range ? { range } : undefined);
  if (!object) return new Response('Bulunamadı', { status: 404 });
  if (range) {
    headers.set('content-range', `bytes ${range.offset}-${range.offset + range.length - 1}/${head.size}`);
    headers.set('content-length', String(range.length));
    return new Response(object.body, { status: 206, headers });
  }
  headers.set('content-length', String(head.size));
  return new Response(object.body, { status: 200, headers });
}

export const onRequestGet = serve;
export const onRequestHead = serve;
