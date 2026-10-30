import { HttpError, handler, json } from '../../../../../lib/http.js';

export const onRequestDelete = handler(async ({ env, params }) => {
  if (!/^[0-9a-f-]{36}$/.test(params.id)) throw new HttpError(404, 'Yükleme bulunamadı.');
  const u = await env.DB.prepare('SELECT r2_key, upload_id FROM uploads WHERE id = ?').bind(params.id).first();
  if (u) {
    try { await env.MEDIA.resumeMultipartUpload(u.r2_key, u.upload_id).abort(); } catch { /* zaten yok */ }
    await env.DB.prepare('DELETE FROM uploads WHERE id = ?').bind(params.id).run();
  }
  return json({ ok: true });
});
