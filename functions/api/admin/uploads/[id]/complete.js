import { HttpError, handler, json } from '../../../../../lib/http.js';

export const onRequestPost = handler(async ({ env, params }) => {
  if (!/^[0-9a-f-]{36}$/.test(params.id)) throw new HttpError(404, 'Yükleme bulunamadı.');
  const u = await env.DB.prepare('SELECT * FROM uploads WHERE id = ?').bind(params.id).first();
  if (!u) throw new HttpError(404, 'Yükleme bulunamadı.');

  const parts = JSON.parse(u.parts);
  if (!parts.length || parts.some((p) => !p) || u.received !== u.declared_size) {
    throw new HttpError(400, 'Yükleme eksik. Lütfen tekrar deneyin.');
  }

  const mp = env.MEDIA.resumeMultipartUpload(u.r2_key, u.upload_id);
  await mp.complete(parts.map((p) => ({ partNumber: p.partNumber, etag: p.etag })));
  await env.DB.batch([
    env.DB.prepare("INSERT INTO assets (key, kind, mime, size, attached, created_at) VALUES (?, 'video', ?, ?, 0, ?)")
      .bind(u.r2_key, u.mime, u.received, Math.floor(Date.now() / 1000)),
    env.DB.prepare('DELETE FROM uploads WHERE id = ?').bind(u.id),
  ]);
  return json({ key: u.r2_key, size: u.received, mime: u.mime });
});
