import { HttpError, handler, json, readJson, uuid } from '../../../../lib/http.js';
import { MB, maxVideoBytes, deleteObjects } from '../../../../lib/files.js';

const EXT_MIME = { mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm' };
const STALE_AFTER = 24 * 3600;

// Başlatılıp tamamlanmamış yüklemeleri ve hiçbir projeye bağlanmamış eski dosyaları temizler.
async function cleanup(env) {
  const cutoff = Math.floor(Date.now() / 1000) - STALE_AFTER;
  const { results: stale } = await env.DB.prepare('SELECT id, r2_key, upload_id FROM uploads WHERE created_at < ?').bind(cutoff).all();
  for (const u of stale) {
    try { await env.MEDIA.resumeMultipartUpload(u.r2_key, u.upload_id).abort(); } catch { /* zaten yok */ }
    await env.DB.prepare('DELETE FROM uploads WHERE id = ?').bind(u.id).run();
  }
  const { results: orphans } = await env.DB.prepare('SELECT key FROM assets WHERE attached = 0 AND created_at < ?').bind(cutoff).all();
  if (orphans.length) {
    await deleteObjects(env, orphans.map((o) => o.key));
    for (const o of orphans) await env.DB.prepare('DELETE FROM assets WHERE key = ?').bind(o.key).run();
  }
}

export const onRequestPost = handler(async ({ request, env }) => {
  const body = await readJson(request, 2048);
  const name = typeof body.name === 'string' ? body.name : '';
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (!Object.hasOwn(EXT_MIME, ext)) throw new HttpError(400, 'Yalnızca MP4, MOV veya WebM video yüklenebilir.');

  const size = Number(body.size);
  const max = maxVideoBytes(env);
  if (!Number.isInteger(size) || size <= 0) throw new HttpError(400, 'Geçersiz dosya boyutu.');
  if (size > max) throw new HttpError(413, `Video en çok ${Math.round(max / MB)} MB olabilir.`);

  await cleanup(env);

  const id = uuid();
  const key = `videos/${uuid()}.${ext}`;
  const mime = EXT_MIME[ext];
  const mp = await env.MEDIA.createMultipartUpload(key, { httpMetadata: { contentType: mime } });
  await env.DB.prepare('INSERT INTO uploads (id, r2_key, upload_id, mime, declared_size, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, key, mp.uploadId, mime, size, Math.floor(Date.now() / 1000)).run();
  return json({ id }, 201);
});
