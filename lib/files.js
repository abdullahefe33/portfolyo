import { HttpError } from './http.js';

// Dosya türü doğrulama (istemcinin söylediğine değil, gerçek dosya başlığına bakılır).

export const MB = 1024 * 1024;
export const CHUNK_BYTES = 8 * MB; // R2 parça boyutu (son parça hariç hepsi eşit olmalı)
export const MAX_PART_BYTES = 10 * MB;
export const MAX_IMAGE_BYTES = 1 * MB; // görseller veritabanında saklanır; yönetim paneli yüklemeden önce küçültür

export function maxVideoBytes(env) {
  const mb = Number(env.MAX_VIDEO_MB);
  return (Number.isFinite(mb) && mb > 0 ? Math.min(mb, 5000) : 500) * MB;
}

const ascii = (bytes, from, to) => String.fromCharCode(...bytes.slice(from, to));

export function sniffVideo(bytes) {
  if (bytes.length < 12) return null;
  if (ascii(bytes, 4, 8) === 'ftyp') {
    const brand = ascii(bytes, 8, 12);
    return brand === 'qt  ' ? { mime: 'video/quicktime', ext: 'mov' } : { mime: 'video/mp4', ext: 'mp4' };
  }
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return { mime: 'video/webm', ext: 'webm' };
  return null;
}

export function sniffImage(bytes) {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (bytes[0] === 0x89 && ascii(bytes, 1, 4) === 'PNG') return { mime: 'image/png', ext: 'png' };
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP') return { mime: 'image/webp', ext: 'webp' };
  return null;
}

export const VIDEO_KEY_RE = /^videos\/[0-9a-f-]{36}\.(mp4|mov|webm)$/;
export const IMAGE_KEY_RE = /^(posters|portraits)\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

// Video dosyası yükleme/depolama yalnızca R2 bağlantısı (MEDIA) varsa çalışır; bağlantıyla video her zaman çalışır.
export function requireMedia(env) {
  if (!env.MEDIA) throw new HttpError(503, 'Dosya yükleme bu sitede kapalı. YouTube veya Vimeo bağlantısı kullanın.');
}

export async function deleteObjects(env, keys) {
  const list = keys.filter(Boolean);
  if (list.length && env.MEDIA) await env.MEDIA.delete(list);
}

export function toBase64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export function fromBase64(text) {
  const bin = atob(text);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const STALE_AFTER = 24 * 3600;

// Başlatılıp tamamlanmamış yüklemeleri ve hiçbir yere bağlanmamış eski dosyaları temizler.
export async function cleanupStale(env) {
  const cutoff = Math.floor(Date.now() / 1000) - STALE_AFTER;
  if (env.MEDIA) {
    const { results: stale } = await env.DB.prepare('SELECT id, r2_key, upload_id FROM uploads WHERE created_at < ?').bind(cutoff).all();
    for (const u of stale) {
      try { await env.MEDIA.resumeMultipartUpload(u.r2_key, u.upload_id).abort(); } catch { /* zaten yok */ }
      await env.DB.prepare('DELETE FROM uploads WHERE id = ?').bind(u.id).run();
    }
  }
  const { results: orphans } = await env.DB.prepare('SELECT key, kind FROM assets WHERE attached = 0 AND created_at < ?').bind(cutoff).all();
  const videoKeys = orphans.filter((o) => o.kind === 'video').map((o) => o.key);
  if (videoKeys.length) await deleteObjects(env, videoKeys);
  for (const o of orphans) await env.DB.prepare('DELETE FROM assets WHERE key = ?').bind(o.key).run();
}
