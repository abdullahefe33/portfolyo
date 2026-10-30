import { state, hooks, h, icon, toast } from '../core.js';

const CTA_LABEL = { tel: 'Telefonla arama', whatsapp: 'WhatsApp', instagram: 'Instagram', form: '"Teklif iste" düğmeleri' };
const fmtDay = (day) => new Date(`${day}T12:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

function statCard(label, value) {
  return h('div', { class: 'stat' }, h('p', { class: 'stat-v' }, String(value)), h('p', { class: 'stat-l' }, label));
}

function rankList(title, rows, labelOf, empty) {
  return h('div', { class: 'card' },
    h('h2', {}, title),
    rows.length
      ? h('ol', { class: 'rank' }, rows.map((r) => h('li', {}, h('span', {}, labelOf(r)), h('strong', {}, String(r.n)))))
      : h('p', { class: 'hint' }, empty || 'Henüz veri yok. Ziyaretçiler geldikçe burada görünür.'));
}

function barChart(series) {
  const max = Math.max(1, ...series.map((d) => d.views));
  const total = series.reduce((a, d) => a + d.views, 0);
  const bars = series.map((d) => {
    const bar = h('span', { class: 'bar', title: `${fmtDay(d.day)}: ${d.views} ziyaret` }, h('i', {}));
    bar.firstChild.style.height = `${Math.max(2, Math.round((d.views / max) * 100))}%`; // CSSOM: CSP ile uyumlu
    return bar;
  });
  return h('div', {},
    h('div', { class: 'chart', role: 'img', 'aria-label': `Son 30 günün günlük ziyaret sayısı. Toplam ${total}, en yoğun gün ${max} ziyaret.` }, bars),
    h('p', { class: 'chart-axis', 'aria-hidden': 'true' }, h('span', {}, fmtDay(series[0].day)), h('span', {}, `En yüksek: ${max}`), h('span', {}, 'Bugün')));
}

async function shareSite() {
  const url = `${location.origin}/`;
  try {
    if (navigator.share) { await navigator.share({ title: document.title, url }); return; }
    await navigator.clipboard.writeText(url);
    toast('Site bağlantısı kopyalandı.');
  } catch { /* paylaşım penceresi kapatıldı */ }
}

export function homeView() {
  const s = state.stats;
  if (!s) return h('p', { class: 'empty' }, 'İstatistikler yüklenemedi.');
  const igLink = `${location.origin}/?utm_source=instagram`;

  const todo = [
    { done: s.setup.password, text: 'Parolanızı değiştirin', note: 'İlk parola size başkası tarafından iletildi; kendi parolanızı seçin.', go: ['account', 'Parolayı değiştir'] },
    { done: s.setup.project, text: 'İlk videonuzu ekleyin', note: 'YouTube bağlantısını yapıştırmanız yeterli.', go: ['projects', 'Video ekle'] },
    { done: s.setup.portrait, text: 'Portre fotoğrafınızı yükleyin', note: 'Yüklemezseniz sitede kamera maskotu görünür.', go: ['site', 'Site içeriğine git'] },
    { done: s.setup.mail, text: 'Mesajların telefonunuza bildirim olarak gelmesini kurun', note: 'Telegram ile ücretsiz ve kartsız; Hesap sekmesindeki "Sık sorulanlar" bölümünde adımlar var. Kurulana kadar mesajlar yalnızca bu panelde görünür.', go: ['account', 'Adımlara git'] },
  ];
  const pending = todo.filter((t) => !t.done);

  return h('div', {},
    h('div', { class: 'welcome' },
      h('h2', {}, 'Hoş geldiniz'),
      h('p', { class: 'hint' }, 'Sitenizi buradan yönetirsiniz. Sık yaptığınız işler aşağıda.')),
    h('div', { class: 'qa-row' },
      h('button', { class: 'qa qa-main', type: 'button', onclick: () => hooks.go('projects', '#v-url') }, icon('plus', 26), h('span', {}, 'Video ekle')),
      h('a', { class: 'qa', href: '/', target: '_blank', rel: 'noopener' }, icon('eye', 26), h('span', {}, 'Siteyi görüntüle')),
      h('button', { class: 'qa', type: 'button', onclick: shareSite }, icon('share', 26), h('span', {}, 'Siteyi paylaş')),
      h('button', { class: 'qa', type: 'button', onclick: () => hooks.go('messages') }, icon('mail', 26), h('span', {}, 'Mesajlara bak'), s.unread ? h('b', { class: 'qa-badge' }, String(s.unread)) : null)),

    pending.length
      ? h('div', { class: 'card stack' },
        h('h2', {}, 'Yapılacaklar'),
        h('p', { class: 'hint' }, 'Sitenizi tam hâle getirmek için kalan adımlar:'),
        h('ul', { class: 'todo' }, pending.map((t) => h('li', {},
          h('span', { class: 'badge' }, 'Yapılacak'),
          h('span', { class: 'todo-text' }, h('strong', {}, t.text), h('em', { class: 'hint' }, ` ${t.note}`)),
          t.go ? h('button', { class: 'btn btn-sm', type: 'button', onclick: () => hooks.go(t.go[0]) }, t.go[1]) : null))))
      : h('div', { class: 'card ok-card' }, icon('check', 24), h('p', {}, h('strong', {}, 'Her şey hazır.'), ' Kurulum adımlarının hepsi tamam.')),

    h('div', { class: 'stats' },
      statCard('Son 7 gün ziyaret', s.views7),
      statCard('Son 30 gün ziyaret', s.views30),
      statCard('Okunmamış mesaj', s.unread),
      statCard('Yayındaki çalışma', s.projects.published)),
    h('div', { class: 'card' },
      h('h2', {}, 'Günlük ziyaret (son 30 gün)'),
      h('p', { class: 'hint' }, 'Çerez ve kişisel veri tutulmaz; robotlar sayılmaz. Sayılar yaklaşıktır.'),
      barChart(s.series)),
    h('div', { class: 'cols2' },
      rankList('Ziyaretçiler nereden geliyor', s.refs, (r) => r.label),
      rankList('En çok izlenen çalışmalar', s.plays, (r) => r.title, 'Henüz izlenme yok. Bir çalışma eklediğinizde burada görünür.')),
    h('div', { class: 'cols2' },
      rankList('Tıklanan iletişim yolları', s.cta, (r) => CTA_LABEL[r.label] || r.label),
      h('div', { class: 'card' }, h('h2', {}, 'Son 30 günde gelen mesaj'), h('p', { class: 'stat-v' }, String(s.messages30)))),
    h('div', { class: 'card stack' },
      h('div', {}, h('h2', {}, 'Instagram bağlantınız'),
        h('p', { class: 'hint' }, 'Bunu Instagram biyografinize koyarsanız, kaç kişinin oradan geldiğini yukarıda "instagram" olarak görürsünüz.')),
      h('input', { type: 'text', readonly: true, value: igLink, 'aria-label': 'Instagram için site bağlantısı' }),
      h('div', { class: 'actions' }, h('button', { class: 'btn btn-sm', type: 'button', onclick: async () => {
        try { await navigator.clipboard.writeText(igLink); toast('Bağlantı kopyalandı.'); } catch { toast('Kopyalanamadı; metni elle seçin.'); }
      } }, 'Bağlantıyı kopyala'))));
}
