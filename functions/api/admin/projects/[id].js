import { HttpError, handler, json, readJson } from '../../../../lib/http.js';
import { IMAGE_KEY_RE, deleteObjects } from '../../../../lib/files.js';
import { PROJECT_COLUMNS, claimAsset, parseProjectFields } from './index.js';

const ID_RE = /^[0-9a-f-]{36}$/;

async function load(env, id) {
  if (!ID_RE.test(id)) throw new HttpError(404, 'Proje bulunamadı.');
  const row = await env.DB.prepare(`SELECT ${PROJECT_COLUMNS} FROM projects WHERE id = ?`).bind(id).first();
  if (!row) throw new HttpError(404, 'Proje bulunamadı.');
  return row;
}

export const onRequestPut = handler(async ({ request, env, params }) => {
  const current = await load(env, params.id);
  const body = await readJson(request, 8192);
  const fields = parseProjectFields(body, { partial: true });

  const stmts = [];
  let oldPoster = null;
  if ('poster_key' in body) {
    if (body.poster_key === null || body.poster_key === '') {
      fields.poster_key = null;
    } else if (body.poster_key !== current.poster_key) {
      fields.poster_key = (await claimAsset(env, body.poster_key, 'poster', IMAGE_KEY_RE)).key;
      stmts.push(env.DB.prepare('UPDATE assets SET attached = 1 WHERE key = ?').bind(fields.poster_key));
    }
    if ('poster_key' in fields && current.poster_key && fields.poster_key !== current.poster_key) {
      oldPoster = current.poster_key;
      stmts.push(env.DB.prepare('DELETE FROM assets WHERE key = ?').bind(oldPoster));
    }
  }

  const keys = Object.keys(fields);
  if (keys.length) {
    const sets = keys.map((k) => `${k} = ?`).join(', ');
    stmts.push(
      env.DB.prepare(`UPDATE projects SET ${sets}, updated_at = datetime('now') WHERE id = ?`).bind(...keys.map((k) => fields[k]), current.id),
    );
  }
  if (stmts.length) await env.DB.batch(stmts);
  await deleteObjects(env, [oldPoster]);
  return json(await load(env, current.id));
});

export const onRequestDelete = handler(async ({ env, params }) => {
  const p = await load(env, params.id);
  const site = await env.DB.prepare("SELECT value FROM settings WHERE key = 'site'").first();
  const stmts = [
    env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(p.id),
    env.DB.prepare('DELETE FROM assets WHERE key IN (?, ?)').bind(p.video_key, p.poster_key || p.video_key),
  ];
  if (site) {
    try {
      const data = JSON.parse(site.value);
      if (data.hero && data.hero.showreel_project_id === p.id) {
        data.hero.showreel_project_id = '';
        stmts.push(env.DB.prepare("UPDATE settings SET value = ? WHERE key = 'site'").bind(JSON.stringify(data)));
      }
    } catch { /* bozuk ayar kaydı yok sayılır */ }
  }
  await env.DB.batch(stmts);
  await deleteObjects(env, [p.video_key, p.poster_key]);
  return json({ ok: true });
});
