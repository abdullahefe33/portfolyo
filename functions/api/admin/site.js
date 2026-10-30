import { handler, json, readJson } from '../../../lib/http.js';
import { getSite, sanitizeSite } from '../../../lib/content.js';

export const onRequestGet = handler(async ({ env }) => json(await getSite(env)));

export const onRequestPut = handler(async ({ request, env }) => {
  const clean = sanitizeSite(await readJson(request, 100000));
  if (!clean.hero.title) clean.hero.title = 'Mehmet Abdullah Bardakçı';
  await env.DB.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES ('site', ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  ).bind(JSON.stringify(clean)).run();
  return json(clean);
});
