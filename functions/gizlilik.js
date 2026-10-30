import { getSite } from '../lib/content.js';
import { handler } from '../lib/http.js';
import { renderPrivacy } from '../lib/privacy.js';

export const onRequestGet = handler(async ({ env, request }) => {
  const site = await getSite(env);
  return new Response(renderPrivacy({ site, origin: new URL(request.url).origin }), {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0, s-maxage=300, must-revalidate' },
  });
});
