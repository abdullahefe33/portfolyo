import { HttpError, handler, json, readJson } from '../../../../lib/http.js';

export const onRequestPost = handler(async ({ request, env }) => {
  const body = await readJson(request, 16384);
  const ids = Array.isArray(body.ids) ? body.ids : null;
  if (!ids || ids.length > 500 || ids.some((i) => typeof i !== 'string' || !/^[0-9a-f-]{36}$/.test(i))) {
    throw new HttpError(400, 'Geçersiz sıralama listesi.');
  }
  if (ids.length) {
    await env.DB.batch(ids.map((id, i) => env.DB.prepare('UPDATE projects SET sort_order = ? WHERE id = ?').bind(i, id)));
  }
  return json({ ok: true });
});
