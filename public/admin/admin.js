// Yönetim paneli: giriş, sekmeler ve yönlendirme. Görünümler ./views/ altındadır.
import { state, hooks, h, icon, api, setMsg, confirmDialog } from './core.js';
import { homeView } from './views/home.js';
import { projectsView } from './views/projects.js';
import { siteView } from './views/site.js';
import { messagesView } from './views/messages.js';
import { accountView } from './views/account.js';

const app = document.getElementById('app');

// ---------- Giriş ----------
function showLogin(notice = '') {
  app.removeAttribute('aria-busy');
  const msg = h('p', { class: 'msg', role: 'alert' }, notice);
  if (notice) msg.dataset.state = 'error';
  const pass = h('input', { id: 'p', name: 'password', type: 'password', autocomplete: 'current-password', required: true });
  const form = h('form', { class: 'login stack', novalidate: true },
    h('h1', {}, 'Yönetim paneli'),
    h('p', { class: 'hint' }, 'Devam etmek için giriş yapın.'),
    h('div', { class: 'field' }, h('label', { for: 'u' }, 'Kullanıcı adı'), h('input', { id: 'u', name: 'username', type: 'text', autocomplete: 'username', required: true })),
    h('div', { class: 'field' }, h('label', { for: 'p' }, 'Parola'), pass),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', onchange: (e) => { pass.type = e.target.checked ? 'text' : 'password'; } }), 'Yazarken göster'),
    h('button', { class: 'btn btn-primary btn-lg', type: 'submit' }, 'Giriş yap'),
    msg);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      const r = await api('/api/auth/login', { method: 'POST', json: { username: form.username.value, password: pass.value } });
      state.csrf = r.csrf;
      await start();
    } catch (err) {
      setMsg(msg, 'error', err.message);
      pass.value = '';
      pass.focus();
    } finally {
      btn.disabled = false;
    }
  });
  app.replaceChildren(form);
  form.username.focus();
}

// ---------- Kabuk ----------
const TABS = [
  ['home', 'Genel bakış', 'home'],
  ['projects', 'Çalışmalar', 'video'],
  ['site', 'Site içeriği', 'edit'],
  ['messages', 'Mesajlar', 'mail'],
  ['account', 'Hesap', 'user'],
];

async function switchTab(id) {
  if (state.tab === id) return;
  if (state.dirty && state.tab === 'site') {
    if (!(await confirmDialog('Site içeriğinde kaydedilmemiş değişiklikler var. Kaydetmeden çıkarsanız kaybolur.', 'Kaydetmeden çık'))) return;
    state.dirty = false;
    state.site = await api('/api/admin/site'); // yarım kalan değişiklikleri at
  }
  state.tab = id;
  state.editingId = null;
  if (id === 'home' || id === 'messages') {
    try {
      if (id === 'home') state.stats = await api('/api/admin/stats');
      else state.messages = await api('/api/admin/messages');
    } catch { /* eski veriyle devam */ }
  }
  hooks.render();
  window.scrollTo(0, 0);
}

function shell(content) {
  const unread = state.messages.filter((m) => !m.is_read).length;
  document.title = `${unread ? `(${unread}) ` : ''}Yönetim paneli`;
  const bar = h('div', { class: 'tabbar', role: 'tablist', 'aria-label': 'Bölümler' },
    TABS.map(([id, label, ico]) => h('button', {
      class: 'tab', role: 'tab', type: 'button', id: `tab-${id}`, 'aria-selected': String(state.tab === id), 'aria-controls': 'panel',
      onclick: () => switchTab(id),
    }, icon(ico, 22), h('span', { class: 'tab-label' }, label), id === 'messages' && unread ? h('span', { class: 'count', 'aria-label': `${unread} okunmamış` }, unread) : null)));
  app.removeAttribute('aria-busy');
  app.replaceChildren(h('div', { class: 'shell' },
    h('header', { class: 'top' },
      h('h1', {}, 'Yönetim paneli'),
      h('div', { class: 'top-actions' },
        h('a', { class: 'btn btn-sm', href: '/', target: '_blank', rel: 'noopener' }, icon('eye', 16), 'Siteyi aç'),
        h('button', { class: 'btn btn-sm', type: 'button', onclick: logout }, 'Çıkış yap'))),
    bar,
    h('section', { id: 'panel', role: 'tabpanel', 'aria-labelledby': `tab-${state.tab}` }, content)));
}

async function logout() {
  if (state.dirty && !(await confirmDialog('Kaydedilmemiş değişiklikler var. Yine de çıkılsın mı?', 'Çıkış yap'))) return;
  try { await api('/api/auth/logout', { method: 'POST' }); } catch { /* oturum zaten kapalı olabilir */ }
  state.csrf = '';
  state.dirty = false;
  showLogin();
}

function render() {
  if (state.tab === 'home') shell(homeView());
  else if (state.tab === 'projects') shell(projectsView());
  else if (state.tab === 'site') shell(siteView(render));
  else if (state.tab === 'messages') shell(messagesView());
  else shell(accountView());
}

async function go(tab, focusSelector) {
  await switchTab(tab);
  if (focusSelector) {
    const el = document.querySelector(focusSelector);
    if (el) { el.scrollIntoView({ block: 'center' }); el.focus(); }
  }
}

hooks.render = render;
hooks.showLogin = showLogin;
hooks.go = go;

// Kaydedilmemiş içerik varken sayfadan ayrılma uyarısı
window.addEventListener('beforeunload', (e) => { if (state.dirty) { e.preventDefault(); e.returnValue = ''; } });

// ---------- Başlangıç ----------
async function start() {
  state.config = await api('/api/admin/config');
  [state.projects, state.site, state.messages, state.stats] = await Promise.all([
    api('/api/admin/projects'), api('/api/admin/site'), api('/api/admin/messages'), api('/api/admin/stats'),
  ]);
  state.tab = 'home';
  state.dirty = false;
  render();
}

(async () => {
  try {
    const me = await api('/api/auth/me');
    if (me.authenticated) {
      state.csrf = me.csrf;
      await start();
    } else {
      showLogin();
    }
  } catch {
    showLogin();
  }
})();
