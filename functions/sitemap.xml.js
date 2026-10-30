export const onRequestGet = async ({ request, env }) => {
  const origin = new URL(request.url).origin;
  const row = await env.DB.prepare('SELECT MAX(updated_at) AS t FROM projects').first().catch(() => null);
  const last = (row && row.t ? String(row.t).slice(0, 10) : new Date().toISOString().slice(0, 10));
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${origin}/</loc><lastmod>${last}</lastmod><changefreq>monthly</changefreq><priority>1.0</priority></url>\n  <url><loc>${origin}/gizlilik</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>\n</urlset>\n`,
    { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } },
  );
};
