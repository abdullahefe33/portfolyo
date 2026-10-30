import { state, h, icon, toast, api, setMsg, group } from '../core.js';

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

const HELP = [
  ['Video nasıl eklenir?', [
    'Videoyu önce YouTube\'a yükleyin ve görünürlüğünü "Liste dışı" yapın.',
    'Bağlantıyı kopyalayın. Çalışmalar sekmesinde "Video bağlantısı" kutusuna yapıştırın.',
    'Başlık ve kapak görseli kendiliğinden gelir. "Videoyu ekle" deyin; site anında güncellenir.',
    'Birden fazla video varsa bağlantıları alt alta yapıştırın, hepsi tek seferde eklenir.']],
  ['"Liste dışı" ne demek? "Özel" olursa ne olur?', [
    'Liste dışı: Bağlantıyı bilen herkes izler, YouTube aramasında ve kanalınızda görünmez. Portfolyo için en uygunu budur.',
    '"Özel" yaparsanız yalnızca siz izlersiniz; sitede oynamaz. "Herkese açık" da çalışır ama kanalınızda görünür.']],
  ['Bir videoyu geçici olarak nasıl gizlerim?', [
    'Çalışmalar sekmesinde videonun yanındaki "Yayında" anahtarını kapatın. Video silinmez, taslağa düşer. Tekrar açınca geri gelir.']],
  ['Ana video nedir, nasıl değiştirilir?', [
    'Sitenin en üstünde büyük görünen videodur. Çalışmalar sekmesinde istediğiniz videonun yanındaki "Ana video yap" düğmesine basın.']],
  ['Instagram\'dan gelenleri nasıl görürüm?', [
    'Genel bakış sekmesinin altındaki "Instagram bağlantınız" kutusundaki adresi Instagram biyografinize koyun. Ziyaretler "instagram" olarak sayılır.']],
  ['Yazıları ve telefon numarasını nasıl değiştiririm?', [
    'Site içeriği sekmesinde ilgili başlığı açın, yazıyı değiştirin ve alttaki "Değişiklikleri kaydet" düğmesine basın.']],
  ['Kendi alan adımı (örn. adiniz.com) nasıl bağlarım?', [
    'Alan adını bir firmadan satın alın. Sonra Cloudflare\'de projenizin "Custom domains" bölümünden ekleyin. Takılırsanız bana ya da geliştiricinize yazın.']],
  ['Mesajlar neden e-postama gelmiyor?', [
    'E-posta bildirimi için ücretsiz bir Resend hesabı kurulması gerekir. Kurulana kadar tüm mesajlar Mesajlar sekmesinde görünür ve kaybolmaz.']],
  ['Parolamı unuttum.', [
    'Panelden sıfırlanamaz (güvenlik için). Geliştiricinize ya da Claude\'a yazın; yeni parola oluşturulur.']],
];

export function accountView() {
  const msg = h('p', { class: 'msg', role: 'status' });
  const cur = h('input', { id: 'pw-cur', type: 'password', autocomplete: 'current-password', required: true });
  const next = h('input', { id: 'pw-new', type: 'password', autocomplete: 'new-password', minlength: '12', required: true });
  const form = h('form', { class: 'card stack', novalidate: true },
    h('div', {}, h('h2', {}, 'Parolayı değiştir'), h('p', { class: 'hint' }, 'En az 12 karakter. Uzun bir cümle iyi bir parola olur. Değişiklikten sonra diğer tüm oturumlar kapanır.')),
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
      if (state.stats) state.stats.setup.password = true;
    } catch (err) { setMsg(msg, 'error', err.message); }
  });

  const backup = h('div', { class: 'card stack' },
    h('div', {}, h('h2', {}, 'Yedek'), h('p', { class: 'hint' }, 'Site metinlerinizi, çalışmalarınızı ve mesajlarınızı bir JSON dosyası olarak indirin. Görseller dosyada yoktur; videolar YouTube/Vimeo bağlantısı olarak durur.')),
    h('div', { class: 'actions' }, h('button', { class: 'btn', type: 'button', onclick: downloadBackup }, 'Yedeği indir')));

  const help = h('div', { class: 'card stack' },
    h('div', {}, h('h2', {}, icon('help', 22), ' Sık sorulanlar'), h('p', { class: 'hint' }, 'Takıldığınız bir yerde önce buraya bakın.')),
    HELP.map(([q, steps]) => {
      const el = group(q, '', steps.length > 1 ? h('ol', { class: 'help-list' }, steps.map((t) => h('li', {}, t))) : h('p', {}, steps[0]));
      return el;
    }));

  return h('div', {}, form, backup, help);
}
