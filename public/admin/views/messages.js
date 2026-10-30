import { state, hooks, h, icon, toast, api, confirmDialog, relTime, fmtDate } from '../core.js';

let filter = 'all'; // 'all' | 'new'

// Adres kodlanır (? & = gibi karakterler mailto parametresi sayılmasın); yalnızca @ okunur kalır.
const mailAddr = (email) => encodeURIComponent(email).replace('%40', '@');

function waLink(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  return d.length >= 10 ? `https://wa.me/90${d.slice(-10)}` : '';
}

export function messagesView() {
  const unread = state.messages.filter((m) => !m.is_read);
  const list = filter === 'new' ? unread : state.messages;

  const markAll = async () => {
    try {
      await api('/api/admin/messages/read-all', { method: 'POST' });
      state.messages.forEach((m) => { m.is_read = 1; });
      toast('Tüm mesajlar okundu olarak işaretlendi.');
      hooks.render();
    } catch (err) { toast(err.message); }
  };

  const bar = h('div', { class: 'msg-bar' },
    h('div', { class: 'seg', role: 'group', 'aria-label': 'Mesajları filtrele' },
      h('button', { type: 'button', 'aria-pressed': String(filter === 'all'), onclick: () => { filter = 'all'; hooks.render(); } }, `Tümü (${state.messages.length})`),
      h('button', { type: 'button', 'aria-pressed': String(filter === 'new'), onclick: () => { filter = 'new'; hooks.render(); } }, `Yeni (${unread.length})`)),
    unread.length ? h('button', { class: 'btn btn-sm', type: 'button', onclick: markAll }, icon('check', 16), 'Hepsini okundu yap') : null);

  if (!state.messages.length) {
    return h('div', {}, h('p', { class: 'empty' }, 'Henüz mesaj yok. İletişim formundan gelen mesajlar burada görünür.'));
  }

  return h('div', {}, bar,
    list.length ? list.map((m) => h('article', { class: `message${m.is_read ? '' : ' unread'}` },
      h('h3', {}, m.name, !m.is_read ? h('span', { class: 'badge badge-live' }, 'Yeni') : null),
      h('p', { class: 'meta', title: fmtDate(m.created_at) }, relTime(m.created_at), m.subject ? `, konu: ${m.subject}` : '',
        m.mailed ? ', e-posta ile de iletildi' : ', e-posta gönderilmedi (yalnızca burada)'),
      h('p', { class: 'meta' }, h('a', { href: `mailto:${mailAddr(m.email)}` }, m.email), m.phone ? h('span', {}, ` / ${m.phone}`) : null),
      h('p', { class: 'body' }, m.body),
      h('div', { class: 'actions' },
        h('a', { class: 'btn btn-sm btn-primary', href: `mailto:${mailAddr(m.email)}?subject=${encodeURIComponent(`Re: ${m.subject || 'Mesajınız'}`)}` }, icon('mail', 16), 'E-postayla yanıtla'),
        waLink(m.phone) ? h('a', { class: 'btn btn-sm', href: waLink(m.phone), target: '_blank', rel: 'noopener noreferrer' }, 'WhatsApp\'tan yaz') : null,
        h('button', { class: 'btn btn-sm', type: 'button', onclick: async () => {
          try { await api(`/api/admin/messages/${m.id}`, { method: 'PATCH', json: { is_read: !m.is_read } }); m.is_read = m.is_read ? 0 : 1; hooks.render(); } catch (err) { toast(err.message); }
        } }, m.is_read ? 'Okunmadı yap' : 'Okundu yap'),
        h('button', { class: 'btn btn-sm btn-danger', type: 'button', onclick: async () => {
          if (!(await confirmDialog(`${m.name} adlı kişinin mesajı silinecek. Emin misiniz?`))) return;
          try { await api(`/api/admin/messages/${m.id}`, { method: 'DELETE' }); state.messages = state.messages.filter((x) => x.id !== m.id); hooks.render(); } catch (err) { toast(err.message); }
        } }, 'Sil'))))
      : h('p', { class: 'empty' }, 'Okunmamış mesaj yok. Hepsini okudunuz.'));
}
