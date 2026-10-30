import { HttpError, handler, json, uuid } from '../../../lib/http.js';
import { MAX_IMAGE_BYTES, sniffImage } from '../../../lib/files.js';

const FOLDERS = { poster: 'posters', portrait: 'portraits' };

export const onRequestPost = handler(async ({ request, env }) => {
  const purpose = new URL(request.url).searchParams.get('purpose') || 'poster';
  if (!Object.hasOwn(FOLDERS, purpose)) throw new HttpError(400, 'Geçersiz amaç.');

  const declared = Number(request.headers.get('content-length') || 0);
  if (!declared || declared > MAX_IMAGE_BYTES) throw new HttpError(413, `Görsel en çok ${MAX_IMAGE_BYTES / 1048576} MB olabilir.`);
  const buf = new Uint8Array(await request.arrayBuffer());
  if (buf.byteLength > MAX_IMAGE_BYTES) throw new HttpError(413, `Görsel en çok ${MAX_IMAGE_BYTES / 1048576} MB olabilir.`);

  const type = sniffImage(buf);
  if (!type) throw new HttpError(415, 'Yalnızca JPG, PNG veya WebP görsel yüklenebilir.');

  const key = `${FOLDERS[purpose]}/${uuid()}.${type.ext}`;
  await env.MEDIA.put(key, buf, { httpMetadata: { contentType: type.mime } });
  await env.DB.prepare('INSERT INTO assets (key, kind, mime, size, attached, created_at) VALUES (?, ?, ?, ?, 0, ?)')
    .bind(key, purpose, type.mime, buf.byteLength, Math.floor(Date.now() / 1000)).run();
  return json({ key }, 201);
});
