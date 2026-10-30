import { assertSameOrigin, handler, json } from '../../../lib/http.js';
import { destroySession, sessionCookie } from '../../../lib/auth.js';

export const onRequestPost = handler(async ({ request, env }) => {
  assertSameOrigin(request);
  await destroySession(request, env);
  return json({ ok: true }, 200, { 'set-cookie': sessionCookie(request, '', 0) });
});
