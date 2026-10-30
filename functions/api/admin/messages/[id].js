import { HttpError, handler, json, readJson } from '../../../../lib/http.js';

const ID_RE = /^[0-9a-f-]{36}$/;

export const onRequestPatch = handler(async ({ request, env, params }) => {
  if (!ID_RE.test(params.id)) throw new HttpError(404, 'Mesaj bulunamadı.');
  const body = await readJson(request, 1024);
  await env.DB.prepare('UPDATE messages SET is_read = ? WHERE id = ?').bind(body.is_read ? 1 : 0, params.id).run();
  return json({ ok: true });
});

export const onRequestDelete = handler(async ({ env, params }) => {
  if (!ID_RE.test(params.id)) throw new HttpError(404, 'Mesaj bulunamadı.');
  await env.DB.prepare('DELETE FROM messages WHERE id = ?').bind(params.id).run();
  return json({ ok: true });
});
