import { handler, json } from '../../../lib/http.js';
import { dayKey } from '../../../lib/stats.js';
import { getSite } from '../../../lib/content.js';

const DAY = 86400000;

export const onRequestGet = handler(async ({ env }) => {
  const now = Date.now();
  const days = Array.from({ length: 30 }, (_, i) => dayKey(new Date(now - (29 - i) * DAY)));
  const since = days[0];
  const since7 = days[23];

  await env.DB.prepare("DELETE FROM stats WHERE day < ?").bind(dayKey(new Date(now - 400 * DAY))).run();

  const [views, refs, plays, cta, msgs, unread, projects, site, pw] = await Promise.all([
    env.DB.prepare("SELECT day, count FROM stats WHERE metric = 'view' AND day >= ?").bind(since).all(),
    env.DB.prepare("SELECT label, SUM(count) AS n FROM stats WHERE metric = 'ref' AND day >= ? GROUP BY label ORDER BY n DESC LIMIT 8").bind(since).all(),
    env.DB.prepare(
      `SELECT s.label AS id, SUM(s.count) AS n, p.title FROM stats s LEFT JOIN projects p ON p.id = s.label
       WHERE s.metric = 'play' AND s.day >= ? GROUP BY s.label ORDER BY n DESC LIMIT 5`,
    ).bind(since).all(),
    env.DB.prepare("SELECT label, SUM(count) AS n FROM stats WHERE metric = 'cta' AND day >= ? GROUP BY label ORDER BY n DESC").bind(since).all(),
    env.DB.prepare("SELECT COALESCE(SUM(count), 0) AS n FROM stats WHERE metric = 'msg' AND day >= ?").bind(since).first(),
    env.DB.prepare('SELECT COUNT(*) AS n FROM messages WHERE is_read = 0').first(),
    env.DB.prepare('SELECT COUNT(*) AS total, COALESCE(SUM(published), 0) AS published FROM projects').first(),
    getSite(env),
    env.DB.prepare("SELECT value FROM settings WHERE key = 'pw_changed'").first(),
  ]);

  const byDay = new Map(views.results.map((r) => [r.day, r.count]));
  const series = days.map((day) => ({ day, views: byDay.get(day) || 0 }));
  return json({
    series,
    views7: series.filter((d) => d.day >= since7).reduce((a, d) => a + d.views, 0),
    views30: series.reduce((a, d) => a + d.views, 0),
    refs: refs.results,
    plays: plays.results.map((p) => ({ id: p.id, title: p.title || '(silinmiş çalışma)', n: p.n })),
    cta: cta.results,
    messages30: msgs.n,
    unread: unread.n,
    projects: { total: projects.total, published: projects.published },
    setup: {
      password: Boolean(pw),
      project: projects.total > 0,
      portrait: Boolean(site.about.photo),
      mail: Boolean((env.RESEND_API_KEY && env.CONTACT_TO) || (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID)),
    },
  });
});
