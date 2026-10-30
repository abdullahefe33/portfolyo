import { state, h, icon, toast, api, setMsg, group } from '../core.js';
import { uploadImage } from '../media.js';

// ---- Alan tanımları (sade Türkçe, açıklamalı) ----
const GROUPS = [
  { id: 'hero', title: 'Açılış (sayfanın en üstü)', hint: 'İsminiz, unvanlarınız, ana butonlar', parts: [
    { path: 'hero', fields: [
      { k: 'title', label: 'Ad soyad (büyük başlık)' },
      { k: 'headline', label: 'Büyük el yazısı başlık', help: 'Sayfanın en üstündeki iri yazı. Kısa tutun, örn: Fikir. Kadraj. Hikâye.' },
      { k: 'roles', label: 'Unvanlar', help: 'Örn: Kameraman, kurgucu ve drone operatörü' },
      { k: 'tagline', label: 'Kısa tanıtım cümlesi', type: 'textarea' },
      { k: 'cta_primary', label: 'Birinci buton yazısı' },
      { k: 'cta_secondary', label: 'İkinci buton yazısı' },
      { k: 'badge', label: 'Durum etiketi (başlığın üstünde, boşsa görünmez)', help: 'Örn: Yeni projelere açığım' },
      { k: 'showreel_project_id', label: 'Açılıştaki ana video', type: 'project', help: 'Çalışmalar sekmesinden "Ana video yap" ile de seçebilirsiniz.' },
    ] },
  ] },
  { id: 'about', title: 'Hakkımda', hint: 'Yazı, doğum tarihi, eğitim, çalıştığınız yerler, fotoğraf', parts: [
    { path: 'about', fields: [
      { k: 'heading', label: 'Bölüm başlığı' },
      { k: 'body', label: 'Yazı (her paragraf ayrı satırda)', type: 'paragraphs' },
      { k: 'birth_date', label: 'Doğum tarihi', type: 'date', help: 'Yaş, sitede her gün otomatik güncellenir.' },
      { k: 'birthplace', label: 'Doğum yeri' },
      { k: 'education', label: 'Eğitim' },
      { k: 'license', label: 'Ehliyet' },
      { k: 'companies', label: 'Birlikte çalıştığı yapımlar (her biri ayrı satırda)', type: 'lines' },
      { k: 'photo', label: 'Portre fotoğrafı (isteğe bağlı)', type: 'image', help: 'Yüklemezseniz kamera maskotu görünür.' },
    ] },
  ] },
  { id: 'services', title: 'Hizmetler', hint: 'Sunduğunuz işler (en çok 12)', parts: [
    { repeat: 'services', max: 12, noun: 'hizmet', item: [{ k: 'title', label: 'Başlık' }, { k: 'text', label: 'Açıklama', type: 'textarea' }] },
  ] },
  { id: 'process', title: 'Nasıl çalışıyorum', hint: 'Müşteriye süreci anlatan adımlar', parts: [
    { path: 'process', fields: [{ k: 'heading', label: 'Bölüm başlığı' }] },
    { repeat: 'process.steps', max: 8, noun: 'adım', item: [{ k: 'title', label: 'Başlık' }, { k: 'text', label: 'Açıklama', type: 'textarea' }] },
  ] },
  { id: 'skills', title: 'Yetenekler', hint: 'Kısa etiketler', parts: [
    { repeat: 'skills', max: 12, noun: 'yetenek', item: [{ k: 'title', label: 'Yetenek adı' }] },
  ] },
  { id: 'testimonials', title: 'Müşteri yorumları', hint: 'Hiç yorum yoksa bölüm sitede görünmez', parts: [
    { repeat: 'testimonials', max: 12, noun: 'yorum', item: [{ k: 'quote', label: 'Yorum', type: 'textarea' }, { k: 'name', label: 'Kişi adı' }, { k: 'role', label: 'Unvan veya şirket (isteğe bağlı)' }] },
  ] },
  { id: 'contact', title: 'İletişim bilgileri', hint: 'Telefon, Instagram, başlık', parts: [
    { path: 'contact', fields: [
      { k: 'heading', label: 'Bölüm başlığı' },
      { k: 'text', label: 'Açıklama', type: 'textarea' },
      { k: 'phone', label: 'Telefon', help: 'Örn: 0546 724 53 02' },
      { k: 'instagram', label: 'Instagram kullanıcı adı', help: '@ işareti olmadan yazın.' },
      { k: 'response', label: 'Yanıt süresi notu (isteğe bağlı)', help: 'Formun altında görünür. Örn: Genellikle bir iş günü içinde dönüş yaparım. Boş bırakırsanız görünmez.' },
    ] },
  ] },
  { id: 'seo', title: 'Google ve paylaşım görünümü', hint: 'Arama sonuçlarında ve WhatsApp önizlemesinde görünen yazı', parts: [
    { path: 'seo', fields: [
      { k: 'title', label: 'Sayfa başlığı' },
      { k: 'description', label: 'Sayfa açıklaması', type: 'textarea', help: 'Yaklaşık 150 karakter ideal.' },
      { k: 'verification', label: 'Google Search Console doğrulama kodu (isteğe bağlı)', help: 'search.google.com/search-console adresinde siteyi ekleyip "HTML etiketi" yöntemini seçin; content="..." içindeki kodu buraya yapıştırın.' },
    ] },
  ] },
];

const at = (obj, path) => path.split('.').reduce((o, k) => o[k], obj);
const openGroups = new Set(['hero']);
let fieldSeq = 0;
let saveBar = null;

function markDirty() {
  state.dirty = true;
  if (saveBar) {
    saveBar.classList.add('is-dirty');
    saveBar.querySelector('.save-text').textContent = 'Kaydedilmemiş değişiklikler var.';
  }
}

function siteField(obj, def) {
  const id = `sf-${++fieldSeq}`;
  const wrap = (control, extra) => h('div', { class: 'field' }, h('label', { for: id }, def.label), control, def.help ? h('p', { class: 'hint' }, def.help) : null, extra);
  const val = obj[def.k];
  const set = (v) => { obj[def.k] = v; markDirty(); };
  switch (def.type) {
    case 'textarea':
      return wrap(h('textarea', { id, value: val ?? '', oninput: (e) => set(e.target.value) }));
    case 'paragraphs':
      return wrap(h('textarea', { id, value: (val || []).join('\n\n'), oninput: (e) => set(e.target.value.split(/\n\s*\n|\n/).map((s) => s.trim()).filter(Boolean)) }));
    case 'lines':
      return wrap(h('textarea', { id, value: (val || []).join('\n'), oninput: (e) => set(e.target.value.split('\n').map((s) => s.trim()).filter(Boolean)) }));
    case 'date':
      return wrap(h('input', { id, type: 'date', value: val || '', oninput: (e) => set(e.target.value) }));
    case 'project':
      return wrap(h('select', { id, value: val || '', onchange: (e) => set(e.target.value) },
        h('option', { value: '' }, 'Otomatik (listedeki ilk çalışma)'),
        state.projects.filter((p) => p.published).map((p) => h('option', { value: p.id }, p.title))));
    case 'image': {
      const preview = h('img', { class: 'poster-preview', alt: 'Seçili fotoğraf', src: val ? `/media/${val}` : '', hidden: !val });
      const input = h('input', { id, type: 'file', accept: 'image/jpeg,image/png,image/webp' });
      const status = h('p', { class: 'msg', role: 'status' });
      input.addEventListener('change', async () => {
        if (!input.files[0]) return;
        try {
          setMsg(status, '', 'Yükleniyor…');
          const key = await uploadImage(input.files[0], 'portrait', 1000);
          set(key);
          preview.src = `/media/${key}`; preview.hidden = false;
          setMsg(status, 'ok', 'Fotoğraf yüklendi. Kaydet düğmesine basmayı unutmayın.');
        } catch (err) { setMsg(status, 'error', err.message); }
      });
      const remove = h('button', { class: 'btn btn-sm', type: 'button', onclick: () => { set(''); preview.hidden = true; input.value = ''; } }, 'Fotoğrafı kaldır');
      return wrap(input, [preview, remove, status]);
    }
    default:
      return wrap(h('input', { id, type: 'text', value: val ?? '', oninput: (e) => set(e.target.value) }));
  }
}

function repeatPart(part) {
  const box = h('div', {});
  const draw = () => {
    const list = at(state.site, part.repeat);
    box.replaceChildren(
      ...list.map((item, i) => h('div', { class: 'repeat-item' },
        part.item.map((d) => siteField(item, d)),
        h('div', { class: 'actions' },
          h('button', { class: 'btn btn-sm btn-icon', type: 'button', 'aria-label': `${part.noun} ${i + 1} yukarı`, disabled: i === 0, onclick: () => { [list[i - 1], list[i]] = [list[i], list[i - 1]]; markDirty(); draw(); } }, icon('up', 18)),
          h('button', { class: 'btn btn-sm btn-icon', type: 'button', 'aria-label': `${part.noun} ${i + 1} aşağı`, disabled: i === list.length - 1, onclick: () => { [list[i + 1], list[i]] = [list[i], list[i + 1]]; markDirty(); draw(); } }, icon('down', 18)),
          h('button', { class: 'btn btn-sm btn-danger', type: 'button', 'aria-label': `${part.noun} ${i + 1} sil`, onclick: () => { list.splice(i, 1); markDirty(); draw(); } }, 'Sil'))),
      ),
      h('div', { class: 'actions' }, h('button', { class: 'btn btn-sm', type: 'button', disabled: list.length >= part.max, onclick: () => { list.push(Object.fromEntries(part.item.map((d) => [d.k, '']))); markDirty(); draw(); } }, icon('plus', 16), `Yeni ${part.noun} ekle`)));
  };
  draw();
  return box;
}

function siteGroup(g) {
  const body = g.parts.map((part) => (part.repeat ? repeatPart(part) : h('div', { class: 'stack' }, part.fields.map((d) => siteField(at(state.site, part.path), d)))));
  const el = group(g.title, g.hint, body);
  el.open = openGroups.has(g.id);
  el.addEventListener('toggle', () => { if (el.open) openGroups.add(g.id); else openGroups.delete(g.id); });
  return el;
}

export function siteView(rerender) {
  const msg = h('p', { class: 'save-text', role: 'status' }, state.dirty ? 'Kaydedilmemiş değişiklikler var.' : 'Her şey kayıtlı.');
  const btn = h('button', { class: 'btn btn-primary', type: 'submit' }, 'Değişiklikleri kaydet');
  saveBar = h('div', { class: `savebar${state.dirty ? ' is-dirty' : ''}` }, msg, h('a', { class: 'btn btn-sm', href: '/', target: '_blank', rel: 'noopener' }, icon('eye', 16), 'Siteyi gör'), btn);
  const form = h('form', { novalidate: true },
    h('p', { class: 'hint intro' }, 'Başlıklara tıklayarak bölümleri açın, yazıları değiştirin ve en sonda "Değişiklikleri kaydet" düğmesine basın.'),
    GROUPS.map(siteGroup),
    saveBar);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    btn.disabled = true;
    try {
      state.site = await api('/api/admin/site', { method: 'PUT', json: state.site });
      state.dirty = false;
      toast('Kaydedildi. Değişiklikler sitede yayında.');
      const y = window.scrollY;
      rerender();
      window.scrollTo(0, y);
    } catch (err) {
      setMsg(msg, 'error', err.message);
      btn.disabled = false;
    }
  });
  return form;
}
