// Kapak görseli ve portre fotoğrafı: küçültülmüş görsel veritabanında saklanır (R2 gerekmez).
import { HttpError, handler, json, uuid } from '../../../lib/http.js';
import { MAX_IMAGE_BYTES, cleanupStale, sniffImage, toBase64 } from '../../../lib/files.js';

const FOLDERS = { poster: 'posters', portrait: 'portraits' };

export const onRequestPost = handler(async ({ request, env }) => {
  const purpose = new URL(request.url).searchParams.get('purpose') || 'poster';
  if (!Object.hasOwn(FOLDERS, purpose)) throw new HttpError(400, 'Geçersiz amaç.');

  const tooBig = `Görsel en çok ${MAX_IMAGE_BYTES / 1048576} MB olabilir (panel otomatik küçültür).`;
  const declared = Number(request.headers.get('content-length') || 0);
  if (!declared || declared > MAX_IMAGE_BYTES) throw new HttpError(413, tooBig);
  const buf = new Uint8Array(await request.arrayBuffer());
  if (buf.byteLength > MAX_IMAGE_BYTES) throw new HttpError(413, tooBig);

  const type = sniffImage(buf);
  if (!type) throw new HttpError(415, 'Yalnızca JPG, PNG veya WebP görsel yüklenebilir.');

  await cleanupStale(env);
  const key = `${FOLDERS[purpose]}/${uuid()}.${type.ext}`;
  await env.DB.prepare('INSERT INTO assets (key, kind, mime, size, attached, created_at, data) VALUES (?, ?, ?, ?, 0, ?, ?)')
    .bind(key, purpose, type.mime, buf.byteLength, Math.floor(Date.now() / 1000), toBase64(buf)).run();
  return json({ key }, 201);
});
