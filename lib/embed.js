// YouTube / Vimeo bağlantılarını güvenle ayrıştırır. Kullanıcıdan gelen metin hiçbir zaman
// doğrudan adrese eklenmez: yalnızca doğrulanmış kimlik (id) ile adres yeniden kurulur.

const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d{5,12}$/;
const VIMEO_HASH = /^[A-Za-z0-9]{0,20}$/;
const THUMB_HOSTS = /^https:\/\/(i\.ytimg\.com|i\.vimeocdn\.com)\//;

export function parseVideoUrl(input) {
  if (typeof input !== 'string' || input.length > 300) return null;
  let u;
  try { u = new URL(input.trim()); } catch { return null; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  const host = u.hostname.toLowerCase().replace(/^(www|m)\./, '');

  if (host === 'youtu.be') {
    const id = u.pathname.slice(1).split('/')[0];
    return YT_ID.test(id) ? { provider: 'youtube', id, hash: '' } : null;
  }
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    let id = u.pathname === '/watch' ? u.searchParams.get('v') : null;
    const m = /^\/(?:shorts|embed|live|v)\/([A-Za-z0-9_-]{11})(?:[/?]|$)/.exec(u.pathname);
    if (!id && m) id = m[1];
    return id && YT_ID.test(id) ? { provider: 'youtube', id, hash: '' } : null;
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const m = /^\/(?:video\/)?(\d{5,12})(?:\/([A-Za-z0-9]{6,20}))?\/?$/.exec(u.pathname);
    if (!m) return null;
    const hash = m[2] || u.searchParams.get('h') || '';
    return VIMEO_ID.test(m[1]) && VIMEO_HASH.test(hash) ? { provider: 'vimeo', id: m[1], hash } : null;
  }
  return null;
}

// Veritabanından okunan alanlar da yeniden doğrulanır.
function valid(p) {
  if (!p) return false;
  if (p.provider === 'youtube') return YT_ID.test(p.id || '');
  if (p.provider === 'vimeo') return VIMEO_ID.test(p.id || '') && VIMEO_HASH.test(p.hash || '');
  return false;
}

export function embedUrl(p) {
  if (!valid(p)) return '';
  if (p.provider === 'youtube') return `https://www.youtube-nocookie.com/embed/${p.id}?rel=0&modestbranding=1&playsinline=1`;
  return `https://player.vimeo.com/video/${p.id}${p.hash ? `?h=${p.hash}` : ''}`;
}

export function canonicalUrl(p) {
  if (!valid(p)) return '';
  return p.provider === 'youtube' ? `https://www.youtube.com/watch?v=${p.id}` : `https://vimeo.com/${p.id}${p.hash ? `/${p.hash}` : ''}`;
}

export const safeThumb = (url) => (typeof url === 'string' && url.length < 400 && THUMB_HOSTS.test(url) ? url : '');

export function fallbackThumb(p) {
  return valid(p) && p.provider === 'youtube' ? `https://i.ytimg.com/vi/${p.id}/hqdefault.jpg` : '';
}

// Başlık ve kapak görselini sağlayıcının oEmbed uç noktasından alır (başarısız olursa null).
export async function fetchOembed(p) {
  if (!valid(p)) return null;
  const target = canonicalUrl(p);
  const endpoint = p.provider === 'youtube'
    ? `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(target)}`
    : `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(target)}`;
  try {
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(4000), headers: { accept: 'application/json' } });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      title: typeof data.title === 'string' ? data.title.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 120) : '',
      thumbnail: safeThumb(data.thumbnail_url),
    };
  } catch {
    return null;
  }
}
