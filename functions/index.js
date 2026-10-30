import { getSite } from '../lib/content.js';
import { renderHome } from '../lib/render.js';
import { handler } from '../lib/http.js';
import { isBot, record, sourceLabel } from '../lib/stats.js';

export const onRequestGet = handler(async (context) => {
  const { env, request } = context;
  const [site, { results }] = await Promise.all([
    getSite(env),
    env.DB.prepare(
      `SELECT id, title, description, category, video_key, poster_key, provider, provider_id, provider_hash, thumb_url, role, created_at
       FROM projects WHERE published = 1 ORDER BY sort_order ASC, created_at DESC`,
    ).all(),
  ]);

  // Ziyaret sayacı: robotlar ve kendi sayfa yenilemeleri sayılmaz.
  if (!isBot(request.headers.get('user-agent'))) {
    const source = sourceLabel(request);
    if (source) context.waitUntil(Promise.all([record(env, 'view'), record(env, 'ref', source)]));
  }

  return new Response(renderHome({ site, projects: results, origin: new URL(request.url).origin }), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // Yaş ve içerik güncel kalsın: kısa süreli önbellek.
      'cache-control': 'public, max-age=0, s-maxage=60, must-revalidate',
    },
  });
});
