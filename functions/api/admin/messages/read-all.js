import { handler, json } from '../../../../lib/http.js';

export const onRequestPost = handler(async ({ env }) => {
  const res = await env.DB.prepare('UPDATE messages SET is_read = 1 WHERE is_read = 0').run();
  return json({ ok: true, changed: res.meta ? res.meta.changes : 0 });
});
