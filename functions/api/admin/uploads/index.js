import { HttpError, handler, json, readJson, uuid } from '../../../../lib/http.js';
import { MB, maxVideoBytes, cleanupStale } from '../../../../lib/files.js';

const EXT_MIME = { mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm' };
export const onRequestPost = handler(async ({ request, env }) => {
  const body = await readJson(request, 2048);
  const name = typeof body.name === 'string' ? body.name : '';
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (!Object.hasOwn(EXT_MIME, ext)) throw new HttpError(400, 'Yalnızca MP4, MOV veya WebM video yüklenebilir.');

  const size = Number(body.size);
  const max = maxVideoBytes(env);
  if (!Number.isInteger(size) || size <= 0) throw new HttpError(400, 'Geçersiz dosya boyutu.');
  if (size > max) throw new HttpError(413, `Video en çok ${Math.round(max / MB)} MB olabilir.`);

  await cleanupStale(env);

  const id = uuid();
  const key = `videos/${uuid()}.${ext}`;
  const mime = EXT_MIME[ext];
  const mp = await env.MEDIA.createMultipartUpload(key, { httpMetadata: { contentType: mime } });
  await env.DB.prepare('INSERT INTO uploads (id, r2_key, upload_id, mime, declared_size, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, key, mp.uploadId, mime, size, Math.floor(Date.now() / 1000)).run();
  return json({ id }, 201);
});
