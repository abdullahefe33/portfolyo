import { handler, json } from '../../../lib/http.js';
import { getSession } from '../../../lib/auth.js';

export const onRequestGet = handler(async ({ request, env }) => {
  const session = await getSession(request, env);
  return json(session ? { authenticated: true, csrf: session.csrf } : { authenticated: false });
});
