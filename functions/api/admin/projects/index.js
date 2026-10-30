import { HttpError, handler, json, readJson, uuid } from '../../../../lib/http.js';
import { CATEGORIES } from '../../../../lib/content.js';
import { IMAGE_KEY_RE, VIDEO_KEY_RE } from '../../../../lib/files.js';

export const PROJECT_COLUMNS =
  'id, title, description, category, video_key, poster_key, video_size, sort_order, published, created_at, updated_at';

export function parseProjectFields(body, { partial = false } = {}) {
  const out = {};
  if (!partial || 'title' in body) {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (title.length < 1 || title.length > 120) throw new HttpError(400, 'Başlık 1-120 karakter olmalı.');
    out.title = title;
  }
  if (!partial || 'description' in body) {
    const d = typeof body.description === 'string' ? body.description.trim() : '';
    if (d.length > 1000) throw new HttpError(400, 'Açıklama en çok 1000 karakter olabilir.');
    out.description = d;
  }
  if (!partial || 'category' in body) {
    if (!Object.hasOwn(CATEGORIES, body.category)) throw new HttpError(400, 'Geçersiz kategori.');
    out.category = body.category;
  }
  if (!partial || 'published' in body) out.published = body.published === false || body.published === 0 ? 0 : 1;
  return out;
}

// Anahtar, daha önce sunucunun kendisinin yüklediği ve henüz bir projeye bağlanmamış bir dosyaya ait olmalı.
export async function claimAsset(env, key, kind, re) {
  if (typeof key !== 'string' || !re.test(key)) throw new HttpError(400, 'Geçersiz dosya anahtarı.');
  const row = await env.DB.prepare('SELECT key, size, attached FROM assets WHERE key = ? AND kind = ?').bind(key, kind).first();
  if (!row || row.attached) throw new HttpError(400, 'Dosya bulunamadı veya başka bir projede kullanılıyor.');
  return row;
}

export const onRequestGet = handler(async ({ env }) => {
  const { results } = await env.DB.prepare(
    `SELECT ${PROJECT_COLUMNS} FROM projects ORDER BY sort_order ASC, created_at DESC`,
  ).all();
  return json(results);
});

export const onRequestPost = handler(async ({ request, env }) => {
  const body = await readJson(request, 8192);
  const fields = parseProjectFields(body);
  const video = await claimAsset(env, body.video_key, 'video', VIDEO_KEY_RE);
  let posterKey = null;
  if (body.poster_key) posterKey = (await claimAsset(env, body.poster_key, 'poster', IMAGE_KEY_RE)).key;

  const id = uuid();
  const min = await env.DB.prepare('SELECT MIN(sort_order) AS m FROM projects').first();
  const order = (min && typeof min.m === 'number' ? min.m : 0) - 1;
  const stmts = [
    env.DB.prepare(
      `INSERT INTO projects (id, title, description, category, video_key, poster_key, video_size, sort_order, published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(id, fields.title, fields.description, fields.category, video.key, posterKey, video.size, order, fields.published),
    env.DB.prepare('UPDATE assets SET attached = 1 WHERE key = ?').bind(video.key),
  ];
  if (posterKey) stmts.push(env.DB.prepare('UPDATE assets SET attached = 1 WHERE key = ?').bind(posterKey));
  await env.DB.batch(stmts);
  const row = await env.DB.prepare(`SELECT ${PROJECT_COLUMNS} FROM projects WHERE id = ?`).bind(id).first();
  return json(row, 201);
});
