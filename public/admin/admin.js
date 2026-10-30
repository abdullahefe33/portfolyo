// Yönetim paneli. Tüm içerik DOM API ile oluşturulur (innerHTML kullanılmaz) -> XSS'e kapalı.
const app = document.getElementById('app');
const toastEl = document.getElementById('toast');
let csrf = '';
let config = null;
let tab = 'home';
let stats = null;
let projects = [];
let site = null;
let messages = [];
let editingId = null;

// ---------- Yardımcılar ----------
function h(tag, attrs = {}, ...kids) {
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

let toastTimer;
function toast(text) {
  toastEl.textContent = text;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3200);
}

function fmtBytes(n) {
  if (n >= 1048576) return `${(n / 1048576).toFixed(n >= 10485760 ? 0 : 1)} MB`;
  return `${Math.max(1, Math.round(n / 1024))} KB`;
}
function fmtDate(s) {
  const d = new Date(String(s).replace(' ', 'T') + 'Z');
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });
}

async function api(path, { method = 'GET', json, body } = {}) {
  const opts = { method, credentials: 'same-origin', headers: {} };
  if (method !== 'GET') opts.headers['x-csrf-token'] = csrf;
  if (json !== undefined) {
    opts.headers['content-type'] = 'application/json';
    opts.body = JSON.stringify(json);
  } else if (body !== undefined) {
    opts.body = body;
  }
  const res = await fetch(path, opts);
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && !path.startsWith('/api/auth/')) {
    showLogin('Oturum süresi doldu. Lütfen tekrar giriş yapın.');
    throw new Error('Oturum süresi doldu.');
  }
  if (!res.ok) throw new Error(data.error || 'İşlem başarısız oldu.');
  return data;
}

function confirmDialog(text, okLabel = 'Sil') {
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

function setMsg(el, state, text) { el.dataset.state = state; el.textContent = text; }

// ---------- Giriş ----------
function showLogin(notice = '') {
  app.removeAttribute('aria-busy');
  const msg = h('p', { class: 'msg', role: 'alert' }, notice);
  if (notice) msg.dataset.state = 'error';
  const form = h('form', { class: 'login stack', novalidate: true },
    h('h1', {}, 'Yönetim paneli'),
    h('p', { class: 'hint' }, 'Devam etmek için giriş yapın.'),
    h('div', { class: 'field' }, h('label', { for: 'u' }, 'Kullanıcı adı'), h('input', { id: 'u', name: 'username', type: 'text', autocomplete: 'username', required: true })),
    h('div', { class: 'field' }, h('label', { for: 'p' }, 'Parola'), h('input', { id: 'p', name: 'password', type: 'password', autocomplete: 'current-password', required: true })),
    h('button', { class: 'btn btn-primary', type: 'submit' }, 'Giriş yap'),
    msg);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button');
    btn.disabled = true;
    try {
      const r = await api('/api/auth/login', { method: 'POST', json: { username: form.username.value, password: form.password.value } });
      csrf = r.csrf;
      await start();
    } catch (err) {
      setMsg(msg, 'error', err.message);
      form.password.value = '';
      form.password.focus();
    } finally {
      btn.disabled = false;
    }
  });
  app.replaceChildren(form);
  form.username.focus();
}

// ---------- Kabuk ----------
const TABS = [['home', 'Genel bakış'], ['projects', 'Çalışmalar'], ['site', 'Site içeriği'], ['messages', 'Mesajlar'], ['account', 'Hesap']];

function shell(content) {
  const unread = messages.filter((m) => !m.is_read).length;
  const bar = h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Bölümler' },
    TABS.map(([id, label]) => h('button', {
      class: 'tab', role: 'tab', type: 'button', id: `tab-${id}`, 'aria-selected': String(tab === id), 'aria-controls': 'panel',
      onclick: async () => {
        tab = id; editingId = null;
        if (id === 'home') { try { stats = await api('/api/admin/stats'); } catch { /* eski veriyle devam */ } }
        render();
      },
    }, label, id === 'messages' && unread ? h('span', { class: 'count', 'aria-label': `${unread} okunmamış` }, unread) : null)));
  app.removeAttribute('aria-busy');
  app.replaceChildren(h('div', { class: 'shell' },
    h('header', { class: 'top' },
      h('h1', {}, 'Yönetim paneli'),
      h('div', { class: 'top-actions' },
        h('a', { class: 'btn btn-sm', href: '/', target: '_blank', rel: 'noopener' }, 'Siteyi aç'),
        h('button', { class: 'btn btn-sm', type: 'button', onclick: logout }, 'Çıkış yap'))),
    bar,
    h('section', { id: 'panel', role: 'tabpanel', 'aria-labelledby': `tab-${tab}` }, content)));
}

async function logout() {
  try { await api('/api/auth/logout', { method: 'POST' }); } catch { /* oturum zaten kapalı olabilir */ }
  csrf = '';
  showLogin();
}

async function render() {
  if (tab === 'home') shell(homeView());
  else if (tab === 'projects') shell(projectsView());
  else if (tab === 'site') shell(siteView());
  else if (tab === 'messages') shell(messagesView());
  else shell(accountView());
}

async function loadAll() {
  [projects, site, messages, stats] = await Promise.all([api('/api/admin/projects'), api('/api/admin/site'), api('/api/admin/messages'), api('/api/admin/stats')]);
}

// ---------- Yükleme ----------
async function putWithRetry(path, blob, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      return await api(path, { method: 'PUT', body: blob });
    } catch (err) {
      if (i >= tries || /Oturum|geçersiz|aştı|büyük|değil/i.test(err.message)) throw err;
      await new Promise((r) => setTimeout(r, 800 * i));
    }
  }
}

async function uploadVideo(file, onProgress) {
  const { id } = await api('/api/admin/uploads', { method: 'POST', json: { name: file.name, size: file.size } });
  const chunk = config.chunkBytes;
  const total = Math.ceil(file.size / chunk);
  try {
    for (let n = 1; n <= total; n++) {
      await putWithRetry(`/api/admin/uploads/${id}/parts/${n}`, file.slice((n - 1) * chunk, Math.min(n * chunk, file.size)));
      onProgress(Math.min(n * chunk, file.size) / file.size);
    }
    return await api(`/api/admin/uploads/${id}/complete`, { method: 'POST' });
  } catch (err) {
    api(`/api/admin/uploads/${id}`, { method: 'DELETE' }).catch(() => {});
    throw err;
  }
}

// Görseli tarayıcıda küçültür; sunucu sınırının altında tutar (görseller veritabanında saklanır).
async function shrinkImage(file, maxSide = 1280) {
  const limit = config.maxImageBytes * 0.9;
  if (file.size <= 150 * 1024 && /^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  let bitmap;
  try { bitmap = await createImageBitmap(file); } catch { throw new Error('Bu görsel okunamadı. JPG, PNG veya WebP seçin.'); }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(bitmap.width * scale));
  c.height = Math.max(1, Math.round(bitmap.height * scale));
  c.getContext('2d').drawImage(bitmap, 0, 0, c.width, c.height);
  for (const type of ['image/webp', 'image/jpeg']) {
    for (const q of [0.88, 0.75, 0.6, 0.45]) {
      const blob = await new Promise((r) => c.toBlob(r, type, q));
      if (blob && blob.type === type && blob.size <= limit) return blob;
    }
  }
  throw new Error('Görsel çok büyük. Daha küçük bir görsel seçin.');
}

async function uploadImage(file, purpose, maxSide) {
  const blob = await shrinkImage(file, maxSide);
  const r = await api(`/api/admin/images?purpose=${purpose}`, { method: 'POST', body: blob });
  return r.key;
}

// Videonun bir karesinden kapak görseli üretir (tarayıcı kodeği desteklemiyorsa null döner).
async function frameFromVideo(file) {
  const url = URL.createObjectURL(file);
  try {
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'metadata'; v.src = url;
    await new Promise((res, rej) => { v.onloadedmetadata = res; v.onerror = rej; setTimeout(rej, 10000); });
    const seeked = new Promise((res, rej) => { v.onseeked = res; setTimeout(rej, 10000); });
    v.currentTime = Math.min(1, (v.duration || 2) / 2);
    await seeked;
    const c = document.createElement('canvas');
    c.width = 1280; c.height = 720;
    const ctx = c.getContext('2d');
    const scale = Math.max(c.width / v.videoWidth, c.height / v.videoHeight);
    const w = v.videoWidth * scale; const hh = v.videoHeight * scale;
    ctx.drawImage(v, (c.width - w) / 2, (c.height - hh) / 2, w, hh);
    for (const [type, q] of [['image/webp', 0.85], ['image/jpeg', 0.85]]) {
      const blob = await new Promise((r) => c.toBlob(r, type, q));
      if (blob && blob.type === type) return blob;
    }
    return null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ---------- Genel bakış ----------
const CTA_LABEL = { tel: 'Telefonla arama', whatsapp: 'WhatsApp', instagram: 'Instagram', form: '"Teklif iste" düğmeleri' };
const fmtDay = (day) => new Date(`${day}T12:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

function statCard(label, value) {
  return h('div', { class: 'stat' }, h('p', { class: 'stat-v' }, String(value)), h('p', { class: 'stat-l' }, label));
}

function rankList(title, rows, labelOf) {
  return h('div', { class: 'card' },
    h('h2', {}, title),
    rows.length
      ? h('ol', { class: 'rank' }, rows.map((r) => h('li', {}, h('span', {}, labelOf(r)), h('strong', {}, String(r.n)))))
      : h('p', { class: 'hint' }, 'Henüz veri yok. Ziyaretçiler geldikçe burada görünür.'));
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

function homeView() {
  if (!stats) return h('p', { class: 'empty' }, 'İstatistikler yüklenemedi.');
  const igLink = `${location.origin}/?utm_source=instagram`;
  const todo = [
    { done: stats.setup.project, text: 'İlk videonuzu ekleyin', go: ['projects', 'Çalışmalara git'] },
    { done: stats.setup.portrait, text: 'Portre fotoğrafınızı yükleyin (Hakkımda bölümünde görünür)', go: ['site', 'Site içeriğine git'] },
    { done: stats.setup.mail, text: 'Mesajların e-postanıza da gelmesini kurun', note: 'Kurulana kadar mesajlar yalnızca bu panelde görünür.' },
  ];
  return h('div', {},
    h('div', { class: 'stats' },
      statCard('Son 7 gün ziyaret', stats.views7),
      statCard('Son 30 gün ziyaret', stats.views30),
      statCard('Okunmamış mesaj', stats.unread),
      statCard('Yayındaki çalışma', stats.projects.published)),
    h('div', { class: 'card' },
      h('h2', {}, 'Günlük ziyaret (son 30 gün)'),
      h('p', { class: 'hint' }, 'Çerez ve kişisel veri tutulmaz; robotlar sayılmaz. Sayılar yaklaşıktır.'),
      barChart(stats.series)),
    h('div', { class: 'cols2' },
      rankList('Ziyaretçiler nereden geliyor', stats.refs, (r) => r.label),
      rankList('En çok izlenen çalışmalar', stats.plays, (r) => r.title)),
    h('div', { class: 'cols2' },
      rankList('Tıklanan iletişim yolları', stats.cta, (r) => CTA_LABEL[r.label] || r.label),
      h('div', { class: 'card' }, h('h2', {}, 'Son 30 günde gelen mesaj'), h('p', { class: 'stat-v' }, String(stats.messages30)))),
    h('div', { class: 'card stack' },
      h('h2', {}, 'Kurulum kontrol listesi'),
      h('ul', { class: 'todo' }, todo.map((t) => h('li', {},
        h('span', { class: t.done ? 'badge badge-live' : 'badge' }, t.done ? 'Tamam' : 'Yapılacak'),
        h('span', {}, t.text, !t.done && t.note ? h('em', { class: 'hint' }, ` ${t.note}`) : null),
        !t.done && t.go ? h('button', { class: 'btn btn-sm', type: 'button', onclick: () => { tab = t.go[0]; render(); } }, t.go[1]) : null)))),
    h('div', { class: 'card stack' },
      h('div', {}, h('h2', {}, 'Instagram bağlantınız'),
        h('p', { class: 'hint' }, 'Bu bağlantıyı Instagram biyografinize koyarsanız, kaç kişinin oradan geldiğini yukarıda "instagram" olarak görürsünüz.')),
      h('input', { type: 'text', readonly: true, value: igLink, 'aria-label': 'Instagram için site bağlantısı' }),
      h('div', { class: 'actions' }, h('button', { class: 'btn btn-sm', type: 'button', onclick: async () => {
        try { await navigator.clipboard.writeText(igLink); toast('Bağlantı kopyalandı.'); } catch { toast('Kopyalanamadı; metni elle seçin.'); }
      } }, 'Bağlantıyı kopyala'))));
}

// ---------- Çalışmalar ----------
function categorySelect(id, value) {
  return h('select', { id, name: 'category', value }, Object.entries(config.categories).map(([k, v]) => h('option', { value: k }, v)));
}

function projectsView() {
  return h('div', {}, uploadCard(), h('h2', { class: 'section-title' }, `Yayındaki ve taslak çalışmalar (${projects.length})`), projectList());
}

function uploadCard() {
  const canUpload = config.uploadEnabled;
  const maxMB = Math.round(config.maxVideoBytes / 1048576);
  let mode = 'link';
  let autoPoster = null;
  const msg = h('p', { class: 'msg', role: 'status' });
  const progress = h('progress', { max: '1', value: '0', 'aria-label': 'Yükleme ilerlemesi', hidden: true });
  const preview = h('img', { class: 'poster-preview', alt: 'Video kapak görseli önizlemesi', hidden: true });

  const urlInput = h('input', { id: 'v-url', type: 'url', placeholder: 'https://www.youtube.com/watch?v=…', autocomplete: 'off' });
  const urlMsg = h('p', { class: 'msg', role: 'status' });
  const fileInput = h('input', { id: 'v-file', type: 'file', accept: 'video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm' });
  const posterInput = h('input', { id: 'v-poster', type: 'file', accept: 'image/jpeg,image/png,image/webp' });
  const title = h('input', { id: 'v-title', type: 'text', maxlength: '120', required: true });
  const desc = h('textarea', { id: 'v-desc', maxlength: '1000' });
  const role = h('input', { id: 'v-role', type: 'text', maxlength: '120', placeholder: 'Çekim, kurgu, renk düzenleme' });
  const cat = categorySelect('v-cat', 'reklam');
  const published = h('input', { id: 'v-pub', type: 'checkbox', checked: true });

  // YouTube / Vimeo bağlantısı: doğrula, başlık ve küçük resmi getir.
  let previewSeq = 0;
  urlInput.addEventListener('change', async () => {
    const url = urlInput.value.trim();
    const seq = ++previewSeq;
    preview.hidden = true;
    if (!url) { setMsg(urlMsg, '', ''); return; }
    setMsg(urlMsg, '', 'Bağlantı kontrol ediliyor…');
    try {
      const info = await api(`/api/admin/link-preview?url=${encodeURIComponent(url)}`);
      if (seq !== previewSeq) return;
      setMsg(urlMsg, 'ok', `${info.provider === 'youtube' ? 'YouTube' : 'Vimeo'} videosu bulundu.`);
      if (info.title && !title.value) title.value = info.title;
      if (info.thumbnail) { preview.src = info.thumbnail; preview.hidden = false; }
    } catch (err) {
      if (seq === previewSeq) setMsg(urlMsg, 'error', err.message);
    }
  });

  fileInput.addEventListener('change', async () => {
    const f = fileInput.files[0];
    autoPoster = null; preview.hidden = true;
    if (!f) return;
    if (f.size > config.maxVideoBytes) { setMsg(msg, 'error', `Bu dosya ${fmtBytes(f.size)}. En fazla ${maxMB} MB yükleyebilirsiniz.`); return; }
    setMsg(msg, '', '');
    if (!title.value) title.value = f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 120);
    autoPoster = await frameFromVideo(f);
    if (autoPoster) { preview.src = URL.createObjectURL(autoPoster); preview.hidden = false; }
  });

  const linkPanel = h('div', { class: 'stack' },
    h('p', { class: 'hint' }, 'Videoyu önce YouTube\'a (veya Vimeo\'ya) yükleyin ve görünürlüğünü "Liste dışı" yapın: bağlantıya sahip olanlar izler, aramada çıkmaz. "Özel" yaparsanız sitede oynamaz.'),
    h('div', { class: 'field' }, h('label', { for: 'v-url' }, 'Video bağlantısı'), urlInput, urlMsg));
  const filePanel = h('div', { class: 'stack', hidden: true },
    h('p', { class: 'hint' }, `Dosya başına en fazla ${maxMB} MB. MP4 (H.264) önerilir; MOV ve WebM de kabul edilir. Kapak görseli videodan otomatik alınır.`),
    h('div', { class: 'field' }, h('label', { for: 'v-file' }, 'Video dosyası'), fileInput));

  const setMode = (m) => {
    mode = m;
    linkPanel.hidden = m !== 'link';
    filePanel.hidden = m !== 'file';
    seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
    preview.hidden = true;
    setMsg(msg, '', '');
  };
  const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Ekleme yöntemi', hidden: !canUpload },
    h('button', { type: 'button', 'data-mode': 'link', 'aria-pressed': 'true', onclick: () => setMode('link') }, 'YouTube / Vimeo bağlantısı'),
    h('button', { type: 'button', 'data-mode': 'file', 'aria-pressed': 'false', onclick: () => setMode('file') }, 'Dosya yükle'));

  const form = h('form', { class: 'card stack', novalidate: true },
    h('h2', {}, 'Yeni video ekle'),
    seg, linkPanel, filePanel,
    h('div', { class: 'row2' },
      h('div', { class: 'field' }, h('label', { for: 'v-title' }, 'Başlık'), title),
      h('div', { class: 'field' }, h('label', { for: 'v-cat' }, 'Kategori'), cat)),
    h('div', { class: 'field' }, h('label', { for: 'v-role' }, 'Bu projedeki rolüm (isteğe bağlı)'), role),
    h('div', { class: 'field' }, h('label', { for: 'v-desc' }, 'Açıklama (isteğe bağlı)'), desc),
    h('div', { class: 'field' }, h('label', { for: 'v-poster' }, 'Kendi kapak görselim (isteğe bağlı; yoksa videonun küçük resmi kullanılır)'), posterInput, preview),
    h('label', { class: 'check', for: 'v-pub' }, published, 'Sitede yayınla'),
    progress,
    h('div', { class: 'actions' }, h('button', { class: 'btn btn-primary', type: 'submit' }, 'Videoyu ekle')),
    msg);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    if (!title.value.trim()) { setMsg(msg, 'error', 'Lütfen bir başlık yazın.'); title.focus(); return; }
    const base = { title: title.value, description: desc.value, role: role.value, category: cat.value, published: published.checked };
    try {
      if (mode === 'link') {
        if (!urlInput.value.trim()) { setMsg(msg, 'error', 'Lütfen bir YouTube veya Vimeo bağlantısı yapıştırın.'); urlInput.focus(); return; }
        btn.disabled = true;
        setMsg(msg, '', 'Ekleniyor…');
        const custom = posterInput.files[0];
        const posterKey = custom ? await uploadImage(custom, 'poster', 1280) : null;
        await api('/api/admin/projects', { method: 'POST', json: { ...base, video_url: urlInput.value.trim(), poster_key: posterKey } });
      } else {
        const file = fileInput.files[0];
        if (!file) { setMsg(msg, 'error', 'Lütfen bir video seçin.'); return; }
        if (file.size > config.maxVideoBytes) { setMsg(msg, 'error', `En fazla ${maxMB} MB yükleyebilirsiniz.`); return; }
        btn.disabled = true; progress.hidden = false; progress.value = 0;
        setMsg(msg, '', 'Video yükleniyor…');
        const video = await uploadVideo(file, (p) => { progress.value = p; setMsg(msg, '', `Video yükleniyor… %${Math.round(p * 100)}`); });
        const custom = posterInput.files[0];
        const posterKey = custom ? await uploadImage(custom, 'poster', 1280) : autoPoster ? await uploadImage(autoPoster, 'poster', 1280) : null;
        await api('/api/admin/projects', { method: 'POST', json: { ...base, video_key: video.key, poster_key: posterKey } });
      }
      toast('Video eklendi.');
      projects = await api('/api/admin/projects');
      render();
    } catch (err) {
      setMsg(msg, 'error', err.message);
    } finally {
      btn.disabled = false; progress.hidden = true;
    }
  });
  return form;
}

function projectList() {
  if (!projects.length) return h('p', { class: 'empty' }, 'Henüz video eklenmedi. Yukarıdaki formdan ilk çalışmanızı ekleyin.');
  return h('ul', { class: 'projects' }, projects.map((p, i) => projectRow(p, i)));
}

const projectThumb = (p) => (p.poster_key ? `/media/${p.poster_key}` : (p.thumb_url || ''));

function projectRow(p, i) {
  const move = async (dir) => {
    const ids = projects.map((x) => x.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    try {
      await api('/api/admin/projects/reorder', { method: 'POST', json: { ids } });
      projects = await api('/api/admin/projects');
      render();
    } catch (err) { toast(err.message); }
  };
  const remove = async () => {
    if (!(await confirmDialog(`"${p.title}" sitenizden kalıcı olarak silinecek (YouTube'daki videonuz silinmez). Emin misiniz?`))) return;
    try {
      await api(`/api/admin/projects/${p.id}`, { method: 'DELETE' });
      toast('Video silindi.');
      await loadAll();
      render();
    } catch (err) { toast(err.message); }
  };
  const row = h('li', { class: 'project' },
    projectThumb(p) ? h('img', { class: 'thumb', src: projectThumb(p), alt: '', loading: 'lazy' }) : h('span', { class: 'thumb' }),
    h('div', {},
      h('h3', {}, p.title),
      h('p', { class: 'meta' }, `${config.categories[p.category] || p.category}, ${p.provider ? (p.provider === 'youtube' ? 'YouTube bağlantısı' : 'Vimeo bağlantısı') : fmtBytes(p.video_size)}`),
      h('span', { class: p.published ? 'badge badge-live' : 'badge' }, p.published ? 'Yayında' : 'Taslak (gizli)')),
    h('div', { class: 'actions' },
      h('button', { class: 'btn btn-sm', type: 'button', 'aria-label': `${p.title} yukarı taşı`, disabled: i === 0, onclick: () => move(-1) }, 'Yukarı'),
      h('button', { class: 'btn btn-sm', type: 'button', 'aria-label': `${p.title} aşağı taşı`, disabled: i === projects.length - 1, onclick: () => move(1) }, 'Aşağı'),
      h('button', { class: 'btn btn-sm', type: 'button', 'aria-expanded': String(editingId === p.id), onclick: () => { editingId = editingId === p.id ? null : p.id; render(); } }, 'Düzenle'),
      h('button', { class: 'btn btn-sm btn-danger', type: 'button', 'aria-label': `${p.title} sil`, onclick: remove }, 'Sil')));
  if (editingId === p.id) row.append(editForm(p));
  return row;
}

function editForm(p) {
  const msg = h('p', { class: 'msg', role: 'status' });
  const title = h('input', { type: 'text', id: `e-title-${p.id}`, value: p.title, maxlength: '120', required: true });
  const desc = h('textarea', { id: `e-desc-${p.id}`, maxlength: '1000', value: p.description });
  const cat = categorySelect(`e-cat-${p.id}`, p.category);
  const role = h('input', { type: 'text', id: `e-role-${p.id}`, value: p.role || '', maxlength: '120', placeholder: 'Çekim, kurgu, renk düzenleme' });
  const pub = h('input', { type: 'checkbox', id: `e-pub-${p.id}`, checked: Boolean(p.published) });
  const poster = h('input', { type: 'file', id: `e-poster-${p.id}`, accept: 'image/jpeg,image/png,image/webp' });
  const form = h('form', { class: 'edit stack', novalidate: true },
    h('div', { class: 'row2' },
      h('div', { class: 'field' }, h('label', { for: title.id }, 'Başlık'), title),
      h('div', { class: 'field' }, h('label', { for: cat.id }, 'Kategori'), cat)),
    h('div', { class: 'field' }, h('label', { for: role.id }, 'Bu projedeki rolüm'), role),
    h('div', { class: 'field' }, h('label', { for: desc.id }, 'Açıklama'), desc),
    h('div', { class: 'field' }, h('label', { for: poster.id }, 'Kapak görselini değiştir (isteğe bağlı)'), poster),
    h('label', { class: 'check', for: pub.id }, pub, 'Sitede yayınla'),
    h('div', { class: 'actions' },
      h('button', { class: 'btn btn-primary', type: 'submit' }, 'Kaydet'),
      h('button', { class: 'btn', type: 'button', onclick: () => { editingId = null; render(); } }, 'Vazgeç')),
    msg);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      const body = { title: title.value, description: desc.value, role: role.value, category: cat.value, published: pub.checked };
      if (poster.files[0]) body.poster_key = await uploadImage(poster.files[0], 'poster', 1280);
      await api(`/api/admin/projects/${p.id}`, { method: 'PUT', json: body });
      toast('Değişiklikler kaydedildi.');
      projects = await api('/api/admin/projects');
      editingId = null;
      render();
    } catch (err) {
      setMsg(msg, 'error', err.message);
      btn.disabled = false;
    }
  });
  return form;
}

// ---------- Site içeriği ----------
const SITE_SPEC = [
  { path: 'hero', title: 'Açılış bölümü', fields: [
    { k: 'title', label: 'Ad soyad (büyük başlık)' },
    { k: 'roles', label: 'Unvanlar' },
    { k: 'tagline', label: 'Kısa tanıtım cümlesi', type: 'textarea' },
    { k: 'cta_primary', label: 'Birinci buton yazısı' },
    { k: 'cta_secondary', label: 'İkinci buton yazısı' },
    { k: 'showreel_project_id', label: 'Açılıştaki ana video', type: 'project', help: 'Kısa (30-60 sn) ve hafif bir video seçin; sayfa açılınca sessizce döner.' },
  ] },
  { path: 'about', title: 'Hakkımda', fields: [
    { k: 'heading', label: 'Bölüm başlığı' },
    { k: 'body', label: 'Yazı (her paragraf ayrı satırda)', type: 'paragraphs' },
    { k: 'birth_date', label: 'Doğum tarihi', type: 'date', help: 'Yaş, sitede her gün otomatik güncellenir.' },
    { k: 'birthplace', label: 'Doğum yeri' },
    { k: 'education', label: 'Eğitim' },
    { k: 'license', label: 'Ehliyet' },
    { k: 'companies', label: 'Birlikte çalıştığı yapımlar (her biri ayrı satırda)', type: 'lines' },
    { k: 'photo', label: 'Portre fotoğrafı (isteğe bağlı)', type: 'image' },
  ] },
  { path: 'services', title: 'Hizmetler', type: 'repeat', max: 12, noun: 'hizmet', item: [{ k: 'title', label: 'Başlık' }, { k: 'text', label: 'Açıklama', type: 'textarea' }] },
  { path: 'process', title: 'Nasıl çalışıyorum', fields: [{ k: 'heading', label: 'Bölüm başlığı' }] },
  { path: 'process.steps', title: 'Çalışma adımları (boşaltırsanız bölüm gizlenir)', type: 'repeat', max: 8, noun: 'adım', item: [{ k: 'title', label: 'Başlık' }, { k: 'text', label: 'Açıklama', type: 'textarea' }] },
  { path: 'testimonials', title: 'Müşteri yorumları (hiç yoksa bölüm sitede görünmez)', type: 'repeat', max: 12, noun: 'yorum', item: [{ k: 'quote', label: 'Yorum', type: 'textarea' }, { k: 'name', label: 'Kişi adı' }, { k: 'role', label: 'Unvan veya şirket (isteğe bağlı)' }] },
  { path: 'skills', title: 'Yetenekler', type: 'repeat', max: 12, noun: 'yetenek', item: [{ k: 'title', label: 'Yetenek adı' }] },
  { path: 'contact', title: 'İletişim', fields: [
    { k: 'heading', label: 'Bölüm başlığı' },
    { k: 'text', label: 'Açıklama', type: 'textarea' },
    { k: 'phone', label: 'Telefon' },
    { k: 'instagram', label: 'Instagram kullanıcı adı', help: '@ işareti olmadan yazın.' },
  ] },
  { path: 'seo', title: 'Arama motoru görünümü', fields: [
    { k: 'title', label: 'Sayfa başlığı' },
    { k: 'description', label: 'Sayfa açıklaması', type: 'textarea' },
  ] },
];

let fieldSeq = 0;
function siteField(obj, def) {
  const id = `sf-${++fieldSeq}`;
  const wrap = (control, extra) => h('div', { class: 'field' }, h('label', { for: id }, def.label), control, def.help ? h('p', { class: 'hint' }, def.help) : null, extra);
  const val = obj[def.k];
  switch (def.type) {
    case 'textarea':
      return wrap(h('textarea', { id, value: val ?? '', oninput: (e) => { obj[def.k] = e.target.value; } }));
    case 'paragraphs':
      return wrap(h('textarea', { id, value: (val || []).join('\n\n'), oninput: (e) => { obj[def.k] = e.target.value.split(/\n\s*\n|\n/).map((s) => s.trim()).filter(Boolean); } }));
    case 'lines':
      return wrap(h('textarea', { id, value: (val || []).join('\n'), oninput: (e) => { obj[def.k] = e.target.value.split('\n').map((s) => s.trim()).filter(Boolean); } }));
    case 'date':
      return wrap(h('input', { id, type: 'date', value: val || '', oninput: (e) => { obj[def.k] = e.target.value; } }));
    case 'project':
      return wrap(h('select', { id, value: val || '', onchange: (e) => { obj[def.k] = e.target.value; } },
        h('option', { value: '' }, 'Otomatik (listedeki ilk çalışma)'),
        projects.filter((p) => p.published).map((p) => h('option', { value: p.id }, p.title))));
    case 'image': {
      const preview = h('img', { class: 'poster-preview', alt: 'Seçili fotoğraf', src: val ? `/media/${val}` : '', hidden: !val });
      const input = h('input', { id, type: 'file', accept: 'image/jpeg,image/png,image/webp' });
      const status = h('p', { class: 'msg', role: 'status' });
      input.addEventListener('change', async () => {
        if (!input.files[0]) return;
        try {
          setMsg(status, '', 'Yükleniyor…');
          obj[def.k] = await uploadImage(input.files[0], 'portrait', 1000);
          preview.src = `/media/${obj[def.k]}`; preview.hidden = false;
          setMsg(status, 'ok', 'Fotoğraf yüklendi. Kaydet düğmesine basmayı unutmayın.');
        } catch (err) { setMsg(status, 'error', err.message); }
      });
      const remove = h('button', { class: 'btn btn-sm', type: 'button', onclick: () => { obj[def.k] = ''; preview.hidden = true; input.value = ''; } }, 'Fotoğrafı kaldır');
      return wrap(input, [preview, remove, status]);
    }
    default:
      return wrap(h('input', { id, type: 'text', value: val ?? '', oninput: (e) => { obj[def.k] = e.target.value; } }));
  }
}

function repeatSection(spec) {
  const box = h('div', {});
  const draw = () => {
    const list = spec.path.split('.').reduce((o, k) => o[k], site);
    box.replaceChildren(
      ...list.map((item, i) => h('div', { class: 'repeat-item' },
        spec.item.map((d) => siteField(item, d)),
        h('div', { class: 'actions' },
          h('button', { class: 'btn btn-sm', type: 'button', 'aria-label': `${spec.noun} ${i + 1} yukarı`, disabled: i === 0, onclick: () => { [list[i - 1], list[i]] = [list[i], list[i - 1]]; draw(); } }, 'Yukarı'),
          h('button', { class: 'btn btn-sm', type: 'button', 'aria-label': `${spec.noun} ${i + 1} aşağı`, disabled: i === list.length - 1, onclick: () => { [list[i + 1], list[i]] = [list[i], list[i + 1]]; draw(); } }, 'Aşağı'),
          h('button', { class: 'btn btn-sm btn-danger', type: 'button', 'aria-label': `${spec.noun} ${i + 1} sil`, onclick: () => { list.splice(i, 1); draw(); } }, 'Sil')))),
      h('div', { class: 'actions' }, h('button', { class: 'btn btn-sm', type: 'button', disabled: list.length >= spec.max, onclick: () => { list.push(Object.fromEntries(spec.item.map((d) => [d.k, '']))); draw(); } }, `Yeni ${spec.noun} ekle`)));
  };
  draw();
  return box;
}

function siteView() {
  const msg = h('p', { class: 'msg', role: 'status' });
  const form = h('form', { novalidate: true },
    SITE_SPEC.map((spec) => h('div', { class: 'card' },
      h('h2', { class: 'section-title' }, spec.title),
      spec.type === 'repeat' ? repeatSection(spec) : h('div', { class: 'stack' }, spec.fields.map((d) => siteField(spec.path.split('.').reduce((o, k) => o[k], site), d))))),
    h('div', { class: 'sticky-save' }, h('button', { class: 'btn btn-primary', type: 'submit' }, 'Değişiklikleri kaydet'), msg));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      site = await api('/api/admin/site', { method: 'PUT', json: site });
      // Sunucunun temizlediği güncel veriyle formu yeniden çiz (alanlar yeni nesneye bağlansın).
      const y = window.scrollY;
      render();
      window.scrollTo(0, y);
      toast('Kaydedildi. Değişiklikler sitede yayında.');
    } catch (err) { setMsg(msg, 'error', err.message); btn.disabled = false; }
  });
  return form;
}

// ---------- Mesajlar ----------
function waLink(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  return d.length >= 10 ? `https://wa.me/90${d.slice(-10)}` : '';
}

function messagesView() {
  if (!messages.length) return h('p', { class: 'empty' }, 'Henüz mesaj yok. İletişim formundan gelen mesajlar burada görünür.');
  return h('div', {}, messages.map((m) => h('article', { class: `message${m.is_read ? '' : ' unread'}` },
    h('h3', {}, m.name, !m.is_read ? h('span', { class: 'badge badge-live' }, ' Yeni') : null),
    h('p', { class: 'meta' }, fmtDate(m.created_at), m.subject ? `, konu: ${m.subject}` : '',
      m.mailed ? ', e-posta ile de iletildi' : ', e-posta gönderilmedi (yalnızca burada)'),
    h('p', { class: 'meta' }, h('a', { href: `mailto:${m.email}` }, m.email), m.phone ? h('span', {}, ` / ${m.phone}`) : null),
    h('p', { class: 'body' }, m.body),
    h('div', { class: 'actions' },
      h('a', { class: 'btn btn-sm', href: `mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject || 'Mesajınız'}`)}` }, 'E-postayla yanıtla'),
      waLink(m.phone) ? h('a', { class: 'btn btn-sm', href: waLink(m.phone), target: '_blank', rel: 'noopener noreferrer' }, 'WhatsApp\'tan yaz') : null,
      h('button', { class: 'btn btn-sm', type: 'button', onclick: async () => {
        try { await api(`/api/admin/messages/${m.id}`, { method: 'PATCH', json: { is_read: !m.is_read } }); m.is_read = m.is_read ? 0 : 1; render(); } catch (err) { toast(err.message); }
      } }, m.is_read ? 'Okunmadı yap' : 'Okundu yap'),
      h('button', { class: 'btn btn-sm btn-danger', type: 'button', onclick: async () => {
        if (!(await confirmDialog(`${m.name} adlı kişinin mesajı silinecek. Emin misiniz?`))) return;
        try { await api(`/api/admin/messages/${m.id}`, { method: 'DELETE' }); messages = messages.filter((x) => x.id !== m.id); render(); } catch (err) { toast(err.message); }
      } }, 'Sil')))));
}

// ---------- Hesap ----------
async function downloadBackup() {
  try {
    const res = await fetch('/api/admin/export', { credentials: 'same-origin' });
    if (!res.ok) throw new Error('Yedek alınamadı.');
    const url = URL.createObjectURL(await res.blob());
    const a = h('a', { href: url, download: `portfolyo-yedek-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Yedek indirildi.');
  } catch (err) { toast(err.message); }
}

function accountView() {
  const msg = h('p', { class: 'msg', role: 'status' });
  const cur = h('input', { id: 'pw-cur', type: 'password', autocomplete: 'current-password', required: true });
  const next = h('input', { id: 'pw-new', type: 'password', autocomplete: 'new-password', minlength: '12', required: true });
  const backup = h('div', { class: 'card stack' },
    h('div', {}, h('h2', {}, 'Yedek'), h('p', { class: 'hint' }, 'Site metinlerinizi, çalışmalarınızı ve mesajlarınızı bir JSON dosyası olarak indirin. Görseller dosyada yoktur; videolar YouTube/Vimeo bağlantısı olarak durur.')),
    h('div', { class: 'actions' }, h('button', { class: 'btn', type: 'button', onclick: downloadBackup }, 'Yedeği indir')));
  const form = h('form', { class: 'card stack', novalidate: true },
    h('div', {}, h('h2', {}, 'Parolayı değiştir'), h('p', { class: 'hint' }, 'En az 12 karakter. Değişiklikten sonra diğer tüm oturumlar kapanır.')),
    h('div', { class: 'field' }, h('label', { for: 'pw-cur' }, 'Mevcut parola'), cur),
    h('div', { class: 'field' }, h('label', { for: 'pw-new' }, 'Yeni parola'), next),
    h('div', { class: 'actions' }, h('button', { class: 'btn btn-primary', type: 'submit' }, 'Parolayı güncelle')),
    msg);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api('/api/admin/password', { method: 'POST', json: { current: cur.value, next: next.value } });
      cur.value = ''; next.value = '';
      setMsg(msg, 'ok', 'Parola güncellendi.');
    } catch (err) { setMsg(msg, 'error', err.message); }
  });
  return h('div', {}, form, backup);
}

// ---------- Başlangıç ----------
async function start() {
  config = await api('/api/admin/config');
  await loadAll();
  render();
}

(async () => {
  try {
    const me = await api('/api/auth/me');
    if (me.authenticated) {
      csrf = me.csrf;
      await start();
    } else {
      showLogin();
    }
  } catch {
    showLogin();
  }
})();
