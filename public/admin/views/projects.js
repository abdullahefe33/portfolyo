import { state, hooks, h, icon, toast, api, setMsg, fmtBytes, confirmDialog, guessCategory } from '../core.js';
import { uploadImage, uploadVideo, frameFromVideo } from '../media.js';

const providerName = (p) => (p === 'youtube' ? 'YouTube' : 'Vimeo');
const thumbOf = (p) => (p.poster_key ? `/media/${p.poster_key}` : (p.thumb_url || ''));
const linesOf = (text) => text.split(/\s+/).map((x) => x.trim()).filter(Boolean);

function categorySelect(id, value) {
  return h('select', { id, name: 'category', value }, Object.entries(state.config.categories).map(([k, v]) => h('option', { value: k }, v)));
}

async function reloadProjects() {
  state.projects = await api('/api/admin/projects');
}

// ---------------------------------------------------------------------------
// Yeni video ekleme
// ---------------------------------------------------------------------------
function addCard() {
  const canUpload = state.config.uploadEnabled;
  const maxMB = Math.round(state.config.maxVideoBytes / 1048576);
  let mode = 'link';
  let autoPoster = null;
  let catTouched = false;
  let bulk = [];

  const msg = h('p', { class: 'msg', role: 'status' });
  const progress = h('progress', { max: '1', value: '0', 'aria-label': 'İlerleme', hidden: true });
  const preview = h('img', { class: 'poster-preview', alt: 'Video kapak görseli önizlemesi', hidden: true });

  const urlInput = h('textarea', { id: 'v-url', rows: '2', placeholder: 'https://www.youtube.com/watch?v=…', autocomplete: 'off', spellcheck: 'false' });
  const urlMsg = h('p', { class: 'msg', role: 'status' });
  const fileInput = h('input', { id: 'v-file', type: 'file', accept: 'video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm' });
  const posterInput = h('input', { id: 'v-poster', type: 'file', accept: 'image/jpeg,image/png,image/webp' });
  const title = h('input', { id: 'v-title', type: 'text', maxlength: '120', required: true });
  const role = h('input', { id: 'v-role', type: 'text', maxlength: '120', placeholder: 'Çekim, kurgu, renk düzenleme' });
  const desc = h('textarea', { id: 'v-desc', maxlength: '1000' });
  const cat = categorySelect('v-cat', 'reklam');
  const published = h('input', { id: 'v-pub', type: 'checkbox', checked: true });

  cat.addEventListener('change', () => { catTouched = true; });
  title.addEventListener('input', () => {
    if (catTouched) return;
    const g = guessCategory(title.value);
    if (g) cat.value = g;
  });

  const singleFields = h('div', { class: 'stack' },
    h('div', { class: 'row2' },
      h('div', { class: 'field' }, h('label', { for: 'v-title' }, 'Başlık'), title),
      h('div', { class: 'field' }, h('label', { for: 'v-cat' }, 'Kategori'), cat)));

  const more = h('details', { class: 'more' },
    h('summary', {}, 'Daha fazla ayrıntı (rol, açıklama, kendi kapak görseli)'),
    h('div', { class: 'stack' },
      h('div', { class: 'field' }, h('label', { for: 'v-role' }, 'Bu projedeki rolüm (isteğe bağlı)'), role),
      h('div', { class: 'field' }, h('label', { for: 'v-desc' }, 'Açıklama (isteğe bağlı)'), desc),
      h('div', { class: 'field' }, h('label', { for: 'v-poster' }, 'Kendi kapak görselim (yoksa videonun küçük resmi kullanılır)'), posterInput, preview),
      h('label', { class: 'check', for: 'v-pub' }, published, 'Sitede yayınla')));

  // Bağlantı alanı: tek bağlantı -> başlık ve küçük resim gelir; birden çok -> toplu ekleme
  let seq = 0;
  async function inspectLinks() {
    const urls = linesOf(urlInput.value);
    const mine = ++seq;
    preview.hidden = true;
    bulk = [];
    if (!urls.length) { setMsg(urlMsg, '', ''); singleFields.hidden = false; return; }
    if (urls.length > 1) {
      singleFields.hidden = true;
      setMsg(urlMsg, '', `${urls.length} bağlantı bulundu. Her biri ayrı video olarak eklenecek; başlıklar YouTube/Vimeo'dan alınır, sonra düzenleyebilirsiniz.`);
      bulk = urls;
      return;
    }
    singleFields.hidden = false;
    setMsg(urlMsg, '', 'Bağlantı kontrol ediliyor…');
    try {
      const info = await api(`/api/admin/link-preview?url=${encodeURIComponent(urls[0])}`);
      if (mine !== seq) return;
      const dup = state.projects.some((p) => p.provider === info.provider && p.provider_id === info.id);
      setMsg(urlMsg, dup ? 'error' : 'ok', dup ? 'Bu video zaten ekli. Yine de ekleyebilirsiniz.' : `${providerName(info.provider)} videosu bulundu.`);
      if (info.title && !title.value) { title.value = info.title; if (!catTouched) { const g = guessCategory(info.title); if (g) cat.value = g; } }
      if (info.thumbnail) { preview.src = info.thumbnail; preview.hidden = false; more.open = false; }
    } catch (err) {
      if (mine === seq) setMsg(urlMsg, 'error', err.message);
    }
  }
  urlInput.addEventListener('change', inspectLinks);
  urlInput.addEventListener('paste', () => setTimeout(inspectLinks, 50));

  fileInput.addEventListener('change', async () => {
    const f = fileInput.files[0];
    autoPoster = null; preview.hidden = true;
    if (!f) return;
    if (f.size > state.config.maxVideoBytes) { setMsg(msg, 'error', `Bu dosya ${fmtBytes(f.size)}. En fazla ${maxMB} MB yükleyebilirsiniz.`); return; }
    setMsg(msg, '', '');
    if (!title.value) title.value = f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 120);
    autoPoster = await frameFromVideo(f);
    if (autoPoster) { preview.src = URL.createObjectURL(autoPoster); preview.hidden = false; }
  });

  const linkPanel = h('div', { class: 'stack' },
    h('div', { class: 'field' },
      h('label', { for: 'v-url' }, 'Video bağlantısı'),
      urlInput,
      h('p', { class: 'hint' }, 'YouTube veya Vimeo bağlantısını yapıştırın. Birden fazla videoyu her satıra bir bağlantı gelecek şekilde tek seferde ekleyebilirsiniz.'),
      urlMsg),
    h('p', { class: 'tip' }, icon('help', 18), h('span', {}, 'Videoyu YouTube\'a yüklerken görünürlüğü ', h('b', {}, '"Liste dışı"'), ' yapın: bağlantıyı bilenler izler, aramada çıkmaz. "Özel" yaparsanız sitede oynamaz.')));
  const filePanel = h('div', { class: 'stack', hidden: true },
    h('p', { class: 'hint' }, `Dosya başına en fazla ${maxMB} MB. MP4 (H.264) önerilir; MOV ve WebM de kabul edilir. Kapak görseli videodan otomatik alınır.`),
    h('div', { class: 'field' }, h('label', { for: 'v-file' }, 'Video dosyası'), fileInput));

  const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Ekleme yöntemi', hidden: !canUpload },
    h('button', { type: 'button', 'data-mode': 'link', 'aria-pressed': 'true', onclick: () => setMode('link') }, 'YouTube / Vimeo bağlantısı'),
    h('button', { type: 'button', 'data-mode': 'file', 'aria-pressed': 'false', onclick: () => setMode('file') }, 'Dosya yükle'));
  function setMode(m) {
    mode = m;
    linkPanel.hidden = m !== 'link';
    filePanel.hidden = m !== 'file';
    seg.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
    preview.hidden = true;
    singleFields.hidden = false;
    setMsg(msg, '', '');
  }

  const form = h('form', { class: 'card stack add-card', novalidate: true },
    h('h2', {}, 'Yeni video ekle'),
    seg, linkPanel, filePanel, singleFields, more, progress,
    h('div', { class: 'actions' }, h('button', { class: 'btn btn-primary btn-lg', type: 'submit' }, 'Videoyu ekle')),
    msg);

  async function addOne(url, base, posterKey) {
    return api('/api/admin/projects', { method: 'POST', json: { ...base, video_url: url, poster_key: posterKey } });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const needsTitle = mode === 'file' || linesOf(urlInput.value).length === 1;
    if (needsTitle && !title.value.trim()) {
      setMsg(msg, 'error', 'Lütfen videoya bir başlık yazın.');
      title.focus();
      return;
    }
    try {
      if (mode === 'link') {
        const urls = linesOf(urlInput.value);
        if (!urls.length) { setMsg(msg, 'error', 'Lütfen bir YouTube veya Vimeo bağlantısı yapıştırın.'); urlInput.focus(); return; }
        btn.disabled = true;
        if (urls.length > 1) {
          // Toplu ekleme: başlık sağlayıcıdan, kategori başlıktan tahmin edilir
          progress.hidden = false; progress.value = 0;
          let ok = 0; const failed = [];
          for (const [i, url] of urls.entries()) {
            setMsg(msg, '', `Ekleniyor: ${i + 1} / ${urls.length}`);
            try {
              const info = await api(`/api/admin/link-preview?url=${encodeURIComponent(url)}`);
              const name = info.title || `Video ${state.projects.length + i + 1}`;
              await addOne(url, { title: name, description: '', role: '', category: guessCategory(name) || 'reklam', published: true }, null);
              ok += 1;
            } catch { failed.push(url); }
            progress.value = (i + 1) / urls.length;
          }
          toast(failed.length ? `${ok} video eklendi, ${failed.length} bağlantı eklenemedi.` : `${ok} video eklendi. Başlıkları düzenleyebilirsiniz.`, 5200);
          await reloadProjects();
          hooks.render();
          return;
        }
        setMsg(msg, '', 'Ekleniyor…');
        const custom = posterInput.files[0];
        const posterKey = custom ? await uploadImage(custom, 'poster', 1280) : null;
        await addOne(urls[0], { title: title.value, description: desc.value, role: role.value, category: cat.value, published: published.checked }, posterKey);
      } else {
        const file = fileInput.files[0];
        if (!file) { setMsg(msg, 'error', 'Lütfen bir video seçin.'); return; }
        if (file.size > state.config.maxVideoBytes) { setMsg(msg, 'error', `En fazla ${maxMB} MB yükleyebilirsiniz.`); return; }
        btn.disabled = true; progress.hidden = false; progress.value = 0;
        setMsg(msg, '', 'Video yükleniyor…');
        const video = await uploadVideo(file, (p) => { progress.value = p; setMsg(msg, '', `Video yükleniyor… %${Math.round(p * 100)}`); });
        const custom = posterInput.files[0];
        const posterKey = custom ? await uploadImage(custom, 'poster', 1280) : autoPoster ? await uploadImage(autoPoster, 'poster', 1280) : null;
        await api('/api/admin/projects', { method: 'POST', json: {
          title: title.value, description: desc.value, role: role.value, category: cat.value, published: published.checked, video_key: video.key, poster_key: posterKey,
        } });
      }
      toast('Video eklendi. Sitede yayında.');
      await reloadProjects();
      hooks.render();
    } catch (err) {
      setMsg(msg, 'error', err.message);
    } finally {
      btn.disabled = false; progress.hidden = true;
    }
  });
  return form;
}

// ---------------------------------------------------------------------------
// Liste
// ---------------------------------------------------------------------------
function featuredId() {
  const set = state.site && state.site.hero.showreel_project_id;
  if (set && state.projects.some((p) => p.id === set && p.published)) return set;
  const first = state.projects.find((p) => p.published);
  return first ? first.id : '';
}

async function makeFeatured(p) {
  if (state.dirty) { toast('Önce "Site içeriği" sekmesindeki değişiklikleri kaydedin.'); return; }
  try {
    const fresh = await api('/api/admin/site');
    fresh.hero.showreel_project_id = p.id;
    state.site = await api('/api/admin/site', { method: 'PUT', json: fresh });
    toast(`"${p.title}" artık sitenin ana videosu.`);
    hooks.render();
  } catch (err) { toast(err.message); }
}

function projectRow(p, i) {
  const featured = featuredId() === p.id;
  const move = async (dir) => {
    const ids = state.projects.map((x) => x.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    try {
      await api('/api/admin/projects/reorder', { method: 'POST', json: { ids } });
      await reloadProjects();
      hooks.render();
    } catch (err) { toast(err.message); }
  };
  const remove = async () => {
    if (!(await confirmDialog(`"${p.title}" sitenizden kalıcı olarak silinecek (YouTube'daki videonuz silinmez). Emin misiniz?`))) return;
    try {
      await api(`/api/admin/projects/${p.id}`, { method: 'DELETE' });
      toast('Video silindi.');
      state.projects = await api('/api/admin/projects');
      state.site = await api('/api/admin/site');
      hooks.render();
    } catch (err) { toast(err.message); }
  };
  const togglePublish = async (checkbox) => {
    try {
      await api(`/api/admin/projects/${p.id}`, { method: 'PUT', json: { published: checkbox.checked } });
      toast(checkbox.checked ? 'Video sitede yayında.' : 'Video taslağa alındı, sitede görünmüyor.');
      await reloadProjects();
      hooks.render();
    } catch (err) { checkbox.checked = !checkbox.checked; toast(err.message); }
  };

  const thumb = thumbOf(p);
  const switchBox = h('input', { type: 'checkbox', role: 'switch', checked: Boolean(p.published), onchange: (e) => togglePublish(e.target), 'aria-label': `${p.title} yayında` });
  const row = h('li', { class: `project${p.published ? '' : ' is-draft'}` },
    thumb ? h('img', { class: 'thumb', src: thumb, alt: '', loading: 'lazy' }) : h('span', { class: 'thumb' }),
    h('div', { class: 'project-info' },
      h('h3', {}, p.title),
      h('p', { class: 'meta' }, `${state.config.categories[p.category] || p.category}, ${p.provider ? `${providerName(p.provider)} bağlantısı` : fmtBytes(p.video_size)}`),
      p.role ? h('p', { class: 'meta' }, `Rolüm: ${p.role}`) : null,
      featured ? h('span', { class: 'badge badge-star' }, icon('star', 14), 'Ana video') : null),
    h('label', { class: 'switch' }, switchBox, h('span', {}, p.published ? 'Yayında' : 'Taslak (gizli)')),
    h('div', { class: 'actions row-actions' },
      h('button', { class: 'btn btn-sm', type: 'button', 'aria-pressed': String(featured), disabled: featured || !p.published, title: p.published ? '' : 'Önce yayınlayın', onclick: () => makeFeatured(p) }, icon('star', 16), featured ? 'Ana video' : 'Ana video yap'),
      h('button', { class: 'btn btn-sm btn-icon', type: 'button', 'aria-label': `${p.title} yukarı taşı`, disabled: i === 0, onclick: () => move(-1) }, icon('up', 18)),
      h('button', { class: 'btn btn-sm btn-icon', type: 'button', 'aria-label': `${p.title} aşağı taşı`, disabled: i === state.projects.length - 1, onclick: () => move(1) }, icon('down', 18)),
      h('button', { class: 'btn btn-sm', type: 'button', 'aria-expanded': String(state.editingId === p.id), onclick: () => { state.editingId = state.editingId === p.id ? null : p.id; hooks.render(); } }, icon('edit', 16), 'Düzenle'),
      h('button', { class: 'btn btn-sm btn-danger', type: 'button', 'aria-label': `${p.title} sil`, onclick: remove }, 'Sil')));
  if (state.editingId === p.id) row.append(editForm(p));
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
  const link = p.provider ? h('input', { type: 'url', id: `e-url-${p.id}`, placeholder: 'https://www.youtube.com/watch?v=…', autocomplete: 'off' }) : null;
  const form = h('form', { class: 'edit stack', novalidate: true },
    h('div', { class: 'row2' },
      h('div', { class: 'field' }, h('label', { for: title.id }, 'Başlık'), title),
      h('div', { class: 'field' }, h('label', { for: cat.id }, 'Kategori'), cat)),
    h('div', { class: 'field' }, h('label', { for: role.id }, 'Bu projedeki rolüm'), role),
    h('div', { class: 'field' }, h('label', { for: desc.id }, 'Açıklama'), desc),
    link ? h('div', { class: 'field' }, h('label', { for: link.id }, 'Video bağlantısını değiştir (isteğe bağlı)'), link, h('p', { class: 'hint' }, 'Başka bir YouTube/Vimeo videosuna geçmek için yeni bağlantıyı yapıştırın.')) : null,
    h('div', { class: 'field' }, h('label', { for: poster.id }, 'Kapak görselini değiştir (isteğe bağlı)'), poster),
    h('label', { class: 'check', for: pub.id }, pub, 'Sitede yayınla'),
    h('div', { class: 'actions' },
      h('button', { class: 'btn btn-primary', type: 'submit' }, 'Kaydet'),
      h('button', { class: 'btn', type: 'button', onclick: () => { state.editingId = null; hooks.render(); } }, 'Vazgeç')),
    msg);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      const body = { title: title.value, description: desc.value, role: role.value, category: cat.value, published: pub.checked };
      if (link && link.value.trim()) body.video_url = link.value.trim();
      if (poster.files[0]) body.poster_key = await uploadImage(poster.files[0], 'poster', 1280);
      await api(`/api/admin/projects/${p.id}`, { method: 'PUT', json: body });
      toast('Değişiklikler kaydedildi.');
      await reloadProjects();
      state.editingId = null;
      hooks.render();
    } catch (err) {
      setMsg(msg, 'error', err.message);
      btn.disabled = false;
    }
  });
  return form;
}

export function projectsView() {
  return h('div', {},
    addCard(),
    h('h2', { class: 'section-title' }, `Çalışmalarım (${state.projects.length})`),
    state.projects.length
      ? h('ul', { class: 'projects' }, state.projects.map((p, i) => projectRow(p, i)))
      : h('p', { class: 'empty' }, 'Henüz video eklenmedi. Yukarıdaki kutuya ilk YouTube bağlantınızı yapıştırın.'));
}
