# Mehmet Abdullah Bardakçı: Portfolyo Sitesi

Cloudflare Pages (statik dosyalar + Pages Functions), D1 (veritabanı) ve R2 (video/görsel depolama) üzerinde çalışır.
Sunucu tarafında üretilen sayfa (yazı tipleri: Bricolage Grotesque + Instrument Sans, kendi sunucumuzdan), yönetim paneli ve API tek projede; derleme adımı ve çalışma zamanı bağımlılığı yoktur.

## Yerelde çalıştırma

```bash
npm install
npm run db:local                       # D1 tablolarını oluşturur (yerel)
npm run admin:set                      # yönetici hesabı oluşturur, rastgele parolayı bir kez yazdırır
npm run dev                            # http://127.0.0.1:8788  (panel: /admin/)
npm test                               # Playwright testleri (25 test)
```

## Cloudflare'e yayınlama (`.pages.dev`)

Kendi bilgisayarınızda (veya `CLOUDFLARE_API_TOKEN` tanımlı bir ortamda):

```bash
npx wrangler login
npx wrangler d1 create portfolio-db            # çıktıdaki database_id'yi wrangler.toml'a yazın
npx wrangler r2 bucket create portfolio-media
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

Pages projesinde D1 ve R2 bağlantıları `wrangler.toml` içindeki `DB` ve `MEDIA` adlarıyla yapılır; `wrangler pages deploy` bunları kullanır.

### Mesajların e-postaya gelmesi

İletişim formundaki her mesaj önce D1'e yazılır ve **/admin > Mesajlar** altında görünür (hiçbir mesaj kaybolmaz).
E-posta bildirimi için [Resend](https://resend.com) hesabını mesajların gideceği e-posta adresiyle açın, API anahtarı oluşturup
`RESEND_API_KEY` ve `CONTACT_TO` gizli değerlerini ekleyin. Kendi alan adınız yokken gönderici olarak Resend'in
`onboarding@resend.dev` adresi kullanılır ve yalnızca hesap sahibinin adresine gönderebilir. E-posta adresiniz sitede hiçbir yerde görünmez.

## Yönetim paneli (`/admin`)

- **Çalışmalar:** video yükleme (MP4/MOV/WebM, dosya başına varsayılan **500 MB**, `wrangler.toml` içindeki `MAX_VIDEO_MB` ile değişir),
  otomatik kapak görseli, düzenleme, yayından kaldırma, sıralama, silme.
  Büyük dosyalar 8 MB parçalarla yüklenir (Pages Functions ~100 MB istek sınırını aşmak için R2 multipart).
- **Site içeriği:** açılış metni, hakkımda, doğum tarihi (yaş her gün otomatik güncellenir), hizmetler, yetenekler, iletişim, SEO, portre fotoğrafı.
- **Mesajlar:** iletişim formundan gelenler.
- **Hesap:** parola değiştirme.

## Güvenlik özeti (OWASP)

| Konu | Uygulama |
|---|---|
| Kimlik doğrulama | PBKDF2-SHA256 parola özeti (D1); Workers sınırı nedeniyle 100.000 yineleme, bu yüzden rastgele ve uzun parola kullanın. Parola ve kimlik bilgisi istemci koduna/depoya yazılmaz. |
| Oturum | 256 bit rastgele belirteç; veritabanında yalnızca SHA-256 özeti. `HttpOnly`, `Secure`, `SameSite=Strict` çerez; 12 saat mutlak, 2 saat boşta süre. |
| Erişim denetimi | `/api/admin/*` için sunucu tarafı ara katman: oturum + Origin + CSRF belirteci. İstemcide gizlemeye güvenilmez. |
| Kaba kuvvet | Girişte IP başına 15 dakikada 5 hata, genel saatte 40 hata sonrası kilit (429); kullanıcı yokken de aynı hesaplama (zamanlama sızıntısı yok). |
| Enjeksiyon | Yalnızca parametreli D1 sorguları; girdi doğrulama/temizleme; HTML çıktısı kaçışlanır; yönetim paneli `innerHTML` kullanmaz. |
| Dosya yükleme | Uzantıya değil dosya başlığına (magic bytes) bakılır; boyut sınırı; SVG reddedilir; R2 anahtarları sunucuda üretilir ve yalnızca sunucunun yüklediği dosyalar projeye bağlanabilir. |
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
