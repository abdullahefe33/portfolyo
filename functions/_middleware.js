import { SECURITY_HEADERS } from '../lib/security.js';

export const onRequest = async (context) => {
  const response = await context.next();
  const out = new Response(response.body, response);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) if (!out.headers.has(k)) out.headers.set(k, v);
  return out;
};
