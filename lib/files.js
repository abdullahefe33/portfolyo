// Dosya türü doğrulama (istemcinin söylediğine değil, gerçek dosya başlığına bakılır).

export const MB = 1024 * 1024;
export const CHUNK_BYTES = 8 * MB; // R2 parça boyutu (son parça hariç hepsi eşit olmalı)
export const MAX_PART_BYTES = 10 * MB;
export const MAX_IMAGE_BYTES = 5 * MB;

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

export async function deleteObjects(env, keys) {
  const list = keys.filter(Boolean);
  if (list.length) await env.MEDIA.delete(list);
}
