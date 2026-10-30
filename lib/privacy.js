// /gizlilik sayfası: KVKK aydınlatma metni (sade Türkçe). Değişkenler site ayarlarından gelir.
import { esc } from './render.js';

export function renderPrivacy({ site, origin = '' }) {
  const name = esc(site.hero.title);
  const phone = esc(site.contact.phone);
  const ig = esc(site.contact.instagram);
  const year = new Intl.DateTimeFormat('en', { timeZone: 'Europe/Istanbul', year: 'numeric' }).format(new Date());
  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Gizlilik ve KVKK bilgilendirmesi | ${name}</title>
<meta name="description" content="${name} sitesinde hangi kişisel verilerin neden işlendiği, ne kadar saklandığı ve haklarınız.">
<meta name="theme-color" content="#F5F6F8">
${origin ? `<link rel="canonical" href="${esc(origin)}/gizlilik">` : ''}
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="stylesheet" href="/assets/site.css">
<link rel="stylesheet" href="/assets/art.css">
</head>
<body>
<a class="skip" href="#icerik">İçeriğe geç</a>
<main id="icerik" class="doc wrap">
  <p class="doc-back"><a class="btn btn-line" href="/">Ana sayfaya dön</a></p>
  <h1>Gizlilik ve KVKK bilgilendirmesi</h1>
  <p class="doc-lead">Bu sayfa, bu sitede kişisel verilerinizin nasıl kullanıldığını sade bir dille anlatır. 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında bilgilendirme yükümlülüğünü yerine getirir.</p>

  <h2>Veri sorumlusu</h2>
  <p>${name}. Bana iletişim formundan, <a href="tel:${phone}">${phone}</a> numarasından ya da Instagram'da <a href="https://www.instagram.com/${ig}/" rel="noopener noreferrer">@${ig}</a> hesabından ulaşabilirsiniz.</p>

  <h2>Hangi verileri topluyorum?</h2>
  <ul>
    <li><strong>İletişim formu:</strong> adınız, e-posta adresiniz, mesajınız; isteğe bağlı olarak telefon numaranız ve konu. Yalnızca siz yazarsanız toplanır.</li>
    <li><strong>Güvenlik:</strong> aynı kişinin kısa sürede çok sayıda mesaj ya da giriş denemesi yapmasını önlemek için IP adresinizden üretilen, geri döndürülemeyen bir özet (hash) kısa süre tutulur. IP adresinin kendisi saklanmaz.</li>
    <li><strong>Ziyaret sayıları:</strong> sitenin kaç kişi tarafından görüldüğünü anlamak için günlük toplam sayılar tutulur. Bu sayılar sizinle ilişkilendirilemez, çerez kullanılmaz.</li>
  </ul>

  <h2>Neden kullanıyorum, hukuki sebebi nedir?</h2>
  <p>Verilerinizi yalnızca mesajınıza ve iş talebinize yanıt vermek için kullanırım. Hukuki sebep, talebinizin karşılanması (bir sözleşmenin kurulmasına yönelik görüşme) ve sitenin güvenliğini sağlamaktaki meşru menfaattir. Verileriniz reklam, pazarlama ya da profilleme için kullanılmaz ve satılmaz.</p>

  <h2>Kimlerle paylaşılır?</h2>
  <p>Site ve veritabanı, Cloudflare altyapısında barındırılır. Yeni mesaj geldiğinde bana haber vermek için bir bildirim servisi (Telegram ya da e-posta) kullanılabilir; bu durumda mesajınızın özeti bu servisten geçer. Bu hizmet sağlayıcıların sunucuları yurt dışında olabilir. Bunun dışında verileriniz üçüncü kişilerle paylaşılmaz; yasal bir zorunluluk olması hâlinde yetkili makamlara verilebilir.</p>

  <h2>Ne kadar saklanır?</h2>
  <p>Mesajlar, talebiniz sonuçlanana kadar ve en çok 24 ay saklanır. Silinmesini istediğinizde en kısa sürede silerim.</p>

  <h2>Çerezler</h2>
  <p>Bu sitede ziyaretçiler için çerez kullanılmaz; üçüncü taraf takip ya da reklam aracı yoktur. Yalnızca site yöneticisinin giriş yaptığı panelde oturum çerezi bulunur. Video bağlantıları (YouTube, Vimeo) siz oynatıcıyı açtığınızda ilgili platformdan yüklenir; bu platformların kendi gizlilik kuralları geçerlidir.</p>

  <h2>Haklarınız</h2>
  <p>KVKK'nın 11. maddesi uyarınca; verilerinizin işlenip işlenmediğini öğrenme, işlenmişse bilgi isteme, düzeltilmesini veya silinmesini isteme, itiraz etme ve zarar hâlinde tazminat isteme haklarına sahipsiniz. Taleplerinizi yukarıdaki iletişim yollarından iletebilirsiniz; en geç 30 gün içinde yanıtlanır. Ayrıca Kişisel Verileri Koruma Kurumu'na şikâyet hakkınız saklıdır.</p>

  <p class="doc-date">Son güncelleme: ${year}</p>
</main>
<footer class="footer"><div class="wrap"><p>© ${year} ${name}</p><a href="/">Ana sayfa</a></div></footer>
</body>
</html>`;
}
