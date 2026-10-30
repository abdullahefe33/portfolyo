import { getSite } from '../lib/content.js';
import { renderHome } from '../lib/render.js';
import { handler } from '../lib/http.js';

export const onRequestGet = handler(async ({ env }) => {
  const [site, { results }] = await Promise.all([
    getSite(env),
    env.DB.prepare(
      `SELECT id, title, description, category, video_key, poster_key, provider, provider_id, provider_hash, thumb_url
       FROM projects WHERE published = 1 ORDER BY sort_order ASC, created_at DESC`,
    ).all(),
  ]);

  return new Response(renderHome({ site, projects: results }), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // Yaş ve içerik güncel kalsın: kısa süreli önbellek.
      'cache-control': 'public, max-age=0, s-maxage=60, must-revalidate',
    },
  });
});
