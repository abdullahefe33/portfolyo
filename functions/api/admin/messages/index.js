import { handler, json } from '../../../../lib/http.js';

export const onRequestGet = handler(async ({ env }) => {
  const { results } = await env.DB.prepare(
    'SELECT id, name, email, phone, subject, body, is_read, mailed, created_at FROM messages ORDER BY created_at DESC LIMIT 200',
  ).all();
  return json(results);
});
