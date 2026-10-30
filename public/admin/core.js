// Panelin ortak parçaları: durum, DOM yardımcıları, API, bildirim, onay penceresi, simgeler.
// Tüm arayüz DOM API ile kurulur (innerHTML yok), bu yüzden XSS'e kapalıdır.

export const state = {
  csrf: '',
  config: null,
  projects: [],
  site: null,
  messages: [],
  stats: null,
  tab: 'home',
  editingId: null,
  dirty: false, // site içeriğinde kaydedilmemiş değişiklik var mı
};

// Ana dosya (admin.js) kendi işlevlerini buraya bağlar; görünümler döngüsel içe aktarma olmadan çağırır.
export const hooks = { render: () => {}, showLogin: () => {}, go: () => {} };

export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  let value;
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k === 'class') el.className = v;
    else if (k === 'value') value = v;
    else if (k === 'checked') el.checked = Boolean(v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  if (value !== undefined) el.value = value;
  return el;
}

// ---- Simgeler (süs; ekran okuyucudan gizli) ----
const NS = 'http://www.w3.org/2000/svg';
const ICONS = {
  home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  video: 'M3 6h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zM17 10l5-3v10l-5-3',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',
  mail: 'M3 6h18v12H3zM3 7l9 7 9-7',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  plus: 'M12 5v14M5 12h14',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  share: 'M4 13v7h16v-7M12 3v12M7 8l5-5 5 5',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  up: 'M12 19V5M6 11l6-6 6 6',
  down: 'M12 5v14M6 13l6 6 6-6',
  check: 'M5 12l5 5 9-10',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  help: 'M9 9a3 3 0 1 1 4.2 2.7c-.8.4-1.2 1-1.2 1.8M12 17h.01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
  image: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M9 9.5h.01',
};
export function icon(name, size = 22) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('class', 'ico');
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', ICONS[name] || '');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '2');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  svg.append(path);
  return svg;
}

// ---- Bildirim ----
const toastEl = document.getElementById('toast');
let toastTimer;
export function toast(text, ms = 3600) {
  toastEl.textContent = text;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms);
}

// ---- Biçimlendirme ----
export function fmtBytes(n) {
  if (n >= 1048576) return `${(n / 1048576).toFixed(n >= 10485760 ? 0 : 1)} MB`;
  return `${Math.max(1, Math.round(n / 1024))} KB`;
}
const parseDate = (s) => new Date(String(s).replace(' ', 'T') + 'Z');
export function fmtDate(s) {
  const d = parseDate(s);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });
}
export function relTime(s) {
  const d = parseDate(s);
  if (Number.isNaN(d.getTime())) return '';
  const sec = Math.round((Date.now() - d.getTime()) / 1000);
  if (sec < 90) return 'az önce';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} dakika önce`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} saat önce`;
  const day = Math.round(hr / 24);
  if (day < 8) return `${day} gün önce`;
  return fmtDate(s);
}
export function setMsg(el, kind, text) { el.dataset.state = kind; el.textContent = text; }

// ---- API (CSRF belirteci her yazma isteğine eklenir) ----
export async function api(path, { method = 'GET', json, body } = {}) {
  const opts = { method, credentials: 'same-origin', headers: {} };
  if (method !== 'GET') opts.headers['x-csrf-token'] = state.csrf;
  if (json !== undefined) {
    opts.headers['content-type'] = 'application/json';
    opts.body = JSON.stringify(json);
  } else if (body !== undefined) {
    opts.body = body;
  }
  const res = await fetch(path, opts);
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && !path.startsWith('/api/auth/')) {
    hooks.showLogin('Oturum süresi doldu. Lütfen tekrar giriş yapın.');
    throw new Error('Oturum süresi doldu.');
  }
  if (!res.ok) throw new Error(data.error || 'İşlem başarısız oldu.');
  return data;
}

// ---- Onay penceresi ----
export function confirmDialog(text, okLabel = 'Sil') {
  return new Promise((resolve) => {
    const dlg = h('dialog', { class: 'confirm', 'aria-label': 'Onay' },
      h('p', {}, text),
      h('div', { class: 'actions' },
        h('button', { class: 'btn btn-danger', type: 'button', 'data-ok': '' }, okLabel),
        h('button', { class: 'btn', type: 'button', 'data-cancel': '' }, 'Vazgeç')));
    document.body.append(dlg);
    const done = (v) => { dlg.close(); dlg.remove(); resolve(v); };
    dlg.querySelector('[data-ok]').addEventListener('click', () => done(true));
    dlg.querySelector('[data-cancel]').addEventListener('click', () => done(false));
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); done(false); });
    dlg.showModal();
    dlg.querySelector('[data-cancel]').focus();
  });
}

// Açılır grup (details/summary): klavye ve ekran okuyucu ile uyumlu
export function group(title, hint, ...content) {
  return h('details', { class: 'group' },
    h('summary', {}, h('span', { class: 'group-title' }, title), hint ? h('span', { class: 'group-hint' }, hint) : null),
    h('div', { class: 'group-body stack' }, content));
}

// Başlıktan kategori tahmini: kullanıcı seçmek zorunda kalmasın
const GUESS = [
  [/klip|şarkı|sarki|müzik|muzik|album|albüm/i, 'muzik-klibi'],
  [/drone|dron|emlak|havadan|arsa|konum/i, 'drone'],
  [/reklam|spot|kampanya|ürün|urun/i, 'reklam'],
  [/tanıtım|tanitim|kurumsal|firma|şirket|sirket/i, 'tanitim'],
  [/fotoğraf|fotograf|foto|çekim\s*günü|konsept/i, 'fotograf'],
  [/yapay\s*zek|\bai\b|ai\s/i, 'yapay-zeka'],
];
export function guessCategory(title) {
  for (const [re, cat] of GUESS) if (re.test(title || '')) return cat;
  return null;
}
