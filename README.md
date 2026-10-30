# Mehmet Abdullah Bardakçı: Portfolyo Sitesi

Cloudflare Pages (statik dosyalar + Pages Functions) ve D1 (veritabanı) üzerinde çalışır. Videolar YouTube/Vimeo'da durur (ücretsiz), kapak görselleri küçültülüp veritabanında saklanır. R2 isteğe bağlıdır.
Sunucu tarafında üretilen sayfa (yazı tipleri: Bricolage Grotesque + Instrument Sans, kendi sunucumuzdan), yönetim paneli ve API tek projede; derleme adımı ve çalışma zamanı bağımlılığı yoktur.

## Yerelde çalıştırma

```bash
npm install
npm run db:local                       # D1 tablolarını oluşturur (yerel)
npm run admin:set                      # yönetici hesabı oluşturur, rastgele parolayı bir kez yazdırır
npm run dev                            # http://127.0.0.1:8788  (panel: /admin/)
npm test                               # Playwright testleri (85 test)
```

## Cloudflare'e yayınlama (`.pages.dev`)

Kendi bilgisayarınızda (veya `CLOUDFLARE_API_TOKEN` tanımlı bir ortamda):

```bash
npx wrangler login
npx wrangler d1 create portfolio-db            # çıktıdaki database_id'yi wrangler.toml'a yazın
npm run db:remote                              # veya: npx wrangler d1 migrations apply DB --remote
npx wrangler pages project create mehmet-abdullah-bardakci --production-branch main
npm run deploy -- --project-name mehmet-abdullah-bardakci
npm run admin:set -- --remote                  # CANLI yönetici hesabı (parolayı not edin)
```

Gizli değerler (depoya veya istemci koduna yazılmaz):

```bash
npx wrangler pages secret put CONTACT_TO       # iletişim formu mesajlarının gideceği e-posta
npx wrangler pages secret put RESEND_API_KEY   # resend.com API anahtarı (aşağıya bakın)
npx wrangler pages secret put IP_PEPPER        # rastgele uzun bir metin
```

Pages projesinde D1 bağlantısı `wrangler.toml` içindeki `DB` adıyla yapılır. **R2 gerekmez.** Doğrudan dosya yüklemeyi (MP4/MOV/WebM, 500 MB'a kadar) açmak isterseniz R2'yi etkinleştirip `wrangler.toml` içindeki yorum satırındaki `[[r2_buckets]]` bloğunu açın; panelde "Dosya yükle" seçeneği kendiliğinden görünür.

### Mesajların e-postaya gelmesi

İletişim formundaki her mesaj önce D1'e yazılır ve **/admin > Mesajlar** altında görünür (hiçbir mesaj kaybolmaz).
E-posta bildirimi için [Resend](https://resend.com) hesabını mesajların gideceği e-posta adresiyle açın, API anahtarı oluşturup
`RESEND_API_KEY` ve `CONTACT_TO` gizli değerlerini ekleyin. Kendi alan adınız yokken gönderici olarak Resend'in
`onboarding@resend.dev` adresi kullanılır ve yalnızca hesap sahibinin adresine gönderebilir. E-posta adresiniz sitede hiçbir yerde görünmez.

## Yönetim paneli (`/admin`)

- **Çalışmalar:** YouTube/Vimeo bağlantısıyla video ekleme (başlık ve küçük resim otomatik gelir; videoyu "Liste dışı" yapın), isteğe bağlı kendi kapak görseli (otomatik küçültülür),
  R2 açıksa ayrıca dosya yükleme (MP4/MOV/WebM, varsayılan **500 MB**, `MAX_VIDEO_MB` ile değişir),
  otomatik kapak görseli, düzenleme, yayından kaldırma, sıralama, silme.
  Dosya yüklemede büyük dosyalar 8 MB parçalarla yüklenir (Pages Functions ~100 MB istek sınırını aşmak için R2 multipart).
- **Site içeriği:** açılış metni, hakkımda, doğum tarihi (yaş her gün otomatik güncellenir), hizmetler, yetenekler, iletişim, SEO, portre fotoğrafı.
- **Genel bakış:** ziyaret grafiği (çerezsiz, kişisel veri tutulmaz), ziyaretçilerin geldiği yerler, en çok izlenen çalışmalar, kurulum kontrol listesi, Instagram için izlenebilir bağlantı.
- **Mesajlar:** iletişim formundan gelenler.
- **Hesap:** parola değiştirme ve yedek indirme (JSON).
- **Hesap:** parola değiştirme.

## Güvenlik özeti (OWASP)

| Konu | Uygulama |
|---|---|
| Kimlik doğrulama | PBKDF2-SHA256 parola özeti (D1); Workers sınırı nedeniyle 100.000 yineleme, bu yüzden rastgele ve uzun parola kullanın. Parola ve kimlik bilgisi istemci koduna/depoya yazılmaz. |
| Oturum | 256 bit rastgele belirteç; veritabanında yalnızca SHA-256 özeti. `HttpOnly`, `Secure`, `SameSite=Strict` çerez; 12 saat mutlak, 2 saat boşta süre. |
| Erişim denetimi | `/api/admin/*` için sunucu tarafı ara katman: oturum + Origin + CSRF belirteci. İstemcide gizlemeye güvenilmez. |
| Kaba kuvvet | Girişte IP başına 15 dakikada 5 hata, genel saatte 40 hata sonrası kilit (429); kullanıcı yokken de aynı hesaplama (zamanlama sızıntısı yok). |
| Enjeksiyon | Yalnızca parametreli D1 sorguları; girdi doğrulama/temizleme; HTML çıktısı kaçışlanır; yönetim paneli `innerHTML` kullanmaz. |
| Dosya yükleme ve bağlantılar | YouTube/Vimeo adresleri yalnızca kimlik (id) olarak ayrıştırılıp adres sunucuda yeniden kurulur; CSP yalnızca `youtube-nocookie.com` ve `player.vimeo.com` çerçevelerine izin verir. |
| Dosya yükleme | Uzantıya değil dosya başlığına (magic bytes) bakılır; boyut sınırı; SVG reddedilir; görseller 1 MB ile sınırlıdır; R2 anahtarları sunucuda üretilir ve yalnızca sunucunun yüklediği dosyalar projeye bağlanabilir. |
| Başlıklar | Sıkı CSP (satır içi betik/stil yok, harici kaynak yok), HSTS, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`. |
| İletişim formu | Oran sınırı (saatte 5), gizli alan tuzağı, minimum doldurma süresi, e-posta başlık enjeksiyonu engeli. |
| Gizlilik | `/admin` ve `/api/` `noindex`/`robots.txt`; alıcı e-posta adresi yalnızca sunucu gizli değerinde. |

## Dizin yapısı

```
functions/   Pages Functions: ana sayfa (SSR), /api/*, /media/*
lib/         ortak kod (kimlik doğrulama, doğrulama, HTML şablonu, güvenlik başlıkları)
public/      statik dosyalar: CSS/JS, yazı tipleri, /admin arayüzü
migrations/  D1 şeması
scripts/     yönetici hesabı betiği
tests/e2e/   Playwright testleri
.claude/     kurulu skill'ler: ui-ux-pro-max, frontend-ui-engineering
```

## Tasarım ve illüstrasyonlar

Çizimler `lib/art.js` içinde elle yazılmış SVG'lerdir (dron, klaket, makara, kamera maskotu, 8 hizmet ve 4 süreç ikonu, bulut, güneş, uçak).
Renkler ve hareketleri `public/assets/art.css` yönetir; imleci izleyen göz, harf harf isim ve paralaks `public/assets/site.js` içindedir.
Tüm hareketler `prefers-reduced-motion` tercihine uyar, ekran dışındaki çizimler duraklar. Paylaşım önizleme görseli `scripts/make-og.mjs` ile üretilir (`public/og.jpg`).

## Bildirimler ve telefonda kullanım

- **Yeni mesaj bildirimi:** Telegram botu (ücretsiz). `TELEGRAM_BOT_TOKEN` ve `TELEGRAM_CHAT_ID` gizli değerlerini Cloudflare'de tanımlayın; adımlar panelde Hesap > Sık sorulanlar içinde. E-posta için Resend de desteklenir (`RESEND_API_KEY`, `CONTACT_TO`).
- **Panel uygulama gibi:** `/admin/` telefonun ana ekranına eklenebilir (manifest ve simgeler hazır).
- **Erişilebilirlik:** axe-core testi (`tests/e2e/a11y.spec.js`) site ve panelde 0 ihlal bekler.
