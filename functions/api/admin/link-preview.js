// Yapıştırılan YouTube/Vimeo bağlantısını doğrular; başlık ve kapak görselini önerir.
import { HttpError, handler, json } from '../../../lib/http.js';
import { embedUrl, fallbackThumb, fetchOembed, parseVideoUrl } from '../../../lib/embed.js';

export const onRequestGet = handler(async ({ request }) => {
  const url = new URL(request.url).searchParams.get('url') || '';
  const p = parseVideoUrl(url);
  if (!p) throw new HttpError(400, 'Geçerli bir YouTube veya Vimeo bağlantısı yazın.');
  const info = await fetchOembed(p);
  return json({
    provider: p.provider,
    id: p.id,
    embed: embedUrl(p),
    title: (info && info.title) || '',
    thumbnail: (info && info.thumbnail) || fallbackThumb(p),
  });
});
