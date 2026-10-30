// Yedek: site metinleri, çalışmalar, mesajlar ve sayaçlar. Parola özeti ve oturumlar dahil edilmez.
import { handler } from '../../../lib/http.js';
import { dayKey } from '../../../lib/stats.js';
import { getSite } from '../../../lib/content.js';

export const onRequestGet = handler(async ({ env }) => {
  const [projects, messages, stats] = await Promise.all([
    env.DB.prepare('SELECT * FROM projects ORDER BY sort_order, created_at').all(),
    env.DB.prepare('SELECT * FROM messages ORDER BY created_at').all(),
    env.DB.prepare('SELECT * FROM stats ORDER BY day').all(),
  ]);
  const body = JSON.stringify({
    about: 'Portfolyo yedeği. Görseller (kapak, portre) bu dosyada yoktur; çalışmalar YouTube/Vimeo bağlantısı olarak durur.',
    exportedAt: new Date().toISOString(),
    site: await getSite(env),
    projects: projects.results,
    messages: messages.results,
    stats: stats.results,
  }, null, 2);
  return new Response(body, {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="portfolyo-yedek-${dayKey()}.json"`,
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
});
