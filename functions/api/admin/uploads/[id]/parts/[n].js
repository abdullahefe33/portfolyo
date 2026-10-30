import { HttpError, handler, json } from '../../../../../../lib/http.js';
import { MAX_PART_BYTES, maxVideoBytes, sniffVideo } from '../../../../../../lib/files.js';

export const onRequestPut = handler(async ({ request, env, params }) => {
  if (!/^[0-9a-f-]{36}$/.test(params.id)) throw new HttpError(404, 'Yükleme bulunamadı.');
  const n = Number(params.n);
  if (!Number.isInteger(n) || n < 1 || n > 10000) throw new HttpError(400, 'Geçersiz parça numarası.');

  const u = await env.DB.prepare('SELECT * FROM uploads WHERE id = ?').bind(params.id).first();
  if (!u) throw new HttpError(404, 'Yükleme bulunamadı.');
  const parts = JSON.parse(u.parts);
  if (n > parts.length + 1) throw new HttpError(400, 'Parçalar sırayla gönderilmeli.');

  const declared = Number(request.headers.get('content-length') || 0);
  if (!declared || declared > MAX_PART_BYTES) throw new HttpError(413, 'Parça çok büyük.');
  const buf = new Uint8Array(await request.arrayBuffer());
  if (buf.byteLength > MAX_PART_BYTES) throw new HttpError(413, 'Parça çok büyük.');

  if (n === 1) {
    // İlk parçanın başlığı gerçekten bir video dosyasına ait olmalı (uzantıya güvenilmez).
    const type = sniffVideo(buf);
    const wantsWebm = u.mime === 'video/webm';
    if (!type || (type.mime === 'video/webm') !== wantsWebm) throw new HttpError(415, 'Dosya geçerli bir video değil.');
  }

  const replaced = parts[n - 1] ? parts[n - 1].size : 0;
  const received = u.received - replaced + buf.byteLength;
  if (received > u.declared_size || received > maxVideoBytes(env)) throw new HttpError(413, 'Yüklenen veri bildirilen boyutu aştı.');

  const mp = env.MEDIA.resumeMultipartUpload(u.r2_key, u.upload_id);
  const part = await mp.uploadPart(n, buf);
  parts[n - 1] = { partNumber: part.partNumber, etag: part.etag, size: buf.byteLength };
  await env.DB.prepare('UPDATE uploads SET parts = ?, received = ? WHERE id = ?').bind(JSON.stringify(parts), received, u.id).run();
  return json({ ok: true, received });
});
