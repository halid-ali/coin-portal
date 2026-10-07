# CoinVitrine - Proje Durumu ve Kararlar

Son güncelleme: 2026-10-07 (**fotoğraf alanı** (yol haritası 20, Tamamlananlar 91) `feat/photo-quota-setting`'te,
kullanıcıya kalan alan ve admin'e kota ayarı; **görsel düzeltmeler `main`'de, yayında değil** (Tamamlananlar 90:
admin seçim çubuğu, Genel ayarlar kartları, coin formu fotoğraf hizası, yayına alma bandı, sayfa yolu). **`v1.7.0` yayında**: e-posta doğrulama (Tamamlananlar 88–89): doğrulanmamış
hesabın sınırları (paylaşım yok, tek koleksiyon, 20 coin) ve 30 günlük ömrü (hatırlatmalar), admin panelinde
doğrulanmamış durumu, toplu silme, elle doğrulama ve mevcut hesaplara bir seferlik doğrulama e-postası; canlıda
e-posta MonsterASP SMTP'sinden. `v1.6.0` güvenlik testleri, yol haritası 19 (79–87): CodeQL, yetki matrisi,
kötüye kullanım testleri, CI'da ZAP, elle pentest. `v1.5.1` coin değer ikonları (77–78), `v1.5.0` herkese açık koleksiyon kuralı
(75–76). Önceki sürümler: `v1.4.0` yeni logo ve ana sayfa (72–74), `v1.3.0` P2 ve Angular 21.2.25 (66–71), P1
`v1.1.0` ve `v1.2.0`'da (54–65). Site: https://coinvitrine.com, site adı **CoinVitrine**, onaylı yayın pipeline'ı
(Tamamlananlar 51–53). Proje GitHub'da public: https://github.com/halid-ali/coin-portal)

## Yeni sohbete başlarken

- Durum: `main` güncel ve temiz; son etiket `v1.7.0` (2026-10-07), canlıda `v1.7.0`. `main`'de yayınlanmamış
  görsel düzeltmeler var (Tamamlananlar 90); bir sonraki sürüme girer. Fotoğraf alanı (91) kendi branch'inde.
  GitHub: https://github.com/halid-ali/coin-portal (public; sadece `main` ve etiketler push edilir, CI her push'ta koşar). Yeni sohbette önce `git status -sb` ile
  lokal `main`'in `origin/main` ile aynı olduğu kontrol edilir. Yollar: API `src/api`, client `src/web`
  (komutlar CLAUDE.md'de).
- Canlı site: https://coinvitrine.com (`v1.7.0`, MonsterASP.NET; `coinportal.runasp.net` ve `www.` 308 ile
  oraya yönlenir; kullanıcı admin; alan adı ve DNS Cloudflare'de, e-posta `contact@coinvitrine.com`;
  uygulamanın e-postaları da bu kutudan, MonsterASP SMTP'si `mail2248.mailasp.net:587` STARTTLS, ayarlar
  sunucudaki `web.config`'te `Email__*`).
  **Yeni sürüm = etiket push'u:** Release workflow'u kontrol, paket ve onay bekleyen deploy'u çalıştırır
  ("Yayın (deploy) adımları"); sunucudaki `web.config` parolayı ve ayarları tutar, deploy ona dokunmaz.
- API'yi (5080) ve `ng serve`'ü (4200) kullanıcı kendi terminallerinde çalıştırır; kural CLAUDE.md "Çalışan
  uygulamalar"da. Yeni sohbette ikisi kontrol edilir (`curl -s localhost:5080/api/health`,
  `curl -s -o /dev/null -w '%{http_code}' localhost:4200/`); API çalışıyorsa `bin/` kilitlidir, derleme ve
  test ayrı klasöre (`-p:BaseOutputPath=<scratchpad>/testbin/`).
- İlk iş: kullanıcıyla sıradaki adımı seçmek ("Aksiyon planı", "Yol haritası" ve "Sıradaki adım"). İnceleme
  işlerinin ayrıntısı GitHub issue'larında (#10–#35).
- Lokal admin: `src/api/appsettings.Development.json` → `Admin:UserIds` (API açılışta rolü verir).
- 4200'deki `ng serve` 2026-09-29'dan beri sahipsiz bir süreçten çalışıyor olabilir (Tamamlananlar 31);
  `Port 4200 is already in use` görülürse önce o süreç kapatılır.
- Backend değişikliklerinden sonra `dotnet test` (API çalışırken `-p:BaseOutputPath=<scratchpad>/testbin/`).
- ImageSharp lisansı: `src/api/sixlabors.lic` lokalde var (gitignore'da), CI'da GitHub secret
  `SIXLABORS_LICENSE_KEY`. Lisans 2027-12-26'da biter (Açık konular 1).

Bu doküman projenin **değişen** tarafını tutar: nerede olduğumuz, neyin neden böyle kararlaştırıldığı,
sırada ne olduğu. Değişmeyen kurallar, komutlar ve tuzaklar [CLAUDE.md](../CLAUDE.md) içinde.
Her özellik ya da anlamlı adım sonunda güncellenir.

## Çalışma şekli

- Geliştirme VS Code'daki Claude Code eklentisiyle yapılıyor. Claude repo'yu doğrudan okuyor, dosyaları
  düzenliyor, `dotnet build` / `ng build` / `ng test` komutlarını kendisi çalıştırıyor. Kopyala-yapıştır
  dönemi (Claude Desktop, 2026-09-26/27) bitti.
- Her yeni özellik için tercihen yeni bir sohbet. Sohbet bu dokümanı ve CLAUDE.md'yi okuyarak başlar,
  özellik bitince bu doküman güncellenir.
- Claude'un kişisel/oturumlar arası notları (kullanıcı tercihleri gibi) Claude Code'un kendi hafızasında
  tutulur; proje bilgisi her zaman repo'daki bu dosyalarda.

## Teknoloji yığını ve gerekçeler

- **Frontend:** Angular 21 (standalone, signals, zoneless) + Tailwind CSS 4 (`@tailwindcss/postcss`),
  TypeScript ~5.9, testler Vitest + jsdom. UI kütüphanesi yok.
- **Backend:** ASP.NET Core Web API (.NET 10, controller tabanlı) + EF Core 10 + ASP.NET Core Identity.
  Google/Microsoft girişi düşünülmüştü; yol haritasında değil (gerekirse ayrı karar).
- **API dokümantasyonu:** `Microsoft.AspNetCore.OpenApi` (`/openapi/v1.json`) +
  `Swashbuckle.AspNetCore.SwaggerUI` (`/swagger`), sadece Development'ta.
- **Veritabanı:** Lokalde SQL Server LocalDB (`(localdb)\MSSQLLocalDB`, sürüm 16), veritabanı `CoinPortal`.
  Hostingde büyük olasılıkla MSSQL; provider aynı olduğu için migration'lar doğrudan kullanılabilir.
- **Kimlik doğrulama:** Identity + HttpOnly cookie. JWT yok, çünkü Angular ve API aynı origin'de olacak.
- **Yayın:** Angular derlemesi ASP.NET Core `wwwroot` içinden sunulacak, tek site olarak Windows hostinge.
  CORS gerekmeyecek.
- **Neden bu yığın:** Kullanıcı Windows hosting düşünüyor (kendi sunucusu yok), .NET geçmişi var. NestJS
  Windows paylaşımlı hostingde sorunlu. Supabase elendi.
- **Fotoğraf:** Kararlar ve gerekçeleri "Fotoğraflar" bölümünde (2026-09-27'de kararlaştırıldı).
- **Ülke isimleri:** Veritabanında çok dilli isim yok; client ISO koddan `Intl.DisplayNames` ile üretiyor.
- **Çok dilli arayüz:** Transloco (`@jsverse/transloco` 8.4, çalışma anında çeviri, tek derleme). Kararlar
  ve gerekçeler "Çok dilli destek: kararlar" bölümünde.
- **daisyUI:** Tartışıldı, ertelendi. Mevcut `.card`/`.btn-primary` class'larıyla çakışıyor, tüm
  template'lere yayılan refactor ister. Yapılacaksa ayrı `chore/daisyui` branch'inde, önce mevcut
  görünümle yan yana karşılaştırılıp kullanıcı "değer" derse.

## Ortam (geliştirme makinesi)

- Node.js 22.19.0, npm 11, Git 2.55, .NET SDK 10 (yanında 9.0.306), Angular CLI 21.2.24, PowerShell 7.6,
  VS Code (C# Dev Kit, Angular Language Service, Tailwind CSS IntelliSense, ESLint, Prettier,
  Claude Code), SQL Server LocalDB 16, `sqlcmd`.
- `dotnet-ef` 10.0.12 local tool (`.config/dotnet-tools.json`). `global.json` SDK'yı sabitliyor, `nuget.config`
  sadece nuget.org.
- Terminal çoğunlukla Git Bash (MINGW64).
- Git kimliği sadece repo seviyesinde tanımlı (GitHub noreply adresi); global Git ayarlarına dokunulmaz.
- Makinenin global `.npmrc`'sinde özel bir feed tanımlı. Paket kurulumunda sorun çıkarsa `src/web/.npmrc`
  ile public npm registry'sine sabitlenir (şu an böyle bir dosya yok).
- TS5011 uyarısı çözüldü: `tsconfig.app.json`/`tsconfig.spec.json` içinde `"rootDir": "./src"`,
  `.vscode/settings.json` içinde `"js/ts.tsdk.path"`.

## Tamamlananlar

1. **İskelet** (`chore/project-skeleton`): Solution (`CoinPortal.slnx`), Web API, Angular client, Tailwind 4.
2. **Dev proxy** (`chore/dev-proxy`): API `http` profili `http://localhost:5080`; `proxy.conf.json` `/api`
   → 5080; `GET /api/health`.
3. **Veritabanı ve auth temeli** (`feat/auth-foundation`):
   - `ApplicationUser : IdentityUser` → `FirstName`, `LastName` (max 100), `BirthDate` (`DateOnly`),
     `CreatedAtUtc`. `NormalizedEmail` unique filtreli index. Migration `InitialIdentity`.
   - Identity: unique e-posta, parola en az 8 + rakam/küçük/büyük harf, 5 hatada 10 dk kilit, kullanıcı
     adında `a-zA-Z0-9._-` (`@` yok, login'de kullanıcı adı/e-posta ayrımı için).
   - Cookie `coinportal.auth`: HttpOnly, `SameSite=Lax`, Development'ta `SameAsRequest`, diğerlerinde
     `Always`, 14 gün sliding, yönlendirme yerine 401/403.
   - `AuthController`: `register` (18+ yaş kontrolü), `login` (401/423), `logout` (204), `me` (200/401).
4. **Auth UI + CSRF** (`feat/auth-ui`):
   - Antiforgery (header `X-XSRF-TOKEN`, cookie `coinportal.af`), `GET /api/auth/antiforgery`.
   - Client: `AuthService`, guard'lar, `authInterceptor` (401 → `/login`), `mapValidationProblem`,
     validator'lar + Vitest, Home/Login/Register sayfaları, mobil menülü header.
5. **Coin CRUD API + Collection UI** (`feat/coin-api`):
   - Swagger UI + XSRF interceptor. Test akışı: antiforgery → login → antiforgery → korumalı istekler.
     Cookie'ler porta bağlı değil, Swagger oturumu `localhost:4200` ile paylaşılıyor.
   - **Veri modeli** (migration `AddCoinsAndCountries`):
     - `Denomination` enum, değer = cent (`Cent1 = 1` … `Euro2 = 200`), `int` sütun.
     - `Countries`: PK ISO 3166-1 alpha-2 `Code` (`char(2)`), `Name` (İngilizce). 25 ihraççı seed
       (21 euro bölgesi üyesi, Bulgaristan 2026 dahil + AD, MC, SM, VA). `EuroSinceYear` bilinçli olarak
       yok (coin tarihleri geçiş yılıyla örtüşmüyor).
     - `Coin`: `OwnerId` (FK, cascade), `Title` (100), `Description` (2000), `Denomination`,
       `CountryCode` (FK, restrict), `Year`, `MintMark` (10), `IsCommemorative`, `Quantity` (1),
       `CreatedAtUtc`, `UpdatedAtUtc`.
     - Check constraint'ler: `CK_Coins_Denomination`, `CK_Coins_Year` (>= 1999), `CK_Coins_Quantity`
       (>= 1). Index `(OwnerId, CountryCode, Denomination, Year)`.
   - **Endpoint'ler:** `GET api/countries` (anonim). `api/coins` (`[Authorize]`, sadece kendi coinleri):
     liste (filtreler `denomination`, `countryCode`, `year`, `isCommemorative`, `search`; `sort` =
     `Newest`/`Denomination`/`Country`/`Year`; `page`, `pageSize` varsayılan 10, en fazla 100, 0 = tümü;
     cevap `PagedResponse`), `GET {id}`, `POST` (201), `PUT {id}`, `DELETE {id}` (204). Başkasının coini
     → 404. Yıl üst sınırı: mevcut yıl + 1. "Bende var mı?" için ayrı endpoint yok, filtreli liste yeterli.
   - **Client:** `CoinService`, `CountryService`, `coin-format`. Route'lar `/collection`,
     `/collection/new`, `/collection/:id/edit`. Collection: arama (300 ms debounce), filtreler, sıralama,
     masaüstünde tablo / mobilde kart, üstte ve altta `Pagination` (10/25/50/Tümü). Coin formu
     (ekle/düzenle tek component, başlık otomatik önerisi, silme onay modalı).
   - **Dev seed:** `DevData/dev-seed.json`, 5 kullanıcı, 567 sentetik ama gerçekçi coin. Tekrar
     çalıştırmak seed kullanıcılarının coinlerini sıfırlar, diğer hesaplara dokunmaz. Yayına gitmez.
6. **Claude Code kurulumu** (`chore/claude-code-setup`): `CLAUDE.md`, `README.md`, bu doküman.
7. **Tablo sütun sıralaması ve sabit sütun genişlikleri** (`feat/collection-column-sort`, akış testi):
   - API: `CoinSort` = `Newest`, `Title`, `Denomination`, `Country`, `Year`, `MintMark`,
     `Commemorative`, `Quantity`; yeni `dir` (`Asc`/`Desc`, varsayılan `Asc`, `Newest` yönü yok sayar) ve
     `countryOrder` (virgüllü ISO kodları; `CHARINDEX` ile sıralama, dil bağımsız). Seçilen sütun yönü
     izler, eşitlikte sabit yönlü ikincil anahtarlar (ülke, yıl, nominal) + `Id`. Darphane işaretsizler
     her iki yönde sonda. Eski `sort=Denomination`/`Year` artık varsayılan olarak artan.
   - Client: `SortHeader` bileşeni (etiket + yanında ikon butonu: ↕ nötr, ↑ artan, ↓ azalan; aktifken
     amber rozet, `aria-sort`), `nextSort` döngüsü (+ Vitest). "Sırala" select'i sadece mobilde, tüm
     sütun/yön seçenekleriyle. Tablo `table-fixed` + `<colgroup>`: sabit sütun genişlikleri sayfadan
     bağımsız, sabit sütunlar tek satır; tablo artık `lg` (1024px) ve üstünde, altında kart listesi.
   - Doğrulama: API 5090'da seed verisiyle curl, client headless Edge ile (genişlikler 5 farklı
     sayfa/sıralamada aynı, tıklama döngüsü, mobil select).
8. **Fotoğraf yükleme** (`feat/coin-photos`). Lisans kararı beklenmeden merge edildi: engel sadece Release
   (publish) derlemesinde, bkz. "Yayın öncesi yapılacaklar". Kararlar ve ayrıntılar "Fotoğraflar" bölümünde.
   - API: `CoinPhoto` tablosu (migration `AddCoinPhotos`), `Photos/` (`PhotoOptions`, `IPhotoStorage` +
     `FileSystemPhotoStorage`, `IImageProcessor` + `ImageSharpImageProcessor`), `CoinPhotosController`
     (`PUT`/`DELETE api/coins/{id}/photos/{side}`, `GET …/{side}/{size}?v=`), coin yanıtında `photos`,
     coin silinince ve dev seed sıfırlanınca dosya temizliği, kota kontrolü, hata kodları.
   - Client: `PhotoSlot` (formda ulusal/ortak yüz, bekleyen değişiklik rozeti, Geri al), `PhotoCropDialog`
     (ngx-image-cropper 9.1.7, yuvarlak kılavuz, yakınlaştırma, yakınlaştırınca fotoğrafı dairenin
     dışından sürükleyerek kaydırma, 90° döndürme, sıfırla), `PhotoViewer` (tam ekran,
     ulusal/ortak yüz geçişi, ok tuşları), `CoinThumb` (tablo ve kartlarda yuvarlak thumbnail), `photo-errors`
     (Türkçe hata mesajları + ön kontrol). Ortak `dialog-panel` stili (onay penceresi de buna geçti).
   - Doğrulama: API'ye karşı curl ile üretilen test görselleri (EXIF yönü + GPS'li JPEG, şeffaf PNG,
     çok küçük, çok geniş, GIF, sahte dosya), değiştirme/silme/coin silme temizliği, kota (5 KB'lık ikinci
     instance), önbellek (304, eski sürüm 404); arayüz headless Edge ile (seç → kırp → kaydet, yeni coin
     + fotoğraf, görüntüleyici, mobil).
   - **Izgara görünümü:** Koleksiyonda liste/ızgara geçişi (iki ikon buton, URL'de `view=grid`). Izgarada
     masaüstünde satır başına 5, tablette 3, telefonda 2 kutu (kullanıcı kararı); kutuda ulusal yüz
     fotoğrafı (600 px), başlık, nominal ve ülke/yıl; kutuya tıklamak tam ekran görüntüleyiciyi
     (fotoğraf yoksa düzenlemeyi), sağ üstteki kalem butonu düzenlemeyi açar (kullanıcı kararı).
     Izgarada "Sırala" menüsü masaüstünde de görünür. Sayfalama satırı üç bölmeli: solda görünüm,
     ortada sayfa butonları, sağda sayfa başına. Coin formundan dönüşler listenin son durumunu
     (görünüm, filtre, sıralama, sayfa) korur.
9. **Birden fazla koleksiyon** (`feat/collections`, paylaşımın 1. aşaması):
   - API: `Collection` entity (sahip, ad ≤100, açıklama ≤1000; sahip başına benzersiz ad, Türkçe
     büyük/küçük harf duyarsız), coin'de zorunlu `CollectionId` (FK restrict; `OwnerId` korunur).
     Migration `AddCollections` elle düzenlendi: her kullanıcıya "Koleksiyonum" açıp coin'leri taşır
     (9 kullanıcı, 570 coin kayıpsız taşındı). `CollectionsController` (`api/collections`: liste
     [coin sayısı + kapak fotoğrafı], getir, oluştur, güncelle, sil `?moveTo=`; `last_collection`,
     `invalid_target`, `DuplicateName`). `api/coins?collectionId=`, coin oluşturma/güncellemede zorunlu
     `collectionId` (taşıma). Kayıtta varsayılan koleksiyon. Ortak `CodedProblem` yardımcısı.
     Dev seed: her seed kullanıcısında "Koleksiyonum" + "Hatıra paraları" (hatıra coin'leri).
   - Client: `/collections` (kartlar: kapak, ad, açıklama, coin sayısı; "+ Yeni koleksiyon"),
     `/collections/:id` (başlık, Düzenle, Sil, "+ Coin ekle"), `/coins/new?collection=`,
     `/coins/:id/edit` (koleksiyon seçimi, taşıma uyarısı); eski adresler yönlendirilir.
     `CollectionFormDialog`, `CollectionDeleteDialog` (ad yazarak onay, taşı/sil seçimi, tek koleksiyon
     uyarısı). Menüde "Koleksiyonlarım". `CollectionReturn` artık tam adresi hatırlıyor.
   - Doğrulama: API için 27 kontrollük Node testi (başkasının koleksiyonu 404, Türkçe ad çakışması,
     taşıma/silme, fotoğraf dosyalarının silinmesi, kayıtta varsayılan koleksiyon); arayüz için headless
     Edge'de 26 kontrollük akış testi.
   - Not: seed yeniden çalıştırıldığı için seed kullanıcılarındaki fotoğraflar silindi (12 kayıt;
     kullanıcının bu hesaplarla yaptığı yüklemeler de dahil olabilir).
   - **Kapak fotoğrafı** (kullanıcı isteği): koleksiyon düzenleme/oluşturma penceresinde 16:9 kırpma
     (dikdörtgen çerçeve), Kaydet'te yüklenir; yoksa son coin fotoğrafı "Otomatik" olarak kullanılır
     (2026-09-28'de kaldırıldı: kapak yoksa varsayılan koleksiyon görseli, Tamamlananlar 14).
     API: `Collection.CoverImageId`/`CoverSizeBytes` (migration `AddCollectionCover`),
     `CollectionCoversController` (`PUT`/`DELETE`/`GET api/collections/{id}/cover?v=`), en fazla 1200×675
     WebP, büyütme yok, en az 320 px genişlik; kotaya dahil (`PhotoQuota`); koleksiyon silinince dosya
     da silinir. Koleksiyon sayfası başlığında küçük kapak. 21 kontrollük API testi, arayüz testi.
   - **Navbar** (kullanıcı isteği): yapışkan, bulanık arka planlı üst çubuk; ikonlu menü öğeleri (aktif
     sayfa amber hap), sağda baş harf avatarı + kullanıcı menüsü (ad, e-posta, Çıkış; Esc ve dışarı
     tıklama kapatır), mobilde tam genişlik menü.
   - Izgaradaki açıklamasız mavi nokta (hatıra göstergesi) fotoğrafın köşesinde "Hatıra" etiketi oldu.
10. **Paylaşım** (`feat/sharing`, 2. aşama):
    - API: `Collection.Visibility` (Private/Unlisted/Public) ve `ShareToken` (128 bit, sadece Unlisted
      iken; migration `AddCollectionVisibility`, mevcutlar Private). Sahip: `PUT` ile görünürlük,
      `POST api/collections/{id}/share-token` ile yeni link. `PublicController` (`api/public`, girişsiz):
      `collectors`, `users/{userName}` (herkese açık koleksiyonu yoksa 404), `collections/{id}[/coins]`,
      `shared/{token}[/coins]`, `coins` (Keşfet, `owner` filtresi, `pageSize=0` yasak). Fotoğraf ve kapak
      GET'leri görünürlüğe göre (`CollectionAccess`, `s=` anahtarı). Coin listeleme `CoinListing`'e taşındı.
      Dev seed'e örnek paylaşımlar eklendi (ayse/elif herkese açık, jonas linkle); seed kullanıcı onayıyla
      çalıştırıldı.
    - Client: koleksiyon penceresinde görünürlük seçimi, "kaydedince…" notları, link kutusu (kopyala,
      yeni link oluştur + onay); kartlarda ve başlıkta görünürlük rozeti, başlıkta "Linki kopyala".
      Koleksiyon sayfası dört modlu (sahip/herkese açık/gizli link/Keşfet; sahip dışı salt okunur).
      Profil sayfası, Keşfet (koleksiyoncu filtresi, "@kullanıcı · koleksiyon" linkleri, Koleksiyoncu
      sütunu), menüde ve ana sayfada Keşfet (girişsiz de). Ortak `CollectionCard`, `VisibilityBadge`.
    - Güvenlik gözden geçirmesi: kişisel veri sızıntısı yok (sadece kullanıcı adı), erişim kuralı tek
      yerde, paylaşılmayan her şey 404, anahtar iptali anında. Bulunup düzeltilen: Keşfet'te girişsiz
      "tümü" sorgusu (yasaklandı), `owner` uzunluk sınırı. Açık kalan: istek sınırlama (Açık konular 11).
    - Doğrulama: 46 kontrollük API testi, 26 kontrollük arayüz testi (headless Edge, girişsiz akış dahil).
11. **Çok dilli destek** (`feat/i18n`, 2026-09-28; kararlar "Çok dilli destek: kararlar" bölümünde):
    - API: `ApplicationUser.PreferredLanguage` (`varchar(8)`, null = seçmedi; migration
      `AddUserPreferredLanguage`), `Localization/SupportedLanguages` (en, tr, de, bg) +
      `[SupportedLanguage]` doğrulaması. Kayıtta `language` (tercih olarak kaydedilir, ilk koleksiyonun adı
      o dilde: "My collection" / "Koleksiyonum" / "Meine Sammlung" / "Моята колекция";
      `Collection.DefaultNameFor`). `me` yanıtında `language`. `SettingsController` (`GET`/`PUT
      api/settings`, şimdilik sadece dil).
    - Client: Transloco, `src/i18n/{en,tr,de,bg}.json` (~280 metin, lazy chunk), `LanguageService`
      (hesap > tarayıcıdaki seçim > tarayıcı dili > İngilizce), `plural` pipe'ı (`Intl.PluralRules`),
      çevrilmiş sayfa başlıkları (`TranslatedTitleStrategy`), dile göre ülke adları ve sıralaması, hata ve
      doğrulama mesajları çeviri anahtarlı. Tüm sayfalardaki sabit metinler anahtarlara taşındı; modellerde
      enum etiketi kalmadı.
    - Avatar menüsünde (ve mobil menüde) "Ayarlar".
    - **Footer** (kullanıcı isteği): solda logo, ortada "© <yıl> Coin Portal", sağda dil seçici;
      içerik navbar'la hizalı (logo logoyla, seçici avatarla). Header ve footer `sm` ve üstünde
      yapışkan, telefonda değil (kullanıcıyla kararlaştırıldı: küçük ekranda alan kaplamasın). Header
      aslında daha önce de yapışmıyordu (`sticky` host'un içindeki `<header>`'daydı), düzeltildi.
    - **Dil seçici:** bayraklı dropdown (`LanguageSelect` + `Flag`, dikdörtgen SVG bayraklar; İngilizce
      için Birleşik Krallık), Ayarlar'da ve footer'da aynı bileşen. Footer'dan seçim de girişliyse
      hesaba kaydedilir. Üst menüdeki girişsiz dil seçici footer gelince kaldırıldı (tekrar olmasın).
    - **Ayarlar sayfası** (`/settings`, kullanıcı isteği): solda bölüm menüsü (mobilde üstte sekme
      satırı), sağda bölüm içeriği. İlk bölüm "Dil": bayraklı dropdown (kullanıcı isteği; radyo
      butonlar kaldırıldı), aktif dil seçili gelir, seçim anında hesaba kaydedilir ve uygulanır.
      İleride Görünüm, Güvenlik vb. bölümler `SECTIONS` + alt rota olarak eklenecek.
    - Tablo başlıkları için kısa sütun etiketleri (`coin.column.*`); sütun genişlikleri dört dilin en
      uzun başlığına göre yeniden dengelendi (Nominal ve Hatıra `w-29`, Ülke `w-28`, sahip "Düzenle"
      `w-26`). Filtre ızgarası alta hizalı (iki satıra inen etiketlerde select'ler aynı hizada). Sıralama
      select'i mobilde taşmıyor (`min-w-0`; Bulgarcada yatay kaydırma yapıyordu).
    - Terimler araştırılarak seçildi (ECB, Bulgaristan Merkez Bankası, Alman darphaneleri; ayrıntılar
      "Çok dilli destek: kararlar").
    - Doğrulama: 17 kontrollük API testi (dile göre ilk koleksiyon, ayarlar ucu, geçersiz dil 400, girişsiz
      401), 44 kontrollük arayüz testi (headless Edge: seçici, hatırlama, girişte hesabın dili, ayarlar,
      sayfa başlıkları, çoğul, doğrulama mesajı, 4 dilde tablo başlığı taşması ve 4 dilde mobil yatay
      taşma), Vitest 36 test (dört dosyada anahtar ve `{{parametre}}` eşliği, her dilin çoğul biçimleri).
12. **Açık/koyu tema** (`feat/theme`, 2026-09-28; kararlar "Görünüm ve tema: kararlar" bölümünde):
    - API: `ThemePreference` enum (`System = 0`, `Light = 1`, `Dark = 2`), `ApplicationUser.PreferredTheme`
      (nullable int + check constraint; migration `AddUserPreferredTheme`). `me` ve `api/settings`
      yanıtlarında `theme`. `PUT api/settings` hâlâ tüm ayarları değiştirir ama `language` artık zorunlu
      değil: null "seçilmedi" demek, böylece sadece tema değişince dil açık bir seçime dönüşmez.
    - Client: `core/theme/ThemeService` (`<html>`'de `dark` class'ı, sistem temasını `matchMedia` ile canlı
      izler), `core/settings/ThemePreference` (anında uygular, girişliyse hesaba kaydeder, hata olursa geri
      alır), `SettingsService.update` kısmi değişiklik alır (diğer ayarlar mevcut kullanıcıdan).
      `index.html`'deki küçük script Angular'dan önce `dark` class'ını koyar (açılışta beyaz parlama olmaz).
    - Navbar'da güneş/ay butonu (`shared/theme-toggle`, herkes görür, mobilde hamburger'in yanında).
    - Ayarlar'da "Dil" bölümü **"Görünüm"** oldu (`/settings/appearance`, eski `/settings/language`
      yönlenir): Dil kartı + Tema kartı (Açık / Koyu / Sistem, küçük önizlemeli radyo kartlar; Sistem
      yarı açık yarı koyu).
    - **Ayarlar > Profil** (kullanıcı isteği, menüde Görünüm'ün üstünde, `/settings` buraya açılır):
      isim, soyisim, kullanıcı adı, e-posta, doğum tarihi (aktif dilde uzun tarih). Şimdilik salt okunur,
      veri `me` yanıtından (ek istek yok). Neyin değiştirilebileceği sonra kararlaştırılacak (Sıradaki adım).
    - Ayarlar menüsündeki aktif bölümün çerçevesi görünmüyordu (sadece köşelerde koyuluk): mobil sekme
      satırı için `overflow-x-auto` olan liste, butonun dışına çizilen ring'i kesiyordu. Listeye iç boşluk
      verildi; aktif bölüm artık navbar'daki gibi (aynı class'lar) vurgulu.
    - **Renk token'ları:** `styles.css`'te tema duyarlı ölçekler: `shade` (slate), `brand` (amber),
      `danger` (red), `info` (sky), `success` (emerald). ~290 renk class'ı betikle bunlara taşındı; koyu
      temada sadece CSS değişkenleri değişir, template'lerde `dark:` yok (avatar ve bayrak çerçevesi
      hariç). İki temada aynı kalanlar düz palet: birincil/tehlike butonları, logo, fotoğraf görüntüleyici,
      kırpma sahnesi.
    - Doğrulama: API 5090'da (Dark/System kaydı, dil null kalıyor, geçersiz tema 400, sayısal değer 400),
      Vitest 39 test (+3 `ThemeService`), headless Edge ile iki temada ekran görüntüleri (giriş, Keşfet,
      Koleksiyonlarım, liste, ızgara, coin formu, Ayarlar, kullanıcı menüsü, mobil liste ve menü).
      Diyaloglar (onay, koleksiyon formu, kırpma) ve dil dropdown'ı koyu temada görsel olarak kontrol
      edilmedi (koleksiyon formu ve silme penceresi 2026-10-04'te bakıldı, Tamamlananlar 68).

13. **Tema rengi (vurgu rengi)** (`feat/accent-color`, 2026-09-28; kararlar "Görünüm ve tema: kararlar"):
    - API: `AccentColor` enum (`Amber = 0`, `Teal`, `Blue`, `Indigo`, `Violet`, `Rose`, `Lime = 6`),
      `ApplicationUser.PreferredAccent` (nullable int + check constraint; migration `AddUserPreferredAccent`).
      `me` ve `api/settings` yanıtlarında `accent`; `PUT api/settings` onu da alır (null = seçilmedi).
    - Client: `core/theme/AccentService` (`<html data-accent="…">`, amber'de attribute yok, tarayıcıda
      `coinportal.accent`), `core/settings/AccentPreference` (anında uygular, girişliyse kaydeder, hata olursa
      geri alır). `index.html` betiği rengi Angular'dan önce koyar. Girişte ve açılışta hesabın rengi kazanır.
    - `styles.css`: her renk için `--accent-50…950` + `--accent-fill` / `-fill-hover` / `-on-fill`;
      `brand-*` (açık ve koyu) bunlardan türüyor. Yeni token'lar `primary`, `primary-hover`, `on-primary`;
      `btn-primary` artık bunları kullanıyor (önceden sabit amber).
    - Ayarlar > Görünüm'de üçüncü kart "Tema rengi": yuvarlak renk örnekleri (radyo, seçilide tik), adları
      dört dilde (`theme.accent.*`). Tema önizlemelerindeki buton seçili rengi gösteriyor. Kart yeterince
      genişse tek satır 7, değilse 4 + 3 (kullanıcı isteği; kartın genişliğine bakan container query, çünkü
      yan menü `md`'de açılıyor ve ekran genişliğine göre 6 + 1 / 5 + 2 bölünmeler oluyordu).
    - Doğrulama: API 5090'da 11 kontrol (kaydet/oku, `me`, dil/tema değişmiyor, bilinmeyen renk 400,
      sayısal değer 400, girişsiz 401), Vitest 43 test (+4 `AccentService`), headless Edge (4300 → 5090):
      girişsiz tarayıcı seçimi, girişte ve yeniden yüklemede hesabın rengi, iki temada renk değiştirme ve
      kayıt, koleksiyon/Koleksiyonlarım/coin formu ekran görüntüleri, dört dilde mobilde yatay taşma yok,
      dört dilde 320–1280 px arası renk satırları (7 ya da 4 + 3) ve kesilen renk adı yok.
14. **Genel görsel düzeltmeler** (2026-09-28, sohbet devam ediyor; kararlar "Görünüm ve tema: kararlar"):
    - Kaydırma çubuğu kayması (`fix/scrollbar-shift`): kaydırmasız sayfadan kaydırmalı sayfaya geçince ve
      pencere açılınca (`html:has(dialog:modal)` kaydırmayı kapatıyor) sayfa yana kayıyordu.
      `html { scrollbar-gutter: stable }` ile çubuğun yeri hep ayrılıyor; ayrılan şerit koyu temada beyaz
      kalmasın diye `html` de `bg-shade-50`. Kullanıcı tarayıcıda kontrol etti.
    - Header taşması (`fix/header-overflow`): girişliyken 640–700 px arasında menü linkleri iki satıra
      kırılıyor, Almanca/Türkçe/Bulgarca'da sayfa 34 px'e kadar yatay taşıyordu. Kullanıcı adı `md` altında
      gizli (sadece avatar; açılan menüde ad ve e-posta var), `md` ve üstünde `max-w-28` + `truncate`;
      linkler ve logo `whitespace-nowrap`. Headless Edge (gerçek kaydırma çubuğuyla, 4 dil × girişli/girişsiz
      × 320–1280 px): önce 10 sorun, sonra 0; 768 px'te sınıra kadar dolu kullanıcı adıyla Almanca'da 10 px
      pay kalıyor. Not: DevTools cihaz görünümünde kaydırma çubuğu yer kaplamaz, taşmayı olduğundan az gösterir.
    - Kullanıcı adı sınırı 3–30'dan **3–20** karaktere indi (`feat/username-limit`, kullanıcı kararı): kısa
      adlar `/u/…` linklerinde, kartlarda ve navbar'da daha iyi duruyor. Sadece doğrulama (API regex,
      kayıt formu `maxLength`, dört dilde `register.userNameHint`); sütun ve migration değişmedi, mevcut
      kullanıcılar etkilenmez (seed'deki en uzun ad 13). Header'daki `max-w-28` kesmesi yine gerekli
      (genişlik harfe bağlı). Kullanıcı adı, e-posta gibi `NormalizedUserName` unique index'iyle tekil.
    - Fotoğrafsız coin görseli (`feat/coin-placeholder`): eski iç içe iki daire yerine eğik açıdan
      görülen, kenarı tırtıllı, yüzünde € olan bir coin (`shared/coin-placeholder`, inline SVG,
      `currentColor`). Kullanıcıyla birkaç turda çizildi: kenar çizgileri silindir etrafında eşit açıyla
      (15°, 9 çizgi; eşit x aralığı düz şerit gibi duruyordu), dış çizgi 12, € yayı 8 / yatay çizgiler 6
      (eşit kalınlıkta çizgiler arasını açmak gerekiyordu). `CoinThumb` ve ızgara kutusunda kullanılıyor.
    - Koleksiyon görseli ve kapak (`feat/collection-placeholder`, kullanıcı kararı): kapağı yüklenmemiş
      koleksiyonda artık **son coin fotoğrafı kullanılmıyor**, kartta varsayılan görsel çıkıyor
      (`shared/collection-placeholder`, kartta kapak alanı yüksekliğinin %80i kadar kare, masaüstü kartta ~142 px; 96 px küçük, tam yükseklik büyük geldi): üst üste iki coin + onlara 28° yaslanan üçüncü coin
      (kullanıcının fikri; Claude'un albüm / yığın / kutu taslaklarıyla karşılaştırıldı, Claude da bunu
      seçti: coin görseliyle aynı dil, küçük boyutta okunaklı). Her coin coin görselinin tamamının 0,577
      ölçekli hâli (çizgi oranları aynı kalsın diye); dik coin'in €'su yüzü gibi yatayda 0,46 daraltılmış,
      1,4 büyütülmüş, çizgileri 10 / 7,5. Yığının dik coin'in arkasında kalan kısmı maskeyle gizleniyor;
      maske kimliği her kopyada ayrı (`url(#…)` sayfadaki ilk eşleşen kimliği kullanır, önizlemede
      kopyalar birbirinin maskesini aldı). API: `CollectionResponse` / `PublicCollectionResponse`'tan
      `Cover` ve alt sorgusu kaldırıldı; client `coverUrl(collection, shareToken?)` sadece yüklenen kapak.
      Kapak seçicide "Otomatik" rozeti kalktı, `cover.hint` dört dilde güncellendi (`cover.auto` silindi).
    - Fotoğraf görüntüleyicide fare tekerleği (`feat/viewer-wheel`, kullanıcı isteği): aşağı kaydırma
      ulusal → ortak yüz, yukarı tersi, döngü yok (ok tuşları döngülü kalıyor). Bir kaydırma hamlesi tek
      değişiklik: `WheelGesture` (`shared/photo-viewer/wheel-gesture.ts`, testli) olaylar arasında
      300 ms boşluk olunca hamleyi bitmiş sayar, yön dönünce hemen yeni hamle. Kullanıcı tarayıcıda denedi.
    - Filtre ve sıralama (`feat/mobile-filters`, kullanıcıyla):
      - Telefonda (`sm` altı) filtreler katlanır: arama kutusu hep açık, altında `Filtrele ▾` butonu
        (varsayılan kapalı, gizli filtre sayısı rozette, durum URL'e yazılmaz) ve "Sırala". Kapsayıcı
        `sm` ve üstünde `display: contents`, tablet/masaüstü aynı. Alt panel (bottom sheet) tartışıldı,
        4-5 anında uygulanan filtre için fazla bulundu.
      - Sıralanabilir sütunlar sadece Başlık, Nominal, Ülke, Yıl (kullanıcı kararı): Darphane, Hatıra ve
        Adet sıralaması menüden, tablo başlığından ve API'den (`CoinSort`) kaldırıldı; sütunlar duruyor.
      - Yön metinleri kısa: `(1 cent → 2 €)`, `(eski → yeni)` (dile göre "1 Cent", "alt → neu" vb.;
        `ct` kısaltması tartışıldı, sadece Almancada yerleşik, sitede her yerde "cent" yazıyor).
      - "Sırala" kutusu her boyutta Filtrele butonuna benzer: solda ikon, etiket yok, varsayılan sırada
        gizli bir yer tutucu seçenekle "Sırala" yazar; sıralama seçiliyken listenin başında
        "Sıralamayı kaldır" (`sort.clear`, tablo başlığıyla aynı). "En yeni eklenen" seçeneği kaldırıldı
        (seçilince "Sırala"ya dönmesi kafa karıştırıyordu). Çerçeve ve ikon kapsayıcıda: Chrome açılan
        listeyi select'in sol boşluğu kadar içeriden başlatıyor; select'in arka planı şeffaf olmamalı
        (açılan listeyi onunla boyuyor, koyu temada beyaz kalıyordu).
    - Mobil menüde (hamburger) navigasyon linkleri ile Ayarlar / Çıkış arasında avatarın altındakiyle aynı
      ayırıcı çizgi (`feat/mobile-menu-divider`, kullanıcı isteği).
    - Koleksiyon sayfasında sahip aksiyonları (`feat/collection-action-icons`, kullanıcı isteği): "+ Coin
      ekle" telefonda ikinci satıra düşüyordu. Linki kopyala / Düzenle / Sil `md` altında ikon buton
      (zincir, kalem, çöp kutusu; `title` + `aria-label`), `md` ve üstünde ikon + metin. `sm` eşiği
      Almanca/Bulgarcada 640–767 px'te yine ikiye bölüyordu. Kopyalanınca ikon 2 sn yeşil onay, ekran
      okuyucuya `aria-live` ile "Kopyalandı". Sadece 320 px'te Almanca/Bulgarca iki satır. "⋯" menüsü
      ileriye bırakıldı (Sıradaki adım 2).
    - Telefonda tek satır sayfalama (`feat/compact-pagination`, kullanıcı isteği): `Pagination`'a
      `placement` (`top` / `bottom`). Üstte görünüm butonları + ‹ n / N › + sayfa başına; altta sadece
      « ‹ n / N › », ortada. Aralık metni telefonda gizli (başlıkta toplam var). 360 px altında üstteki
      iki satıra düşer ("Tümü" seçeneği kutuyu genişletiyor). "Sayfa başına" etiketi `md`'den itibaren
      (640–767 px'te Türkçe/Bulgarcada metinler kendi içinde bölünüyordu).
    - Coin tablosu sütunları (`feat/table-columns`, kullanıcıyla; koleksiyon ve Keşfet): Adet sütunu
      tablodan kalktı (veri, API ve form aynı; telefondaki kartlarda "N adet" rozeti duruyor). Sahip için
      "Düzenle" yerine kalem ikonu (48 px sütun). Sabit sütunlar dört dilde headless ölçülüp piksel olarak
      sabitlendi, dil değişince değişmiyor: Nominal 118, Ülke 116 (en uzun ad "Нидерландия"), Yıl 81,
      Darphane 91, Hatıra 94, Koleksiyoncu 176 (`@maximilian.schneider` gibi uzun 20 karakterlik ad;
      daha genişleri kesilir, ipucunda "@kullanıcı · koleksiyon"). Başlık sütunu 1280 px'te ~250 →
      ~380 px (sahip). Yeni dil eklenince yeniden ölçülecek (CLAUDE.md "Yeni dil eklerken").
    - **Genel görsel düzeltmeler sohbeti 2026-09-29'da bitti.** Sıradaki görünüm işi: logo çalışması.
15. **Klasör düzeni** (`chore/folder-layout`, 2026-09-29; yol haritası 2. adım, kullanıcı onayı):
    - `src/CoinPortal.Api` → `src/api`, `src/client` → `src/web` (saf `git mv` commit'i, 184 rename;
      proje, assembly ve namespace adları aynen). Angular proje adı `client` → `web` (çıktı
      `dist/web/browser`), `package.json` adı `coinportal-web`.
    - `dotnet-tools.json` → `.config/dotnet-tools.json`. `src/client/.vscode/` şablonu silindi (repo kökü
      açıkken kullanılmıyordu, `launch.json` Karma'ya işaret ediyordu); öneri kök `.vscode/extensions.json`'da.
    - `.gitignore`: `src/api/App_Data/`, yeni `src/api/wwwroot/` ve `sixlabors.lic`. Lokal `.notes/` klasörü
      `.git/info/exclude` ile dışlandı (ham analiz çıktıları).
    - Doğrulama: `dotnet build`, `dotnet ef migrations list`, `ng build`, `ng test` (47 test); eski yol
      referansı kalmadı (dondurulmuş değerlendirme dokümanı hariç).
16. **Bir kerelik biçimleme** (`chore/format`, 2026-09-29; yol haritası 3. adım, kullanıcı kararı):
    - Client'ın tamamı Prettier'dan geçti: 6 ts dosyası ve daha önce hiç biçimlenmemiş 7 html dosyası
      (`collection.html`, `header.html`, `coin-form.html`, `login.html`, `register.html`, `app.html`,
      `index.html`). CLAUDE.md'deki "harici şablonlarda Prettier çalıştırma" uyarısı kalktı.
    - Kök `.editorconfig` (client'taki kaldırıldı): LF, dosya sonu satır sonu, C# 4 boşluk, EF migration'ları
      ve `launchSettings.json` BOM'lu kalır. Dosya sonu satır sonu eksik 20 dosya (17 C#, 3 JSON) düzeltildi.
    - Doğrulama: production derlemesi önce/sonra karşılaştırıldı; tek fark, `{{ … }}` kendi satırına
      alınan yerlerde metnin başına/sonuna eklenen boşluk (blok öğeler ve `<option>`, görünmez).
      Headless Edge ile eski ve yeni derleme yan yana: 9 girişsiz sayfa × 375/768/1280 px × 4 dil +
      koyu tema, 135 karşılaştırmanın hepsi piksel piksel aynı. Girişli sayfalar (coin formu, kullanıcı
      menüsü) görsel olarak karşılaştırılmadı, derlenmiş koddaki farkları incelendi. `dotnet build`,
      `ng test` (47 test), `prettier --check` temiz.
17. **Yayın hazırlığı** (`chore/publish-prep`, 2026-09-29; yol haritası 4. adım, kullanıcı kararları):
    - `LICENSE`: MIT. README İngilizce: özellikler, teknoloji, klasör düzeni, kurulum, testler, ImageSharp
      lisans anahtarı notu, iç dokümanların Türkçe olduğu notu. "Docker gerekmez" yazıyor.
    - CLAUDE.md ve bu doküman public kalacak (kullanıcı kararı); işverene ve geliştirme makinesine özel
      satırlar (şirket politikası, şirket npm/NuGet feed'leri, makine yolu) nötr ifadelere çevrildi.
      Ayrıntılar lokal `.notes/environment.md`'de.
    - `index.html`: başlık "Client" → "Coin Portal", `meta description`. `theme-color` ve
      `apple-touch-icon` logo çalışması ve PWA manifest'iyle birlikte (ikon henüz yok).
18. **Sürüm araçları ve `v0.1.0`** (`chore/release-tooling`, 2026-09-29; yol haritası 5. adım, kullanıcı
    kararları: MinVer, git'in varsayılan merge mesajı):
    - Kök `Directory.Build.props`: MinVer 8.0.0, etiket öneki `v`, etiketsiz commit'lerde `preview.0`.
      `GET /api/health` artık `version` döner (ör. `0.1.0+<commit>`).
    - Client: `core/app-version.ts`, `ng build --define "APP_VERSION='X.Y.Z'"` ile gömülür; footer'da
      "© 2026 Coin Portal · v0.1.0" (headless Edge'de doğrulandı). Geliştirmede ve testte boş, görünmez.
    - `cliff.toml` + `CHANGELOG.md` (git-cliff 2.14, `npx`; Keep a Changelog; merge ve bakım commit'leri
      gizli grup, `breaking_always_bump_major = false`). İlk sürüm `v0.1.0` geriye dönük üretildi.
    - CLAUDE.md: "Sürüm ve yayın" bölümü, merge mesajı kuralı, "tek kimlik doğrulama şeması cookie"
      kararı. Merge'ler artık `git merge --no-ff --no-edit` (`Merge branch '…'`).
    - Not: yeni eklenen bir derleme paketi (MinVer) ilk derlemede etkisiz kalabiliyor; sürüm ikinci
      derlemede doğru geldi.
19. **CI** (`chore/ci`, 2026-09-29; yol haritası 6. adım, kullanıcı kararı: push'tan önce):
    - `.github/workflows/ci.yml`: `push main`, `pull_request`, elle tetikleme; ubuntu. API işi:
      `fetch-depth: 0` (MinVer), `global.json`'daki SDK, `dotnet tool restore`, Debug build,
      `dotnet ef migrations has-pending-model-changes` (sahte bağlantı dizesiyle, DB'ye bağlanmaz).
      Web işi: Node 22, npm önbelleği, `npm ci`, Prettier kontrolü, `ng build`, `ng test`.
    - `.github/dependabot.yml`: nuget (kök), npm (`src/web`), github-actions; haftalık, minor/patch ve
      Angular paketleri gruplu.
    - Lokal ön kontroller: 219 göreli import/şablon yolunda büyük/küçük harf uyuşmazlığı yok (Linux),
      aynı adlı farklı harfli dosya yok, EF kontrolü Production ortamında sahte bağlantıyla geçiyor.
      Workflow'un kendisi ilk push'ta GitHub'da doğrulanacak.
    - **İlk push (2026-09-29):** `main` ve `v0.1.0` gönderildi; `main` üzerindeki ilk CI koşusu başarılı
      (API ve Web). Dependabot hemen 8 PR açtı, hepsi major: action'lar (checkout 7, setup-node 7,
      setup-dotnet 6; CI'da geçti) ve Angular 22, Vitest 5, jsdom 30 (Angular core/common ve Vitest
      tek başına başarısız). Kullanıcı npm PR'larını (#4–#8) "ignore this major version" ile kapattı.
      Action sürümleri lokalde `chore/deps` ile alındı (PR #1–#3'ü Dependabot kapatır); Dependabot artık
      npm ve NuGet'te major önermiyor, Angular paketleri tek grupta.
    - Yayın izni kapandı (Açık konular 2): kişisel GitHub, public; CLAUDE.md "Push yok" kuralı "push
      kullanıcı onayıyla, sadece main ve etiketler" oldu.
20. **GitHub yayını** (2026-09-29/30; yol haritası 7. adım):
    - Repo: https://github.com/halid-ali/coin-portal (public, adı ürünle aynı `coin-portal`; lokal klasör
      `coin-web-portal` olarak kaldı, Claude Code hafızası klasör yoluna bağlı). Açıklama ve topic'ler
      (euro-coins, coin-collection, aspnet-core, angular, tailwindcss, dotnet), wiki kapalı.
    - Güvenlik (kullanıcı ayarladı): private vulnerability reporting, dependency graph, Dependabot
      alerts ve security updates, secret scanning ve push protection açık; CodeQL "Default setup"
      (2026-10-06, Tamamlananlar 79). Malware alerts ve grouped security updates Açık konular 19'da.
    - Rulesets: `main` (silme ve force-push yasak) ve `release-tags` (`v*`: silme, güncelleme,
      force-push yasak; yayınlanmış etiket taşınamaz). Bypass yok. PR ve zorunlu status check bilinçli
      olarak yok: lokal merge + doğrudan `main` push akışını engellerdi; CI yine her push'ta koşar.
    - Commit'lerdeki `Co-Authored-By: Claude` satırları kullanıcı kararıyla kaldı (geçmiş yeniden
      yazılmadı).
    - Release `v0.1.0` (2026-09-30): kısa giriş + öne çıkanlar + etiketteki CHANGELOG'a link; derleme
      eki yok (Release derlemesi ImageSharp anahtarı ister, hosting yok). Kullanıcı onayıyla Claude
      oluşturdu: Git Credential Manager'daki GitHub oturumu REST API için kullanıldı (anahtar
      gösterilmedi, kaydedilmedi); betik ve notlar lokal `.notes/` klasöründe.
21. **ImageSharp lisansı** (`chore/imagesharp-license`, 2026-09-30; yol haritası 10. adımın CI kısmı):
    - Six Labors ücretsiz **Community** lisansı verdi (License ID lokal `.notes/environment.md`'de; public
      dokümana yazılmaz), geçerlilik **2027-12-26**'ya kadar. Six Labors'un şartı: anahtar ya da `.lic` public repoya girmez;
      katkı verenler kendi anahtarlarını alır.
    - Lokal: `src/api/sixlabors.lic` (kullanıcı kaydetti; `.gitignore`'daki `sixlabors.lic` kuralı
      kapsıyor). E-posta "proje köküne koy" diyor ama paketin MSBuild hedefi `**/sixlabors.lic`'i
      `.csproj` klasöründen arıyor; repo kökündeki dosya bulunmaz.
    - Anahtar sadece derlemede kontrol edilir (`SixLabors_ValidateLicense`, `CoreCompile` öncesi);
      çalışan uygulama ve hosting sunucusu anahtara ihtiyaç duymaz, publish çıktısına `.lic` girmez.
    - CI: API işi `main` push'unda ve elle tetiklemede **Release**, pull request'lerde Debug derler
      (Dependabot ve fork PR'ları secret görmez). Anahtar GitHub secret `SIXLABORS_LICENSE_KEY` →
      ortam değişkeni `SixLaborsLicenseKey` (dosya içeriği). EF model kontrolü aynı konfigürasyonla.
    - Doğrulama (lokal, ayrı çıktı klasörüne): dosyayla Release derleme uyarısız; dosya devre dışıyken
      ortam değişkeniyle Release uyarısız; anahtarsız Release "license file not found" hatası veriyor.
    - Yenileme hatırlatması kullanıcının Google Takvim'inde ("Critical" takvimi, 2027-12-01; bir hafta
      önce e-posta).
22. **API testleri** (`chore/api-tests`, 2026-09-30; yol haritası 8a, kullanıcı onayı):
    - `tests/api/CoinPortal.Api.Tests.csproj`: xUnit v3 4.0.1 + `Microsoft.AspNetCore.Mvc.Testing`,
      `CoinPortal.slnx`'e eklendi. xUnit v3 4.x Microsoft Testing Platform ile çalışıyor; .NET 10'da VSTest
      yolu kapalı, bu yüzden `global.json`'a `"test": { "runner": "Microsoft.Testing.Platform" }`
      (VSTest paketleri yok). `public partial class Program` gerekmedi (.NET 10 üretiyor).
    - Altyapı (`Infrastructure/`): `CoinPortalFactory` (assembly fixture; ortam `Testing`, yani Secure
      cookie ve HTTPS yönlendirmesi production'daki gibi, istemci `https://localhost`), koşu başına
      `CoinPortal_Tests_<zaman>_<id>` veritabanı (migration'larla kurulur, sonunda silinir) ve geçici
      fotoğraf klasörü; `ApiClient` (cookie + `X-XSRF-TOKEN`, girişten/çıkıştan sonra token yenileme, SPA
      ile aynı akış); `TestUser` (rastgele kullanıcı, koleksiyon/coin kısayolları); `TestImages` (elle PNG
      kodlayıcı; test projesi ImageSharp'a referans vermez); `ResponseAssertions` (hata gövdesini gösteren
      durum kontrolü, `code` ve doğrulama anahtarları).
    - Veritabanı kararı (Claude'un teknik seçimi): gerçek SQL Server. SQLite elendi (kod collation'a,
      `CHARINDEX`'e, filtreli index'lere dayanıyor), Testcontainers elendi (makinede Docker yok).
    - 70 test, ~10 sn: auth (kayıtta dile göre ilk koleksiyon, 18+, e-posta/kullanıcı adı çakışması,
      kullanıcı adı kuralı, kullanıcı adı/e-postayla giriş, yanlış parola ile bilinmeyen kullanıcının aynı
      görünmesi, 5 hatada 423, çıkış, antiforgery'siz istek ve kullanıcıya bağlı token), koleksiyonlar
      (başkasınınki 404, Türkçe büyük/küçük harf çakışması, `last_collection`, `moveTo` ile taşıma/silme,
      `invalid_target`), coin'ler (başkasınınki 404, başkasının koleksiyonuna ekleme, taşıma, doğrulama,
      enum'ların JSON'da ad olması ve sayının reddi, filtre/arama/sayfalama, `countryOrder` sıralaması),
      görünürlük (Private/Unlisted/Public × `api/public/*`, kişisel veri sızmaması, link anahtarının
      yaşam döngüsü, Keşfet'te `pageSize=0`), fotoğraf ve kapak (üç boyut, değiştirince/silince dosyaların
      gitmesi, görünürlüğe göre erişim, `invalid_image`, `file_missing`, başkasının coin'i), ayarlar.
    - Mutasyon kontrolü: `CollectionAccess`'te link anahtarı şartı, coin sahiplik filtresi ve Türkçe ad
      karşılaştırması ayrı ayrı bozulunca ilgili testler kırıldı; kod geri alındı.
    - CI: API işine SQL Server 2022 servis container'ı ve `dotnet test --no-build` (sunucu
      `COINPORTAL_TEST_SQL` ile). Lokalde Debug ve Release, kökten `dotnet test` 70/70; CI'daki ilk koşu
      push'ta doğrulanacak.
    - CLAUDE.md: komutlar, "API testleri" kuralı (yeni uç ya da erişim kuralı testleriyle gelir), API
      çalışırken `dotnet test` ve yarıda kalan koşu tuzakları. README: klasör düzeni ve test komutu.
23. **Admin rolü** (`feat/admin-role`, 2026-09-30; yol haritası 12. adımın ilk branch'i, kararlar
    "Yönetici paneli: kararlar"):
    - API: `Authorization/` (`AppRoles`, `AuthPolicies`, `AdminOptions`, `AdminRoleSync`). Açılışta
      (`Program.cs`, ilk istekten önce; `--seed-dev-data` yolunda değil) rol yoksa oluşturulur,
      `Admin:UserIds`'teki kullanıcılara verilir, diğerlerinden alınır; bulunamayan Id uyarı logu.
      Policy `Admin` (`RequireRole`). `SecurityStampValidatorOptions.ValidationInterval` 30 dk → 1 dk:
      doğrulama cookie'deki rol claim'lerini veritabanından yeniden kurar, rol değişikliği oturum
      kapatmadan en geç bir dakikada yansır (ileride kilit için security stamp de).
    - `UserResponse.roles` (`login` ve `me`'de veritabanından, kayıtta boş); client `UserResponse.roles`,
      `ADMIN_ROLE`, `AuthService.isAdmin` (panel linki için; arayüz `feat/admin-ui`'de).
    - İlk admin ucu `GET api/admin/stats` (`Controllers/Admin/AdminStatsController`,
      `Contracts/Admin/`): kullanıcı sayısı, son 30 günde kayıt, koleksiyonlar (toplam, Public,
      Unlisted), coin, fotoğraf, depolanan bayt (fotoğraflar + kapaklar). Sadece sayılar, içerik yok.
    - `appsettings.json`'da boş `Admin:UserIds`; lokal admin `appsettings.Development.json`'da
      (`halid-ali`, kullanıcının seçimi).
    - Canlı kontrol (5090'da ayrı örnek, dev veritabanı): açılışta "Admin role granted to halid-ali",
      `AspNetUserRoles`'ta tek admin; seed kullanıcısıyla `me` → `roles: []`, `api/admin/stats` 403,
      girişsiz 401. Admin'in 200 alması testlerde doğrulandı (kullanıcının parolası bilinmiyor).
    - Testler (74): `me` rolleri, senkronun verme/alma ve bilinmeyen Id'yi atlaması, yeni cookie'de
      rolün geçerli olması, admin ucunda girişsiz 401 / kullanıcı 403 / admin 200, istatistikler.
      Test factory'si migration'ı artık host başlamadan uyguluyor (açılış kodu veritabanına eriştiği
      için). Mutasyon kontrolü: policy yerine düz `[Authorize]` ve senkronda rol almamak testleri kırdı.
    - Client: `ng build`, `ng test` (47), Prettier temiz.
24. **Giriş zamanları** (`feat/sign-in-times`, 2026-10-01; yol haritası 12. adımın ikinci branch'i, kararlar
    "Yönetici paneli: kararlar"):
    - API: `ApplicationUser.LastSignInAtUtc`, `PreviousSignInAtUtc`, `LastSeenAtUtc` (nullable;
      migration `AddUserSignInTimes`, sadece üç `AddColumn`; mevcut hesaplarda boş). Kayıt ve başarılı
      girişte tek `UPDATE` ile son giriş öncekine kayar, son giriş ve son görülme şimdi olur
      (`ExecuteUpdate`: sağ taraflar eski satırı okur; UserManager kullanılmadığı için Identity'nin
      concurrency stamp'i değişmez). `me` son görülmeyi en fazla saatte bir yazar
      (`ApplicationUser.LastSeenPrecision`). Başarısız giriş hiçbir şeyi değiştirmez.
    - `UserResponse.previousSignInAtUtc` (UTC, `Z` ile). Son giriş ve son görülme dışarı açılmıyor;
      admin uçları `feat/admin-api`'de.
    - Client: Ayarlar > Profil'de altıncı satır "Önceki giriş": aktif dilde uzun tarih + saat, cihazın
      saat diliminde; yoksa soluk renkte "Kayıtlı önceki giriş yok". Dört dilde iki anahtar
      (`settings.profile.previousSignIn`, `noPreviousSignIn`). İlk bileşen testi
      (`profile-settings.spec.ts`, `AuthService` taslağıyla).
    - Testler: API 79 (+5: kayıt ilk giriş, girişte kayma, başarısız girişte değişiklik yok, saatte bir
      son görülme, JSON'da UTC); test factory'sine `WithDbAsync` (API'nin açmadığı alanlar için doğrudan
      veritabanı). Mutasyon: kaymayı ve saat sınırını kaldırınca ilgili 3 test kırıldı. Client 49 test,
      `ng build`, Prettier temiz. Migration dev veritabanına uygulandı.
    - Görsel kontrol yapılmadı (giriş gerekiyor); bileşen testi metni ve tarih biçimini doğruluyor.
25. **Admin API'si** (`feat/admin-api`, 2026-10-01; yol haritası 12. adımın üçüncü branch'i, kararlar
    "Yönetici paneli: kararlar"):
    - Veri (migration `AddModeration`, iki nullable sütun + tablo): `ApplicationUser.LockedAtUtc`,
      `Collection.ModerationLockedAtUtc`, `AuditLog` (`AuditLogEntry`; FK yok, Id'lerin yanında
      adların o anki hali; işlem `AuditAction` int + check constraint, JSON'da ad).
    - Uçlar (`Controllers/Admin/`, hepsi `AdminControllerBase`'den: policy ve `Audit()` orada):
      `GET api/admin/users` (arama, durum filtresi Active/LockedOut/Locked, sıralama kayıt/ad/son
      görülme/disk, sayfalama), `GET api/admin/users/{id}`, `PUT|DELETE api/admin/users/{id}/lock`;
      `GET api/admin/collections` (Public, Unlisted ve gizlenmiş; arama ad/sahip, görünürlük, kilit,
      sıralama, Unlisted için link anahtarı), `PUT|DELETE api/admin/collections/{id}/lock`;
      `GET api/admin/audit` (işlem, kullanıcı, koleksiyon filtresi). Kilit istekleri isteğe bağlı
      `{ note }` gövdesi alır; tekrarlanan kilit no-op (ikinci kayıt yok). İstatistiklere aktif kullanıcı
      (30 gün), kilitli kullanıcı ve gizlenmiş koleksiyon sayıları eklendi.
    - Kilit: `LockedAtUtc` + `LockoutEnd` en büyük değer + security stamp (kayıt ve denetim satırı
      UserManager'ın tek `SaveChanges`'inde). Kilit açma geçici kilidi de kaldırır. Girişte admin kilidi
      423 + `account_locked`, geçici kilit kodsuz 423.
    - `CollectionAccess`: `CanView` sahibi kilitli koleksiyonu sadece sahibine gösterir; yeni
      `IsPublic` / `IsShared` PublicController'daki kopyaların yerine (kural tek yerde).
      `CollectionsController.Update`: kilitliyken görünürlük değişikliği 403 `moderation_locked`;
      `CollectionResponse.moderationLocked` (client modelinde de).
    - `Querying/Paging.ToPagedAsync` (sıralı sorgu, projeksiyon sayfadan sonra).
    - Testler: API 93 (+14: liste/arama/sıralama/sayfalama, detay ve 404, kilitle → oturum düşer + giriş
      `account_locked` + aç → tekrar giriş, kilitli kullanıcının paylaşılan içeriği ve fotoğrafı gizli
      ve geri geliyor, admin kilitlenemez, geçici kilidi açma, koleksiyon gizleme/kilit/link iptali/sahibin
      403'ü ve kilit kalkınca tekrar yayınlama, Private koleksiyon admin'e 404, denetim kaydı içeriği ve
      silinen koleksiyonun adının kalması, admin olmayan 403). Testlerde cookie doğrulama aralığı sıfır;
      bu yüzden girişli yanıtlar `no-cache` (cookie yenileniyor), fotoğraf önbellek testi girişsiz
      istemciye taşındı. Mutasyon: `CanView`'deki kilit şartı, sahibin 403'ü, kilitte security stamp,
      ortak tabandaki policy ayrı ayrı bozulunca ilgili testler kırıldı.
    - Canlı kontrol (5090, dev veritabanı, migration uygulandı): sağlık, koleksiyoncular, seed girişi,
      `moderationLocked`, admin uçları normal kullanıcıya 403. Client: `ng build`, 49 test, Prettier temiz.
26. **Yönetici paneli arayüzü** (`feat/admin-ui`, 2026-10-01; yol haritası 12. adımın dördüncü branch'i,
    kararlar "Yönetici paneli: kararlar"):
    - `/admin` (lazy, `adminGuard`: girişsiz → giriş, admin olmayan → ana sayfa): Genel bakış (11
      kart, ikonlu; kilitli/herkese açık/linkle/gizlenmiş kartları filtreli listeye gider), Kullanıcılar
      (arama, durum filtresi, sıralama, sayfalama; ad + e-posta tek hücrede), kullanıcı detayı (hesap,
      içerik sayıları, kilitle/aç, bu kullanıcıyla ilgili denetim kayıtları; geri linki listenin son
      halini navigation state ile taşır), Koleksiyonlar (görünürlük/gizlenmiş filtresi, ad yeni sekmede
      herkese açık ya da linkli sayfayı açar, Gizle/Kilidi kaldır, "Sahibi kilitli", sahibi admin ise
      rozet), Denetim kaydı (işlem filtresi; işlem, hedef ve not tek sütunda). Liste durumu URL'de,
      `AdminListBase` ortak. Kilitleme ve gizlemede not alanlı onay penceresi
      (`ConfirmDialogService.confirmWithNote`). Telefonda kartlar ve sıralama seçim kutusu.
    - Geniş sayfa: `page-container` + `--page-max-width` (64rem / 80rem), `PageWidthService`; header,
      main ve footer hizalı. Tablolar `xl`'de, sütunlar dört dilde headless ölçüldü (kullanıcı sütununa
      ~310 px): Kayıt 148, Son görülme 179, Durum 178, Coin 80, Disk 117; koleksiyon Durum 175, Coin 113,
      Son değişiklik 155, İşlem 130; denetim Zaman 175, Admin 171.
    - Avatar menüsünde ve mobil menüde en üstte "Yönetim" + ayırıcı (sadece admin).
    - Sahip tarafı: `VisibilityBadge` "Gizlendi" (kalkan ikonu, kırmızı), kartta ve koleksiyon
      başlığında; koleksiyon penceresinde görünürlük seçenekleri yerine açıklama;
      `collections.errors.moderation_locked`. Giriş: `account_locked` → "Hesabın yönetici tarafından
      kilitlendi."
    - Çeviriler: ana dosyalara 7 anahtar; panel scope'u `src/i18n/admin/{en,tr,de,bg}.json` (~130
      anahtar, lazy chunk), eşlik testi iki kümeyi de kapsar.
    - `SortHeader`: `firstDirection`, `clearable` (admin listelerinde yön çevirme).
    - API (bu branch'te): admin koleksiyon listesine `ownerIsAdmin` (+ test).
    - Düzeltilen: kartta rozet gölgesinin açık temada köşelerde dikdörtgen görünmesi (host
      `rounded-full`; eski hata, kullanıcı fark etti), panelde telefonda yatay taşma (grid öğesi
      `min-w-0`, Bulgarca uzun seçenekli select `max-w-full`).
    - Doğrulama: client 73 test (+ admin çeviri eşliği, biçimlendirme, sıralama yardımcıları,
      `adminGuard`, kullanıcı listesi bileşeni gerçek scope yüklemesiyle), API 94 test; headless Edge
      (5090'da `ayse.yilmaz` geçici admin, 4300'de ayrı `ng serve`): 4 dil × 5 sayfa × 320–1440 px
      yatay taşma yok, iki tema, telefon, onay penceresi, sahip penceresi, giriş mesajı, genel bakış
      ikonlarının altı tema rengi/tema kombinasyonunda aynı kaldığı ölçüldü. Kullanıcı canlıda baktı,
      geri bildirimleri (rozet köşesi, ikonlar, ikon renkleri, admin'in admin içeriği) uygulandı.
    - Dev veritabanında testlerden kalanlar: denetim kaydında "UI test" notlu girişler; `ayse.yilmaz`
      admin rolü (kullanıcının API'si yeniden başlayınca senkron geri alır).
27. **`v0.2.0`** (`chore/release-v0.2.0`, 2026-10-01): yönetici paneli (Tamamlananlar 23–26), API testleri
    (22) ve giriş zamanları (24). CHANGELOG git-cliff ile; şablonda iki sürüm bölümü birbirine yapışıyordu
    (bölüm sonunda boş satır yoktu, tek sürümde görünmüyordu), `cliff.toml` düzeltildi. Etiket merge
    commit'inde, GitHub Release açıldı (giriş, öne çıkanlar, CHANGELOG linki; notlar lokal `.notes/`).
28. **Hosting altyapısı** (`chore/hosting-infra`, 2026-10-01; yol haritası 9a). Kod `src/api/Hosting/`:
    - **Client'ı API sunar:** `SpaHosting`: `wwwroot`'ta `index.html` varsa statik dosyalar + client
      adreslerine (`/collections/5`, `/s/…`) `index.html` (fallback). `/api/…` altındaki bilinmeyen
      adresler her zaman 404 (client sayfası değil). Önbellek: adında hash olan dosyalar
      (`main-ABCD1234.js`) 1 yıl `immutable`, diğerleri (`index.html`, favicon) `no-cache` (yeni sürüm
      bir sonraki ziyarette gelir). Lokalde `wwwroot` yok, davranış eskisi gibi.
    - **Publish client'ı da derler:** `.csproj` hedefi `PublishWebClient`: `dotnet publish` `ng build
      --define APP_VERSION=<MinVer sürümü>` çalıştırır, çıktıyı paketin `wwwroot`'una koyar.
      `node_modules` yoksa `npm ci` (varsa dokunmaz: çalışan `ng serve`'ün altından silmesin).
      `-p:SkipWebClient=true` sadece API. `appsettings.Development.json` artık pakete girmiyor.
    - **Loglama: Serilog** (`Serilog.AspNetCore` 10, Apache-2.0). Seviyeler `Serilog` bölümünden
      (`Logging` bölümü kalktı), konsol + `Logs:Path` klasörüne günlük dosya (`coinportal-YYYYMMDD.log`,
      30 gün, dosya başına 100 MB). İstek başına bir satır (adres sorgusuyla; fallback'in yeniden yazdığı
      `/index.html` değil, istenen adres); başarılı fotoğraf/kapak GET'leri Debug (yazılmaz).
      Paylaşım anahtarı loglara girmez (`/s/***`, `shared/***`, `?s=***`; `AppLogging.MaskShareKeys`).
      Açılıştaki veritabanı hatası Critical olarak loglanır (IIS'te "500.30" durumunun tek izi).
      Hosting'de `Logs__Path` site klasörü dışı; loglar panelin dosya yöneticisi / FTP ile okunur.
    - **DataProtection:** anahtarlar `DataProtection:KeysPath`'e (varsayılan `App_Data/keys`), Windows'ta
      DPAPI ile şifreli (`Dpapi`: `CurrentUser` varsayılan, uygulama havuzu profil yüklemiyorsa
      `LocalMachine`); uygulama adı sabit (`CoinPortal`). Lokalde anahtar yeri değiştiği için API ilk
      yeniden başlatmada bir kez oturum düşürür.
    - **Rate limiter** (yerleşik, IP başına, IPv6'da /64; sabit 1 dk pencere, bellekte): `auth` 10
      (login + kayıt), `public` 120 (`PublicController`), `photos` 600 (fotoğraf ve kapak GET). Girişli
      kullanıcı `public`/`photos`'a takılmaz. Aşımda 429 + `Retry-After` + kod `rate_limited`, IP ile
      uyarı logu. Client: `httpErrorMessage` 429'u `errors.rateLimited` ile gösterir (4 dil).
    - Testler: API 109 (+15: login/kayıt sınırı ve kodu, girişsiz/girişli okuma sınırı, client
      adresleri `index.html` + `no-cache`, hash'li dosya `immutable`, `/api/…` 404, client derlemesi
      yokken 404, log maskeleme). İkinci host `factory.WithSettings(...)` (admin koleksiyonunda);
      ana test host'unda sınırlar çok yüksek. Client 74 test (+1).
    - Canlı kontrol: `dotnet publish -c Release` paketi Production ortamında 5090'da: fallback ve
      önbellek başlıkları, 11. login 429, log dosyası, maskelenmiş adresler, anahtar dosyası
      `DpapiXmlDecryptor`. Düz HTTP'de antiforgery 500 verdi (Production cookie'si HTTPS ister,
      beklenen; CLAUDE.md tuzaklarında).
29. **Büyük telefon fotoğrafları ve HEIC** (`fix/photo-upload-limits`, 2026-10-01; yol haritası 9b):
    - Seçilen dosyaya boyut sınırı yok: 10 MB sınırı (API) kırpılmış JPEG'e uygulanıyor, orijinale değil.
      Önceden 12–25 MB'lık 48–50 MP telefon fotoğrafları kırpma açılmadan reddediliyordu.
    - Tür: sadece resim olmayan dosyalar (`application/pdf` gibi) reddedilir; tarayıcının açabildiği her
      resim (WebP dahil) kırpılıp JPEG gider, karar cropper'da. Türü boş gelen dosyalar da denenir.
      Seçim penceresi yine JPG/PNG ister (`accept`): iOS HEIC'i bu yüzden JPEG'e çevirir, HEIC eklenmez.
    - HEIC/HEIF açılamazsa (Chrome, Android) kırpma penceresinde "Bu tarayıcı HEIC/HEIF … açamıyor, JPG
      olarak kaydedip tekrar dene" (`crop.heicFailed`, tür ya da uzantıdan, `isHeic`); Safari HEIC'i
      açabildiği için önceden reddedilmez. Diğer dosyalarda eski genel mesaj.
    - İpuçlarından "en fazla 10 MB" kalktı (`photo.fileHint`, `cover.hint`, 4 dil).
    - Testler: client 77 (+3: doğrulama, `isHeic`, kırpma penceresinin iki mesajı; HEIC koşulu bozulunca
      test kırıldı). Headless Edge (4200, `ayse.yilmaz`, kaydetmeden): 8000x6000, 26,4 MB JPEG kırpma
      penceresinde açıldı, sonuç 1600x1600, 687 KB JPEG; sahte `.HEIC` dosyasında HEIC mesajı.
      Gerçek telefonda denenmedi (lokal sunucuya telefondan erişim yok): hosting'den sonra Android ve
      iPhone'da bir kez denenecek (Açık konular 13).
30. **Kalıcı oturum varsayılan** (`feat/remember-me`, 2026-10-01; yol haritası 9c, kullanıcı kararı):
    login'de "Beni hatırla" varsayılan işaretli, kayıt kalıcı oturum açar (14 gün, kullandıkça uzar).
    Önceden ikisi de tarayıcı oturumu cookie'siydi; ana ekrana eklenen uygulama kapanınca giriş düşüyordu.
    Ortak bilgisayarda kullanıcı işareti kaldırır. API'de `LoginRequest.RememberMe` varsayılanı `false`
    kaldı (client her zaman gönderir). Testler: API 112 (+3: kayıt cookie'si kalıcı, login'de iki
    durum; kayıt testi `isPersistent: false`'a çevrilince kırıldı), client 78 (+1: kutu işaretli gelir
    ve istekte `rememberMe: true`).
31. **PWA manifest ve ikonlar** (`feat/pwa-manifest`, 2026-10-01; yol haritası 9d):
    - `public/manifest.webmanifest`: ad "Coin Portal", `standalone`, başlangıç `/`, zemin slate-50; ikonlar
      192/512 "any" (şeffaf, coin) ve "maskable" (amber-50 zemin, coin güvenli alanda).
    - İkonlar header logosundan (amber geçişli daire + "€"): `src/web/scripts/make-icons.mjs` headless
      Edge'de canvas'a çizer, `public/icons/*.png` ve `public/favicon.ico` (16/32/48 PNG içeren ICO)
      yazar; çıktı her çalıştırmada aynı. Logo değişince yeniden çalıştırılır. Eski favicon Angular
      CLI'nin varsayılanıydı (sekmede Angular logosu görünüyordu).
    - `index.html`: manifest, `apple-touch-icon` (180 px, opak zemin), `apple-mobile-web-app-title`,
      `theme-color` (header rengi: açık #ffffff, koyu #0f172a). Açılış betiği koyu temada rengi
      değiştirir, sonra `ThemeService` hesaptaki temaya göre günceller (tek etiket; `media`'lı iki
      etiket hesapta seçilen temayı izleyemezdi).
    - Service worker yok (11. adımda, HTTPS'ten sonra); Chrome/Edge manifest'le kurulum sunar. Mağaza
      ekran görüntüleri (`screenshots`) eklenmedi, kurulum penceresi sade.
    - Testler: client 79 (+1, `theme-color` temayla değişir), API 113 (+1, `.webmanifest`
      `application/manifest+json` ve `no-cache` ile sunulur; statik dosyalar bilinmeyen uzantıya 404
      verir). Headless Edge (4300'de ayrı `ng serve`): manifest Edge'in ayrıştırıcısında hatasız, tüm
      ikonlar yükleniyor ve doğru boyutta, `theme-color` açık/koyu doğru. Kurulabilirlik denetimi
      headless'ta çalışmıyor (`Page.getInstallabilityErrors`); kullanıcı kendi Edge'inde
      `localhost:4200`'de "Uygulamayı yükle" butonunu gördü.
    - Not: 4200'deki `ng serve` 2026-09-29'dan beri sahipsiz bir Git Bash sürecinden çalışıyor (onu
      başlatan terminal kapanmış); kullanıcı şimdilik bıraktı. Yeniden başlatmak gerekirse önce o
      süreç kapatılır (`Port 4200 is already in use`).
32. **Hesap silme ve veri dışa aktarma** (`feat/account-deletion`, 2026-10-01; yol haritası 9e, kararlar
    "Yönetici paneli: kararlar" ve "Hesap silme: kararlar"):
    - **Ayarlar > Hesap** (yeni bölüm, kalkan ikonu): "Verilerimi indir" düz link (`GET api/settings/export`,
      tarayıcının indirme yöneticisi; büyük dosya sayfa belleğine girmez) ve kırmızı çerçeveli "Hesabı
      sil" kartı. Admin'e buton yerine açıklama.
    - **Dışa aktarma** (`Accounts/AccountExport`): ZIP, geçici dosyada üretilir (`DeleteOnClose`):
      `account.json` (profil, tercihler, giriş zamanları; parola özeti ve damgalar yok),
      `collections.json` (koleksiyonlar ve tüm coin alanları, görsel yolları), `photos/{coinId}-{yüz}.webp`
      (en büyük boyut) ve `covers/{koleksiyonId}.webp`; ad `coinportal-<kullanıcı>-<tarih>.zip`. Rate
      limit kullanıcı başına (`export`: 10 dakikada 3), IP başına değil. JSON'lar UTF-8 ve okunur
      (`UnsafeRelaxedJsonEscaping`): varsayılan kodlayıcı ASCII dışını `ç` gibi yazıyordu
      (kullanıcı fark etti; dosya HTML'e gömülmediği için kaçışa gerek yok, test ham metni kontrol eder).
    - **Hesap silme** (`DELETE api/settings/account`, gövde `{ password }`): parola
      `CheckPasswordSignInAsync` ile (yanlışlar login gibi kilide sayılır; `auth` rate limit), kod
      `wrong_password` (400) / `admin_account` (403) / 423. Silme `Accounts/AccountDeletion`: tek
      transaction'da denetim kaydındaki adlar boşaltılır ve kullanıcı satırı silinir (koleksiyon, coin,
      fotoğraf satırları ve Identity tabloları veritabanı cascade'iyle), sonra fotoğraf klasörü
      (`DeleteOwnerAsync`), sonra çıkış. Diğer cihazlardaki oturumlar en geç 1 dakikada düşer.
      Pencere (`DeleteAccountDialog`) yanlış parolada açık kalır, önce indirmeyi önerir; başarıdan sonra
      ana sayfada bir kerelik "Hesabın ve tüm verilerin silindi" (navigation state, `alert-success`).
    - **Admin silmesi** (`DELETE api/admin/users/{id}`, not isteğe bağlı): aynı servis; admin'ler
      silinemez (`cannot_delete_admin`). Kullanıcı detayında "Kullanıcıyı sil" (ikincil, kırmızı yazı);
      onay penceresinde kullanıcı adı birebir yazılmadan buton açılmaz (`ConfirmDialog` `typeToConfirm`,
      yeniden kullanılabilir). Sonra kullanıcı listesine dönülür.
    - **Denetim kaydı:** yeni işlem `UserDeleted` (5); silinen kullanıcının adı hem hedef
      (`TargetUserName`, `TargetCollectionName`) hem admin olarak (`ActorUserName`, artık nullable) boşaltılır,
      kayıtlar ve Id'ler kalır; panel "Silinmiş kullanıcı" / "silinmiş koleksiyon" gösterir, link yok.
      `UserDeleted` kaydı adsız yazılır. Adminin serbest notuna dokunulmaz. Migration `AccountDeletion`
      (check constraint + nullable sütun).
    - Ayarlar'ın sekme satırı telefonda üç sekmeyle (Bulgarca) sayfayı 4 px taşırıyordu: `nav`'a `min-w-0`.
    - Testler: API 121 (+8: dışa aktarmanın içeriği ve başkasının verisinin olmaması, girişsiz 401, yanlış
      parola, silmenin veritabanı + dosya + oturum + paylaşılan koleksiyon etkisi ve başkasının verisine
      dokunmaması, admin silmesi ve anonimleştirme, admin/bilinmeyen kullanıcı, admin kendi hesabını
      silemez ama ayardan çıkınca siler ve admin olarak adı da silinir, dışa aktarma sınırı kullanıcı
      başına; anonimleştirme ve admin kontrolü bozulunca testler kırıldı). Client 85 (+6: yazarak onay,
      indirme linki, yanlış parola, silme → çıkış + bir kerelik mesaj, admin'e açıklama, denetim
      kaydında silinmiş adlar). jsdom için `shared/testing/dialogs.ts` (`stubModalDialogs`).
    - Canlı (5090 + 4300, headless Edge, geçici kullanıcılar): fotoğraflı kullanıcı indirdi (ZIP içeriği
      doğru), yanlış parola mesajı, silme → ana sayfa mesajı, `me` 401; `ayse.yilmaz` (geçici admin)
      başka bir geçici kullanıcıyı adını yazarak sildi, denetim kaydında "Kullanıcı silindi · Silinmiş
      kullanıcı · E2E denemesi"; 360 px'te Bulgarca/Almanca taşma yok. Dev veritabanında bu kayıt kaldı;
      `ayse.yilmaz` admin rolü kullanıcının API'si yeniden başlayınca senkronla geri alınır.
33. **Gizlilik politikası ve iletişim sayfası** (`feat/privacy-contact`, 2026-10-01; yol haritası 9f, kararlar
    "Gizlilik ve iletişim: kararlar"):
    - `/privacy` ve `/contact` (`pages/legal/`, girişsiz, lazy), footer'da "Gizlilik · İletişim" linkleri.
      Politika 10 bölüm, dört dilde (`privacy.*`; bölüm yapısı `privacy.ts` `SECTIONS`, metin çeviri
      dosyalarında): sorumlu, işlenen veriler, amaç ve hukuki dayanak (GDPR 6/1-b ve 6/1-f), kim görür,
      cookie'ler (sadece zorunlu üçü; onay yok) ve localStorage, barındırma, saklama süresi, haklar
      (Ayarlar > Hesap'a yönlendirir), yaş sınırı, değişiklikler; tarih `PRIVACY_UPDATED`.
    - İletişim: işleten, e-posta (`mailto`), GitHub reposu (kaynak kodu ve hata bildirimi). Form yok
      (site e-posta göndermiyor). İşletmeci adı ve e-posta `core/legal/operator.ts` `OPERATOR`'da, şimdilik
      boş: sayfalar "yayından önce eklenecek" gösterir (Yayın öncesi yapılacaklar).
    - Kayıt formunda zorunlu kutu "Bu sitenin gizlilik politikasını okudum." (link yeni sekmede);
      API'de `RegisterRequest.AcceptPrivacy` + `[MustBeTrue]` (`Validation/`), işaretsiz ya da hiç
      gönderilmeyen alan 400 `AcceptPrivacy`. Onay zamanı saklanmıyor (hukuki dayanak sözleşme;
      kutu bilgilendirmenin okunduğunu gösterir).
    - Testler: API 122 (+1: kutu false ve alan yok → 400), client 88 (+3: politikanın bütün bölümleri
      çevrili ve yer tutucu, iletişim linkleri, kayıt kutusu: etiket tek cümle, işaretsiz istek
      gitmiyor, işaretliyle `acceptPrivacy: true`). Headless Edge (4200, girişsiz): dört dilde üç sayfada
      taşma yok, başlıklar doğru, görünen çeviri anahtarı yok; iletişim kartında telefonda etiket ile
      değer birlikte (çift başına `div`).
34. **`v0.3.0`** (`chore/release-v0.3.0`, 2026-10-01): yol haritası 9. adım (Tamamlananlar 28–33).
    CHANGELOG git-cliff ile, etiket merge commit'inde, GitHub Release açıldı (giriş, öne çıkanlar,
    CHANGELOG linki; notlar lokal `.notes/release-v0.3.0.md`).
35. **Kapsamlı inceleme** (2026-10-02, kullanıcı isteği; commit `82ee6fe`, `v0.3.0` + 2): 16 inceleyici
    (kimlik doğrulama, erişim, fotoğraflar, veri modeli, hosting, client, çeviriler, testler, dokümanlar,
    gizlilik, erişilebilirlik, performans, bağımlılıklar, CLAUDE.md uyumu) repoyu salt okunur taradı;
    349 aday tekilleştirilip 258 bulgu oldu, düşük ve üstü olanlar koda karşı ayrıca doğrulandı. Sonuç:
    kritik ve yüksek yok; doğrulanmış 16 orta, 143 düşük, 10 bilgi; 2 çürütüldü, bilgi seviyesindeki 89
    bulgu oturum limiti yüzünden doğrulanmadı (eksik alan taraması da yapılmadı). Çıkan 25 iş GitHub
    issue'su oldu (#10–#34; etiketler `P0`–`P2`, milestone `v1.0.0`), sırası "Aksiyon planı"nda. Rapor ve
    issue metinleri lokal (`.notes/reviews/`, `.notes/issues/`; betik `.notes/scripts/create-issues.js`).
36. **Noktalı profil adresleri** (`fix/spa-fallback-dotted-paths`, 2026-10-02; #10): yayın paketinde
    `/u/ayse.yilmaz` doğrudan açılınca ya da yenilenince 404 veriyordu. Genel fallback (`MapFallbackToFile`)
    son parçası dosya adına benzeyen adresleri atlıyor; `/u/{**path}` için ayrı fallback eklendi, eksik
    dosyalar (`/chunk-….js`) yine 404. Lokalde görünmüyordu (`ng serve`). Aynı issue'nun test boşlukları:
    girişsiz görsel isteklerinde `photos` sınırı (429) ve istek logunda paylaşım anahtarının maskelenmesi
    (log dosyasına karşı, uçtan uca). Test sunucusu sorgu dizesini loga yazmadığı için `?s=` maskesi orada
    test edilemiyor (CLAUDE.md "API testleri"). Testler: API 127 (+5); düzeltme ve maske kapatılınca
    ilgili testler kırıldı.
37. **Giriş kilidinin ifşası** (`fix/login-lockout-disclosure`, 2026-10-02; #12): kilitli hesapta login,
    parola bilinmeden 423 dönüyor, hesabın varlığını ve kilidini (admin kilidinde `account_locked`)
    gösteriyordu; kilidi başlatan 5. hatalı deneme de 423'tü. Artık kilitli hesapta önce parola kontrol
    edilir (`CheckPasswordAsync`, hata sayılmaz): doğruysa 423, yanlışsa bilinmeyen kullanıcıyla aynı 401.
    Bilinmeyen kullanıcıda sabit bir sahte hash'e karşı parola doğrulanır, yanıt süresi e-postanın kayıtlı
    olup olmadığını ele vermez. Kilit kuralı (5 deneme / 10 dk) kullanıcı kararıyla aynen kaldı; kasıtlı
    kilitleme bilinen risk (Açık konular 16). Testler: API 128 (+1, iki testte yeni kontrol); eski
    controller'la 3 test kırıldı. Client değişmedi (423 mesajları aynı).
38. **Hesap silmede fotoğraf klasörü** (`fix/account-deletion-files`, 2026-10-02; #15): sunucu bir
    fotoğrafı gönderirken dosya Windows'ta silmeye kilitliydi; o anda hesap (ya da coin, fotoğraf)
    silinirse klasör diskte kalıyor, iz olarak sadece bir uyarı logu düşüyordu. Okuma artık
    `FileShare.Delete` ile açılıyor; silme iki kez daha denenir (200 ms, 1 sn), yine olmazsa yoluyla
    Error logu. Hata fırlatmaz (veritabanı satırları zaten gitmiştir). Yetim klasörlerin periyodik
    süpürmesi #27'de. Testler: API 129 (+1: fotoğraf okunurken hesap silinir, klasör kalmaz;
    `FileShare.Delete` kaldırılınca kırıldı). Linux'ta (CI) dosya kilidi olmadığı için test orada
    her durumda geçer.
39. **Moderasyon kilidinin kapsamı** (`fix/moderation-lock-scope`, 2026-10-02; #13): gizlenmiş bir
    koleksiyonun içeriği, coin'leri başka (herkese açık) bir koleksiyona taşıyarak ya da koleksiyonu
    `?moveTo=` ile silerek 1-2 istekte yeniden yayınlanabiliyordu; silme kilidi de yok ediyordu. Artık
    ikisi de 403 `moderation_locked`; coin'leriyle birlikte silmek ve coin'i yerinde düzenlemek serbest.
    Client: coin formunda koleksiyon seçimi kapalı + açıklama (`coinForm.moveLocked`), silme penceresinde
    taşıma seçeneği yok (`collectionDelete.lockedNoMove`). `cannot_lock_admin` / `cannot_delete_admin`
    400 yerine 403 ("görünen ama yasak işlem" kuralı). Panel: geçici kilitteki (5 hatalı giriş) kullanıcıya
    doğrudan "Kilitle" ve ayrıca "Geçici kilidi kaldır"; sahibi kilitli koleksiyonların ve kilitli
    kullanıcının profil linkleri düz metin (sayfa herkese 404). Testler: API 130 (+1; eski controller'larla
    kırıldı), client 88.
40. **Koleksiyon silme ve kayıtta veri bütünlüğü** (`fix/collection-delete-safety`, 2026-10-02; #16):
    silme penceresi sayfanın eski coin sayısıyla karar veriyordu; API taşıma hedefi verilmezse coin'leri
    fotoğraflarıyla siliyordu (başka sekmede eklenen coin'ler sessizce gidebilirdi). Artık coin'leriyle
    silmek açık seçim (`deleteCoins=true`), ikisi de yoksa ve koleksiyonda coin varsa 409 `has_coins`
    (dört dilde mesaj); pencere güncel listeyle açılır, liste yüklenemezse sayfada hata. "Son koleksiyon"
    ve taşıma hedefi kontrolleri kullanıcının koleksiyon satırlarını kilitleyen (`UPDLOCK, HOLDLOCK`)
    transaction'ın içinde: aynı anda iki silme kullanıcıyı koleksiyonsuz bırakamaz (testte kilit
    kaldırılınca her seferinde yakalandı). Kayıt: kullanıcı ve ilk koleksiyon tek transaction, cookie
    commit'ten sonra (araya hata sokan bir test yok). Testler: API 132 (+2), client 89 (+1).
41. **Güvenlik başlıkları** (`feat/security-headers`, 2026-10-02; #11): `Hosting/SecurityHeaders` her yanıta
    `nosniff`, `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'` (başka sitenin çerçevesine
    gömülemez), `Referrer-Policy: strict-origin-when-cross-origin` (dışarıya sadece origin; paylaşım
    anahtarı yolda), `Permissions-Policy` (kamera, mikrofon, konum, ödeme kapalı; dosya seçicideki
    kamera etkilenmez) ekler. Development dışında HSTS 30 gün (`Hsts:MaxAgeDays`; site oturunca 365),
    localhost hariç. `/api` altındaki JSON yanıtları `no-store` (önüne bir proxy/CDN konsa da kişisel veri
    önbelleğe girmez); görseller kendi `private, immutable` başlığını korur. HTTP→HTTPS yönlendirmesi
    test edildi (port verilince 307). Tam CSP ertelendi (Açık konular 17). Testler: API 135 (+3;
    middleware kapatılınca 2 test kırıldı). Tarayıcıda denenmedi.
42. **Kaynak tüketimi ve kötüye kullanım sınırları** (`fix/abuse-limits`, 2026-10-02; #14; değerler
    Claude'un varsayılanı, hepsi ayardan): girişli bir kullanıcı küçük ama 6000×6000'lik PNG'lerle istek
    başına yüzlerce MB bellek ayırtabiliyor, sınırsız koleksiyon/coin açabiliyordu. Artık kaynak görsel
    en fazla 4000 px (`MaxSourceDimension`, ~64 MB), aynı anda en fazla 2 görsel çözülür
    (`MaxConcurrentDecodes`, fazlası sırada bekler); girişli kullanıcının her yazma isteği kullanıcı başına
    dakikada 120 (`RateLimiting:Writes`, genel limiter); hesap başına 50 koleksiyon ve 10.000 coin
    (`UserLimits`, 400 `collection_limit` / `coin_limit`, dört dilde mesaj; metindeki sayılar
    varsayılanlar). `countries`, `health` ve `antiforgery` artık `public` sınırında; sayfa numarası en
    fazla 100.000 (büyük sayı ofseti taşırıp 500 veriyordu); Keşfet'in koleksiyoncu listesi ilk 1000; 429
    uyarı logu istemci + politika başına dakikada bir satır; log dosyası en fazla 20 MB (30 dosya).
    Client: kodlu 400 hatası alan hatası taşımıyorsa "istek reddedildi"ye düşüyordu; sınır kodları
    artık tanınıyor (genel düzeltme #26). Testler: API 138 (+4 ve bir sorgu durumu; genel limiter
    kapatılınca yazma testi kırıldı), client 90 (+1).
43. **Açılış öz-kontrolü ve dayanıklılık** (`feat/startup-self-check`, 2026-10-02; #19): yanlış bir hosting
    ayarı (yazılamayan fotoğraf/log/anahtar klasörü, DPAPI'nin çözemediği anahtarlar, sıfır bir sınır)
    ilk yüklemede 500 ya da her yeniden başlatmada oturum düşmesi olarak çıkıyordu. Artık açılışta
    `Hosting/StartupChecks` üç klasöre deneme yazması yapar, DataProtection'ı dener ve çözülen yolları loglar;
    hosting ayarları açılışta doğrulanır, hata uygulamayı başlatmaz (Critical log). Serilog'un kendi hataları
    standart hataya (`SelfLog`). EF `EnableRetryOnFailure(3)`: geçici SQL hataları yeniden denenir; üç
    transaction (kayıt, koleksiyon silme, hesap silme) yürütme stratejisinin içinde ve tekrar edilebilir.
    Yanıt sıkıştırması (Brotli/Gzip, HTTPS'te de): client paketi ve JSON. Testler: API 143 (+5: üç
    sıkıştırma, yazılamayan klasör ve geçersiz sınırla açılmama; açılış kontrolü kapatılınca kırıldı).
    Canlı (5090, dev veritabanı): açılışta üç klasör satırı, `/api/countries` Brotli + güvenlik başlıkları.
    Yeniden deneme yolu testle tetiklenmedi (geçici SQL hatası üretilemiyor).
44. **Panelde koleksiyon sayıları** (`fix/admin-collection-counts`, 2026-10-02; kullanıcı fark etti): Genel
    bakışta "Koleksiyonlar 16", Koleksiyonlar listesinde 5 görünüyordu. Hata değil: kart özel olanlar dahil
    hepsini sayıyor, liste sadece paylaşılanları ve gizlenenleri gösteriyor (admin gizli içerik görmez). Kart
    artık "Tüm koleksiyonlar · özel olanlar dahil", listenin sayısının yanında "11 özel koleksiyon
    listelenmez; panel özel içerik göstermez" (sayı istatistik ucundan, API değişmedi). Dört dilde. Testler:
    client 91 (+1, ilk `AdminCollections` bileşen testi). Tarayıcıda görsel kontrol yapılmadı.
45. **Gizlilik metni kodla eşit** (`chore/privacy-policy-sync`, 2026-10-02; #17): kod tarafı: istek logunda
    arama terimleri (`search=`, admin'in e-posta araması dahil) ve Keşfet filtresi (`owner=`) de maskeleniyor
    (`MaskLoggedAddress`, eski adı `MaskShareKeys`); log dosyaları gerçekten 30 gün (`retainedFileTimeLimit`;
    önce dosya sayısıydı); dev seed parolayı loga yazmıyor; herkese açık ve linkli coin yanıtlarında eklenme/
    değiştirilme zamanı yok (`PublicCoinResponse`; sahibinin ne zaman aktif olduğunu gösteriyordu, client
    kullanmıyordu); dışa aktarmaya koleksiyonların link anahtarı ve gizlenme zamanı, `moderation.json`
    (kullanıcıyı hedef alan yönetici işlemleri: zaman, işlem, gerekçe; admin adı yok). Metin (dört dil,
    `PRIVACY_UPDATED` 2026-10-02): log maskesi, toplu kullanım sayıları amacı (6/1-f), yöneticinin gördükleri
    tam liste, kayıtta da 14 günlük oturum ve çıkışta silinme, denetim kaydının silmeden sonra kalması ve
    gerekçe metninin değişmemesi, dışa aktarmanın kapsamı, düzeltme için e-posta. `OPERATOR` kullanıcı
    kararıyla boş (alan adı ve e-posta hosting'le belli olacak). Elle karşılanacak talepler Açık konular 18.
    Testler: API 147 (+4 log maskesi; dışa aktarma ve herkese açık yanıt testleri genişledi), client 91.
46. **Kullanım şartları** (`feat/terms-of-use`, 2026-10-02; #18, kullanıcı kararı: ekle, kayıtta kabul): `/terms`
    (`pages/legal/terms.ts`, metin `terms.*`, dört dil, `TERMS_UPDATED`): hizmet (ücretsiz hobi sitesi, garanti
    yok, dışa aktarma önerisi), hesap (18+, doğru bilgi, kişisel), içerik (kullanıcının; paylaşım sürdükçe
    gösterme izni, sadece hakkı olan fotoğraflar), yasak olanlar (yasa dışı, telif, başkasının kişisel
    verisi, hakaret/nefret/şiddet/cinsel, reklam/spam, siteyi zorlamak ve toplu veri çekmek), moderasyon
    (gizleme, kilit, silme; kayıt ve dışa aktarmada görünmesi), itiraz (e-posta), hesabın sona ermesi,
    değişiklikler. Footer'da "Gizlilik · Kullanım şartları · İletişim". Kayıt kutusu "Bu sitenin gizlilik
    politikasını okudum ve kullanım şartlarını kabul ediyorum." (iki link); API alanı `AcceptPrivacy` →
    `AcceptTerms` (iki belgeyi kapsıyor; client ve API birlikte yayınlanır). Metin hukuki danışmanlık
    değildir, kullanıcı yayından önce okuyacak (Yayın öncesi yapılacaklar). Testler: API 147, client 92 (+1
    şartlar sayfası; kayıt testi iki linki ve yeni cümleyi kontrol ediyor). Tarayıcıda görsel kontrol yok.
47. **Doküman eşitlemesi** (`chore/docs-sync`, 2026-10-02; #20): Yayın öncesi listesine ilk kurulum sırası
    (Production ortamı, önce migration, HTTPS), ilk admin ataması ve ilk açılışın log kontrolü; hosting
    kontrol listesine collation, WebSocket/SSE ve DPAPI için önce "Load User Profile" soruları.
    `appsettings.Production.json` `.gitignore`'da, CLAUDE.md'de "production ayarları repoya girmez" kuralı.
    ImageSharp License ID dokümandan lokal notlara taşındı (git geçmişinde duruyor; anahtar hiç girmedi).
    Eskimiş satırlar düzeltildi: "Yeni sohbete başlarken"deki API satırı, yol haritasındaki öneri/bekliyor
    ifadeleri, Açık konular 8 ve 9, kapsam listesi, Fotoğraflar kararlarındaki yükleme akışı ve sınırlar,
    Angular 22'nin Node ön koşulu, Impressum ile birlikte DSA notu, GitHub güvenlik ayarları (Açık konular 19).
    CLAUDE.md: doğrulamaya Prettier, rotalar (`/privacy`, `/terms`, `/contact`, `account`), core klasörleri,
    `Export` politikası, iki admin silme kodu, `dark:` istisnaları, "eskiyen satırlar da taranır" kuralı.
    README güncel özellikler, `npx ng`, lokal admin; yeni `SECURITY.md` (GitHub'ın özel bildirim formu).
    Kod: `SettingsContracts`'ta yanlış kayda düşmüş XML yorumu.
48. **Yayın zinciri ve `release.yml`** (`chore/release-workflow`, 2026-10-02; #21, yol haritası 10): etiket push
    edilince `.github/workflows/release.yml` paketi üretir: `coinportal-vX.Y.Z.zip` (`site/` = `dotnet publish`
    çıktısı, API + client; idempotent `migrate.sql`; `LICENSE`; `THIRD-PARTY-NOTICES.md`) ve `.sha256`; paketin
    etiketin sürümünü taşıdığını (DLL ve client) ve client'ın içinde olduğunu kontrol eder, etiketin
    Release'ine ekler, Release yoksa taslak açar (notlar elle; lokal `create-release.js` taslağı yayınlar).
    `workflow_dispatch` ile bir etiketin paketi yeniden üretilir. CI: action'lar commit SHA'sına sabit
    (yorumda sürüm), SQL Server `2022-CU27-ubuntu-22.04`, iş zaman aşımları, API test sonuçları TRX
    artefaktı, `main`'de yayın paketi denemesi; client araçları `npm exec --no --` ile (`npx` eksik paketi
    registry'den indirirdi; publish hedefi de böyle). Publish paketi Angular'ın `3rdpartylicenses.txt`'ini
    `wwwroot`'a koyar, İletişim sayfası linkler; link sadece production derlemesinde görünür (`isDevMode()`:
    `ng serve` dosyayı üretmiyor, kullanıcı "Cannot GET" gördü). Yeni `THIRD-PARTY-NOTICES.md`, README'de
    yayın ve lisans notu. git-cliff `2.14.2`'ye sabit. `package.json`: eskimiş `packageManager` (npm 10)
    kalktı, `engines.node >=22.19`. Lokal doğrulama: publish paketi (`wwwroot/index.html`,
    `3rdpartylicenses.txt`, sürüm kontrolleri), `migrate.sql` (12 migration, idempotent), TRX raporu.
    Workflow'un kendisi GitHub'da ilk etikette denenir; `ci.yml` değişikliği bu push'ta koşar.
49. **`v0.4.0`** (`chore/release-v0.4.0`, 2026-10-02): 2026-10-02 incelemesinin P0 işleri (Tamamlananlar
    36–48, #10–#21). CHANGELOG git-cliff 2.14.2 ile, etiket merge commit'inde. `release.yml`'in ilk gerçek
    koşusu bu etiketle: paket taslak Release'e eklendi, notlar (`.notes/release-v0.4.0.md`) lokal betikle
    yayınlandı. #17'nin gizlilik değişiklikleri `chore:` commit'i olduğu için CHANGELOG'da yok, notlarda var.
50. **Hosting ve ilk canlı kurulum** (2026-10-02, kod değişikliği yok): kullanıcının seçimi **MonsterASP.NET
    Premium Single** (AB firması, veri işleme sözleşmesi kullanım şartlarında; .NET 10, MSSQL, Let's
    Encrypt). Türkiye'deki bir sağlayıcı (Natro) elendi: işletmeci Almanya'da yaşadığı ve site AB'deki
    kullanıcılara açık olduğu için GDPR geçerli (Art. 3), AB dışında barındırma ek sözleşme (SCC) ve
    aktarım değerlendirmesi ister. Site: https://coinportal.runasp.net, `v0.4.0` yayın paketiyle.
    - Kurulum: veritabanı (MSSQL, collation `SQL_Latin1_General_CP1_CI_AS`) → paketteki `migrate.sql`
      panelin "Import SQL"i ile (başına `QUOTED_IDENTIFIER`) → `site/` içeriği ZIP olarak `\wwwroot`'a →
      sunucudaki `web.config`'e ortam değişkenleri (Production, connection string, `..\private\…`
      yolları, `DataProtection__Dpapi=LocalMachine`, `Admin__UserIds__0`, 512 MB bellek için
      `PhotoStorage__MaxConcurrentDecodes=1` ve `MaxSourceDimension=2000`) → HTTPS.
    - Karşılaşılanlar: şirket ağı dışarı 1433'ü kapatıyor (`sqlcmd` zaman aşımı; panelden import);
      havuz kullanıcı profili yüklemediği için DPAPI `CurrentUser` HTTP 500.30 verdi (`LocalMachine` ile
      çözüldü); HTTPS açılınca sertifika birkaç dakika sonra hazır oldu (arada şirket proxy'si hata
      sayfası gösterdi).
    - Doğrulama: `GET /api/health` `0.4.0+c17f03d`; `http://` → 307; HSTS 30 gün; Brotli; önünde CDN
      yok. Kullanıcı kayıt oldu, admin oldu; telefonla fotoğraf yükleme, paylaşım linkleri ve veri
      indirme (fotoğraflar dahil) sorunsuz.
    - Sonraki sürümler için "Yayın (deploy) adımları". Sunucu adları lokal `.notes/environment.md`'de,
      parolasız `web.config` şablonu `.notes/deploy/`'da; parola sadece sunucuda.
51. **Alan adı ve yeni ad: CoinVitrine** (`feat/coinvitrine-domain`, 2026-10-03; kullanıcı kararları):
    - **Ad:** "coin" kripto çağrıştırdığı ve "Euro" ileride daralttığı (Açık konular 10) için adaylar
      konuşuldu (coinshelf, numishelf, numiscase, obolino…; RDAP ile `.com`/`.app`/`.org`/`.net`
      kontrolü). Kullanıcı **coinvitrine.com**'u seçti ("vitrin" dört dilde aynı kelime); görünen yazım
      **CoinVitrine** (adresle birebir). Sadece görünen ad değişti, iç adlar `coinportal` kaldı
      (gerekçe ve liste CLAUDE.md'nin başında).
    - **Alan adı:** Cloudflare Registrar (maliyetine satış, yenileme aynı fiyat; INWX ve Porkbun
      alternatifti). DNS Cloudflare'de, kayıtlar "DNS only"; MonsterASP'a `coinvitrine.com` ve
      `www.coinvitrine.com` eklendi, ikisine de Let's Encrypt (`www`'nun sertifikası birkaç dakikada
      yerleşti). Panelin "HTTPS Redirect"i kapalı kalır (uygulama yapıyor).
    - **Ana adres `coinvitrine.com`:** yeni `Hosting/CanonicalHost` (`CanonicalHost:Host`) diğer host
      adlarını 308 ile oraya yönlendirir; sunucuda `web.config`'e `CanonicalHost__Host=coinvitrine.com`
      eklenince devreye girer. Eski adreste açık oturumlar yeni adrese geçmez (cookie host'a bağlı), bir
      kez yeniden giriş gerekir.
    - **Yasal:** `OPERATOR` = Halid Ali, `contact@coinvitrine.com` (yer tutucu metni `legal.notSet`
      kalktı). Gizlilik metni MonsterASP'ın şartları ve gizlilik politikasına göre: sağlayıcının adı ve
      yeri (MonsterASP.NET s.r.o., Prag; sunucular AB'de, Hetzner), Art. 28 sözleşmesi, sağlayıcının
      sunucu logları (IP, adres, tarayıcı; 6 ay), günlük yedekler (dosyalar, veritabanı, e-posta; 21 gün),
      iletişim e-postaları (yeni veri, amaç ve saklama: "talebi cevaplamak için gerektiği sürece"; sabit süre
      yerine ölçüt, kullanıcı kararı).
      `PRIVACY_UPDATED` ve `TERMS_UPDATED` 2026-10-03 (şartlarda sadece ad değişti).
    - **E-posta:** MonsterASP'ta `contact@coinvitrine.com` kutusu (sunucu `mail2248.mailasp.net`, AB;
      ayrıca alan adının `postmaster@` yönetici kutusu). Cloudflare'de MX (10), SPF
      `v=spf1 a mx include:spf.mailasp.net ~all`, DMARC `v=DMARC1; p=none`, `autodiscover` CNAME ve
      panelin ürettiği DKIM TXT'si (`uu8DF218F8F8D6440._domainkey`; destek talebi gerekmedi, panelde
      "Enable DKIM"). Test: Gmail'den gelen e-posta ulaştı, webmail'den cevap Gmail'de SPF, DKIM ve DMARC
      `PASS`. Kutu yönlendirmesiz (yönlendirme SPF'i bozar); webmail https://webmail.monsterasp.net/,
      gönderen adı "CoinVitrine" (kullanıcı 2026-10-04).
    - Dışa aktarma ZIP'i `coinvitrine-<kullanıcı>-<tarih>.zip`. README, CLAUDE.md güncellendi.
52. **`v1.0.0`** (`chore/release-v1.0.0`, 2026-10-03): ilk gerçek yayın. Yeni ad ve alan adı, tek adres
    yönlendirmesi, işletmeci ve iletişim adresi, MonsterASP'a göre gizlilik metni (Tamamlananlar 51);
    Impressum'suz devam kararı (Açık konular 14); kullanıcı gizlilik politikasını ve şartları okudu.
    git-cliff `v0.5.0` önerdi (1.0.0 öncesi feat → minor); kullanıcıyla planlandığı gibi `v1.0.0`
    (`--tag v1.0.0`). CHANGELOG git-cliff 2.14.2 ile, etiket merge commit'inde.
53. **Yayın pipeline'ı** (`feat/deploy-pipeline`, 2026-10-03; kullanıcı istedi: elle kurulum zahmetli):
    etiket push'u → `release.yml`: **Checks** (`ci.yml` `workflow_call` ile etiketin commit'inde) →
    **Package** (önceki gibi + canlı sürümden bu yana yeni migration özeti, varsa yedek uyarısı) →
    **Deploy** (`production` ortamı, kullanıcı onayı; Windows runner'da Web Deploy, `AppOffline`,
    `DoNotDeleteRule`, sunucudaki `web.config` atlanır) → canlı `/api/health` sürüm kontrolü.
    `workflow_dispatch` (etiket + `deploy`) yeniden kurulum ve eski sürüme dönüş için.
    - **Kararlar (kullanıcı):** onay adımı var (gerekçe: kurulum öncesi sunucu hazırlığı, migration öncesi
      yedek, zamanlama, yanlış etiket; birkaç sorunsuz sürümden sonra kaldırılabilir, tek ayar).
      Migration'ları **uygulama açılışta uygular** (`Hosting/StartupMigration`, `Database:MigrateOnStartup`;
      veritabanı parolası GitHub'a gitmez, dış erişim kapalı kalır). Elenen: GitHub'ın `migrate.sql`'i
      1433 üzerinden çalıştırması.
    - **Yedek:** MonsterASP'ta yedeği dışarıdan tetikleyecek API yok (sadece panel; günlük yedekler FTP'den
      indirilebilir ama repo public olduğu için GitHub'da saklanamaz: kişisel veri). Pipeline yeni
      migration'lı sürümde onaydan önce panelden yedek almayı özetinde ister.
    - Doğrulama: workflow'lar şema kontrolünden geçti (`@action-validator/cli`); migration tespiti lokalde
      canlı sürüme karşı denendi; `Startup_MigratesAnEmptyDatabase_OnlyWhenAskedTo` testi.
    - **İlk koşu** (2026-10-03, `v1.0.0`, Run workflow ile; etiket pipeline'dan önce push edilmişti):
      Checks ~1,5 dk, Package ~1,5 dk, onay e-postası geldi, kullanıcı onayladı; Deploy 24 sn (Web Deploy
      12 sn, `msdeploy` runner'da hazır, `choco` gerekmedi), canlı kontrol 5 sn. Sonra: health
      `1.0.0+21c3123`, `coinportal.runasp.net` ve `www.` 308 (yol ve sorgu korunur, HTTP'den tek adım),
      başlık ve manifest "CoinVitrine". Release notları (`.notes/release-v1.0.0.md`) kurulumdan sonra
      yayınlandı. Normal akışta deploy etiket push'uyla kendiliğinden başlar; `main` push'u deploy etmez.
    - **Hata ve düzeltme:** elle başlatılan koşu, notları henüz yayınlanmamış (taslak) `v1.0.0` Release'ini
      `gh release view` ile bulamadı (taslaklar etiketle bulunmuyor) ve ikinci bir taslak açtı. Release artık
      API listesinden, taslaklar dahil aranıyor; paketi olan Release'e dokunulmuyor (yayınlanmış bir paket
      yeniden build ile değişmesin). Fazla taslak silindi (iki paket aynı commit'ten, sadece zip zamanları
      farklı; yayınlanan Release ilk koşunun paketini taşıyor, canlıdaki ikinci koşunun aynı kaynaklı build'i).
54. **Arama ve sayfalama düzeltmeleri** (`fix/collection-search-paging`, #22, 2026-10-04; P1'in ilki):
    arama kutusu ↔ URL eşlemesi ortak yardımcıda (`shared/url-search.ts` `syncSearchWithUrl`), koleksiyon
    sayfası ve `AdminListBase` kullanıyor: yazılan terim önceki terimle değil URL'deki değerle karşılaştırılır
    ("Filtreleri temizle" ya da geri tuşundan sonra aynı terim yeniden arar), URL'den gelen değer kutuyu sadece
    kırpılmış metin farklıysa yazar (yazılırken sondaki boşluk silinmez, "2 euro" "2euro" olmaz). Arama
    kutularında `maxlength` 100 (API sınırı, `SEARCH_MAX_LENGTH`), URL'deki uzun değer de kesilir. Son
    sayfanın ötesindeki bir sayfa (son coin silinince ya da taşınınca, eski link) `replaceUrl` ile son sayfaya
    gider (koleksiyon sayfası ve admin listeleri, `leftPastLastPage`). "Filtreleri temizle" sayfa başına
    seçimini korur. Tekrarlanan query param'lar (`?search=a&search=b`) input transform `firstQueryParam`
    (`core/http/query-params.ts`) ile ilk değere iner (önceden admin listesi çöküyordu).
    - **Kullanıcı isteği (ek):** boş koleksiyonda arama/filtre kartı (sıralama satırıyla) gösterilmez
      (`showFilters`): tek koleksiyon modlarında başlıktaki `coinCount` 0 ise, Keşfet'te filtresiz sonuç
      boşsa. URL'de filtre varsa kart kalır (değiştirilebilsin). Kart, coin sayısı bilinince görünür.
    - Testler: `url-search.spec`, `query-params.spec`, yeni `collection.spec` (boş koleksiyon, son sayfa,
      temizle, tekrarlanan param), `admin-users.spec`'e son sayfa testi. Tarayıcıda görsel kontrol yapılmadı.
55. **Pencere kapanışı ve kaydedilmemiş değişiklikler** (`fix/dialog-close-and-unsaved`, #23, 2026-10-04):
    koleksiyon penceresi sonucu tek yerde (`onClose`) hesaplar: Esc ile kapanınca da kaydedilmiş sonuç
    (yeni paylaşım linki, kapağı başarısız yeni koleksiyon) bildirilir. İstek sürerken Esc koleksiyon,
    silme ve kırpma pencerelerinde çalışmaz. Onay penceresi: arka plan tıklaması basış da arka planda
    başladıysa kapatır (metin seçerken fare dışarıda bırakılınca kapanmaz; görüntüleyicide de), not ya da
    ad yazılan onaylar arka planla hiç kapanmaz; ad yazılan alana odak ve Enter ile onay; kapanınca eleman
    DOM'dan silinir (önceden body'de birikiyordu).
    - **Kararlar (kullanıcı):** coin formunda kaydedilmemiş değişiklik (yazılan alan, bekleyen fotoğraf)
      varken geri linki, menü ve tarayıcının geri tuşu sorar ("Kaydedilmemiş değişiklikler", "Kaydetmeden
      çık" / "Düzenlemeye devam et"); **Vazgeç sormaz** (bilinçli seçim); sekme kapatma/yenilemede
      tarayıcının kendi uyarısı. Koleksiyon penceresinde Esc sadece değişiklik varsa sorar.
    - Uygulama: `shared/unsaved-changes.ts` (`HasUnsavedChanges`, `unsavedChangesGuard`,
      `confirmDiscardChanges`, `DISCARD_CHANGES_STATE`); guard onay servisini dinamik import'la yükler (ilk
      paket büyümedi). Router `canceledNavigationResolution: 'computed'`: guard'ın iptal ettiği geri tuşu
      tarayıcı geçmişini bozmaz. Kayıt başarılıysa form `pristine` olur (kalan sadece başarısız fotoğraf/kapak).
    - Bilinen sınır: Chrome, kullanıcı etkileşimi olmadan art arda ikinci Esc'i engelletmez; o durumda pencere
      kapanır ama kaydedilmiş sonuç yine bildirilir.
    - Testler: `confirm-dialog.spec` (arka plan, Enter, odak, DOM temizliği), yeni `unsaved-changes.spec`,
      `collection-form-dialog.spec`; `pressEscape()` test yardımcısı. Tarayıcıda elle denenmedi.
56. **Hata mesajları, oturum ve ayar güncellemeleri** (`fix/client-auth-and-errors`, #26, 2026-10-04):
    - **Ayarlar:** `SettingsService.update` istekleri sıraya koyar; biri uçtayken yapılan değişiklik (tema,
      sonra renk; footer'dan dil) onun sonucuyla gider, birbirini ezmez. Başarısız olan sonrakileri durdurmaz.
    - **Hata eşleme:** `applyServerErrors` kodlu problemi her durumda önce eşler (koleksiyon kaydında 403
      `moderation_locked`, coin kaydında `coinForm.moveLocked`); kodlu ama bilinmeyen 400 "sayfayı yenile"
      demez. `httpErrorKey`: 403 `errors.forbidden`, 423 `errors.locked` (yeni metinler). Register ortak
      `applyServerErrors`'ı kullanır (Açık konular 9'daki madde kapandı).
    - **Oturum:** süresi dolmuş oturumda Çıkış 401 alırsa çıkış başarılı sayılır (giriş sayfasına gitmez).
      Antiforgery reddinde token yenilenip istek bir kez tekrar gönderilir (yeniden deneme XSRF başlığını
      kendisi yazar: Angular'ın XSRF interceptor'ı bizimkinden önce çalışıyor). Token ve hesap dili yükleme
      yan istekleri girişi/çıkışı/hesap silmeyi bozmaz. `guestGuard` girişliyken `returnUrl`'e gider
      (`core/auth/return-url.ts` `safeReturnUrl`, login de kullanır).
    - **Yükleme hataları:** koleksiyon başlığı ve profil sadece 404'te "bulunamadı" der, diğerlerinde gerçek
      sebep (429, ağ, sunucu); coin listesi 429/ağ hatasını söyler. Coin formunda koleksiyon listesi
      yüklenemezse "önce koleksiyon oluştur" yerine "Koleksiyonlar yüklenemedi". Admin kullanıcı detayı
      yeniden yüklemede hata bayraklarını sıfırlar.
    - **Küçükler:** dönüş adresi (`CollectionReturn`) sadece sahibin koleksiyon sayfasında hatırlanır (route
      data; input ilk yayında henüz bağlı değildi, Keşfet `/collections/null` bırakıyordu). Fotoğraf
      hatasında adres `/coins/:id/edit`. Link kopyalanamazsa "Kopyalanamadı" (telefonda ikon kırmızı,
      ekran okuyucuya duyuru), pencerede de. Footer'dan dil kaydedilemezse kısa bir hata satırı (6 sn).
    - Testler: yeni `auth.interceptor.spec`, `settings.service.spec`; `auth.guards.spec` (guestGuard),
      `problem-details.spec`, `collection.spec` (sunucu hatası, dönüş adresi). API'nin antiforgery reddi
      (`errors`/`code` yok) çalışan API'de doğrulandı. Tarayıcıda elle denenmedi.
57. **Form erişilebilirliği** (`feat/form-accessibility`, #24, 2026-10-04):
    - **Alanlar:** `appField` direktifi (`shared/field-a11y.ts`) alanı hata/ipucu metnine bağlar
      (`aria-describedby` = `<id>-error <id>-hint`), `aria-invalid` (hata gösterildiği an) ve
      `aria-required` (`Validators.required`'dan) verir. Kayıt, giriş, coin formu ve koleksiyon penceresi.
      Geçersiz gönderimde ve sunucunun alan hatalarından sonra odak ilk hatalı alana gider, ekran okuyucu
      alanı hatasıyla okur (`injectFocusFirstInvalid`, `shared/form-errors.ts`).
    - **Durumlar:** admin hata kutuları `role="alert"`, yükleme metinleri `role="status"`, yeniden yüklenen
      listeler `aria-busy`; admin listeleri ilk yüklemede "Yükleniyor…" gösterir; pencerede link kopyalama
      duyurulur.
    - **Başlıklar:** koleksiyon yüklenirken boş `<h1>` yok; "bulunamadı" durumlarında görsel olarak gizli
      `<h1>` (`coinList.notFoundTitle`, `profile.notFoundTitle`; metin kartta zaten yazıyor).
    - **Sayfa geçişi:** "İçeriğe atla" linki (sadece klavye odağında görünür, adrese `#main` eklemez); yol
      değişince sayfa başa kayar (önceden yeni sayfa eski kaydırma konumunda açılıyordu) ve odak `main`'e
      geçer. Sadece sorgu değişince (filtre, sayfa) ve ilk açılışta dokunulmaz; geri/ileri kaydırmayı korur.
    - Silme penceresinde `<select>` radyonun `<label>`'ından çıktı; vurgulama `has-[input:checked]`
      (seçili `<option>` da `:checked` sayıldığı için "taşı" kutusu hep vurgulu görünüyordu).
    - Testler: yeni `field-a11y.spec`, `register.spec` (odak), `app.spec` (odak, atla linki).
      Tarayıcıda ve ekran okuyucuyla elle denenmedi.
    - Kullanıcı isteği: "İçeriğe atla" linkine iç boşluk (`focus:not-sr-only` dolguyu sıfırlıyordu, dolgu
      `focus:` varyantıyla verildi).
58. **Klavye odağı ve kontrast** (`fix/a11y-keyboard-contrast`, #25, 2026-10-04):
    - **Odak rengi:** yeni token `--color-focus` (açık temada `accent-700`, koyuda `accent-400`); tüm odak
      halkaları ve tıklanan alanın kenarlığı bununla. Önce `brand-500` idi: Altın 2,2:1, Lime 2:1,
      Camgöbeği 2,4:1 (3:1 gerekli). Kullanıcı önce/sonra önizlemesini (giriş formu, headless Edge) gördü ve onayladı.
    - **Odak kaybı:** tema/renk radyoları ve dil seçici kayıt sırasında kilitlenmez (ayar istekleri #26'dan beri
      sırayla gidiyor); sayfalama butonları `aria-disabled` (son sayfada da odak kalır); admin koleksiyon
      işlemi tek buton (metni değişir), kullanıcı detayındaki işlemler `aria-disabled`, işlemden sonra odak ilk
      işlem butonuna. Butonlara `aria-disabled` görünümü (`styles.css`).
    - **Hesap menüsü:** butonun adı "Hesap menüsü: <kullanıcı adı>" (640–767 px'te adsızdı); yarım `role="menu"`
      yerine link paneli; Esc menüyü kapatıp odağı butona verir (mobil menü de). Menü öğelerinde odak halkası.
    - **Ekran okuyucu:** üst ve mobil menü linklerinde `aria-current="page"`; footer `contentinfo`, mobil menü `<nav>`.
    - **Dil seçici:** klavyeyle gezilen seçenekte odak halkası (fareyle sadece arka plan, görünüm aynı).
    - **Küçük kontrastlar:** placeholder `shade-500`, footer sürümü `shade-500`, fotoğraf/kapak boş-durum
      metni `shade-600`, sıralama ve açılır ok ikonları `shade-500`, `btn-danger` hover `red-700`.
    - **Ertelenen:** form alanı kenarlığı (`shade-300`, 1,5:1). `shade-400` önizlemesi kullanıcıya fazla koyu
      geldi, mevcut hali korundu; seçenekler ve karar [#35](https://github.com/halid-ali/coin-portal/issues/35)'te
      (Açık konular 21).
    - Testler: yeni `pagination.spec`, `header.spec`. Tarayıcıda elle denenmedi (önizlemeler hariç).
59. **`v1.1.0`** (`chore/release-v1.1.0`, 2026-10-04): P1'in ilk yarısı (Tamamlananlar 54–58) ve
    açılışta migration uygulama (Tamamlananlar 53; kod v1.0.0'dan sonra yazılmıştı, canlıya ilk kez bu
    sürümle gitti). Migration yok, sunucu hazırlığı yok. Pipeline'ın ilk etiket push'uyla normal koşusu:
    Checks ~2 dk, Package ~1 dk, onay, Deploy 23 sn; canlı `/api/health` `1.1.0+c64eae8`, `/login` 200,
    `coinportal.runasp.net` 308. Release notları `.notes/release-v1.1.0.md` (bu sefer kullanıcı yayınladı;
    sonraki sürümlerde Claude `.notes/scripts/create-release.js` ile yayınlar).
60. **Dependabot: http-cache-semantics** (`fix/http-cache-semantics`, 2026-10-04): GHSA-ch52-4w7c-c8xp
    (high, development; Angular CLI'ın paket indirme önbelleği, `pacote` → `make-fetch-happen`). 4.2.0 →
    4.3.0 sadece lock dosyasında (aralık `^4.1.1` izin veriyor, `overrides` yok); 4.3.0 bugün çıktı ve uyarının
    aralığı (≤ 4.2.0) dışında. `ng build`, `ng test` temiz. Kalan tek uyarı `piscina` (Açık konular 15).
61. **Fotoğraf depolamanın sağlamlığı** (`fix/photo-storage-robustness`, #27, 2026-10-04):
    - **Yetim süpürme** (`Photos/PhotoSweeper` + `PhotoSweepService`): açılıştan 1 dk sonra ve 24 saatte bir
      (`PhotoStorage:SweepIntervalHours`, 0 = kapalı). 1 saatten eski `.tmp` artıklarını ve veritabanında
      kaydı olmayan görsel klasörlerini siler (silinmiş hesapların klasörleri dahil, her biri Warning), kaydı
      olup dosyası olmayanları sayar. Güvenlik: görsellerin yarısından fazlası (ve 10'dan çoğu) kayıtsızsa
      hiçbir şey silmez, Error loglar (yanlış bağlantı dizesi ya da klasör). MonsterASP boşta kalan uygulamayı
      durdurabildiği için açılıştaki koşu da önemli.
    - **Yükleme hataları:** coin fotoğrafında kayıt hangi hatayla düşerse düşsün yeni dosya silinir; 409
      `conflict` sadece concurrency hatası ve unique ihlalinde, diğer veritabanı hataları 500.
    - **Kapak yarışı:** kapak yükleme ve silme koşullu `ExecuteUpdate` ("kapak hâlâ okuduğum kapaksa");
      kaybeden istek dosyasını silip 409 `conflict` döner (client zaten çeviriyor). Test eski kodda 3/3 düştü.
    - Lossless JPEG gibi çözülemeyen türler (`NotSupportedException`) 500 yerine 400 `invalid_image`
      (`TestImages.LosslessJpeg`, elle yazılmış SOF3 başlığı).
    - Eksik kapak dosyası artık Warning logu; dışa aktarma eksik dosyaları loglar ve `account.json`'da
      `missingImages` listeler. `v`'siz görsel isteği `private, no-cache` (önce 1 yıl `immutable`).
    - Kotanın yaklaşık olduğu CLAUDE.md'ye yazıldı (aynı anda yüklemeler birkaç görsel aşabilir; bilinçli).
    - **Admin paneli** (kullanıcı isteği, issue'da isteğe bağlıydı): Genel bakış'ta yeni "Disk" grubu: diskteki
      gerçek boyut, son temizlikte silinen, eksik dosya, "Son kontrol: … önce"; temizlik güvenlik nedeniyle
      durduysa uyarı. Kaynak son süpürmenin sonucu (bellekte, API yeniden başlayınca ilk koşuya kadar "Henüz
      kontrol edilmedi"); `GET api/admin/stats` → `diskCheck`. "Depolama" kutusuna "veritabanına göre" ipucu.
    - Testler: API 158 (+8: `PhotoSweepTests`, paralel yükleme, `v`'siz önbellek, lossless JPEG, dışa
      aktarmada eksik dosya, admin `diskCheck`), client 147. Panel tarayıcıda elle denenmedi.
62. **Çeviriler ve terimler** (`fix/i18n-wording`, #28, 2026-10-04; sadece client):
    - **API'nin İngilizce mesajı hiç gösterilmez:** `mapValidationProblem` messageKeys'te olmayan alan
      hatasına `validation.invalid`, alana bağlanmayana `errors.invalidRequest` yazar (önce API metni
      olduğu gibi çıkıyordu). messageKeys parametre de alır (`MessageKey`, ör. yaş).
    - **Kayıt formu:** doğum tarihi, şartlar, kullanıcı adı, ad/soyad, e-posta, parola (Identity kodları
      dahil) için kendi mesajları; parolaya 100 karakter sınırı, sadece boşluklu ad/soyad reddedilir
      (`notBlankValidator`). Yaş UTC tarihinden (`ageOn`, `latestBirthDate`): Türkiye'de 18. yaş gününün
      00:00–03:00'ünde form kabul edip API reddediyordu.
    - **Coin formu:** silinmiş koleksiyon, bilinmeyen ülke, yıl sınırı çevrildi; yıl ve adet tam sayı
      (`integerValidator`, `validation.integer`); en büyük yıl UTC'den (`maxCoinYear`). Koleksiyon adı
      sadece boşluksa "zorunlu".
    - **Metinler:** kullanıcı adı kuralı "İngilizce harfler" (TR/EN; DE "ohne Umlaute und ß"); TR coin'i,
      coin'lerini, ilk coin'ini ve net silme onayı; EN "username"/"email" her yerde, koleksiyon kilidi
      "Unlock collection"/"Collection unlocked", "Crop photo: …"/"Enlarge: …"; ana sayfa linki Keşfet'i
      anlatır ("Herkese açık koleksiyonları keşfet →", 4 dil); DE "Link zum Teilen", "Hellgrün"; BG
      butonlarda tekil emir, "евромонети", "заключвани", "Използвано място", "публични: N", "частни",
      "Настройки и часове", "Зелено" (genişlik ölçümü "Çok dilli destek: kararlar"da).
    - Gizlilik ve şartlarda sadece terimler değişti, `PRIVACY_UPDATED`/`TERMS_UPDATED` aynı kaldı.
    - Testler: client 151 (+4: UTC yaş, `notBlank`, `integer`, parametreli mesaj; API metninin
      gösterilmediği test güncellendi). Tarayıcıda elle denenmedi.
63. **API test boşlukları** (`chore/api-test-gaps`, #29, 2026-10-04; sadece testler, uygulama kodu değişmedi):
    - **Güvenlik:** üç cookie'nin `HttpOnly`/`Secure`/`SameSite` bayrakları; token'sız multipart PUT, DELETE,
      JSON PUT ve kapak DELETE → 400 (hiçbir şey değişmez); zayıf/101 karakter parola, bilinmeyen dil, yaş
      sınırı (UTC bugün tam 18 kabul, bir gün eksik ret, gelecek ve 120+); geçici kilitte kod yok; hesap
      silmede 5 yanlış parola → 423, hesap kalır; rol kaybı açık oturuma yeniden giriş olmadan yansır.
    - **`ApiConventionsTests`** (yeni): route'lar `api/` altında, `api/admin` uçları `AdminControllerBase`'den,
      girişsiz her uçta rate limit politikası, antiforgery'yi atlayan uç yok.
    - **Fotoğraflar:** `file_too_large`, `quota_exceeded` (kota 1 bayt, ikinci host), GIF → biçim hatası;
      EXIF yönü uygulanır ve çıktı WebP'de EXIF/XMP yok (elle yazılmış `eXIf` bölümlü PNG; temizleyen satır
      kapatılınca test düştü); kapak değiştirme/silme/ikinci silme, başkasının fotoğrafını/kapağını silme 404;
      `private` + 365 gün + `immutable` ve `ETag` → 304 (`s=`'li Unlisted adreste); başka bir Unlisted
      koleksiyonun anahtarı açmaz; kilitli kullanıcının kapağı görünmez; `GET api/countries`.
    - **Coin ve koleksiyon:** başkasının koleksiyonuna taşıma, alan anahtarlarıyla sınır testleri (başlık,
      boş başlık, darphane, açıklama, adet 0/1000; koleksiyon adı ve açıklaması), yıl ve hatıra filtreleri,
      başlık/nominal/yıl sıralamaları ikincil anahtarlarıyla, görünürlük verilmeyen güncelleme korur,
      `moveTo` ile silmede kapak dosyası gider, coin fotoğrafı kalır.
    - **Admin:** kullanıcı sıralamaları (kayıt, ad, son görülme, depolama; zamanlar `WithDbAsync` ile ayrık),
      sayfalama, durum filtresi, geçersiz sorgu 400; koleksiyonlarda ada göre arama, ad/coin sayısı sıralaması,
      `locked=false`, `OwnerLocked`; denetim kaydı sayfalaması; istatistikte kilitli/gizli sayısı önce/sonra farkı.
    - **Sağlamlaştırma:** yükleme ve durum yardımcıları birleşti (`TestUser.UploadPhotoAsync`/`UploadCoverAsync`,
      `ExpectStatusAsync`); dışa aktarma dosya adı `AccountExport.FileName` ile ayrıca test edilir.
    - **İki aralıklı hata bulundu ve düzeltildi** (testlerde): paralel `CreateClient` factory'nin istemci
      listesine null bırakıp koşunun sonunda tüm testleri "cleanup failure" yapıyordu (11 koşuda 1; artık kilitli
      `CoinPortalFactory.CreateHttpClient`); #27'deki süpürme testi paralel bir süpürmenin `LastResult`'ı
      değiştirmesine açıktı. Düzeltmeden sonra 8 tam koşu temiz.
    - Testler: API 222 (önce 158).
64. **Client birim testleri** (`chore/client-unit-tests`, #30, 2026-10-04):
    - **Testlerin bulduğu hata (düzeltildi, ayrı commit):** kırpma, koleksiyon silme ve hesap silme
      pencerelerinde Esc pencereyi **hiç kapatmıyordu**. `(cancel)="busy() && $event.preventDefault()"` boştayken
      `false` döner; Angular `false` döndüren şablon işleyicisinde olayın varsayılanını engeller. Artık metot
      (`onCancel`), sadece meşgulken engeller; üç pencerenin Esc testleri var, CLAUDE.md kuralı ve "Bilinen
      tuzaklar" düzeltildi. Tarayıcıda elle denenmedi (aynı olay yolu testte).
    - **Çekirdek:** `AuthService` (önce `me`, sonra kullanıcıya bağlı token; girişte hesabın dil/tema/rengi;
      token alınamasa da giriş; 401'li çıkış; süresi dolan oturum bir kez), tema/renk/dil tercihi (girişsiz
      istek yok, diğer ayarlar korunur, kayıt başarısızsa geri döner; dil kayıttan sonra değişir), sayfa başlığı
      (dil değişimi, sayfanın kendi başlığı korunur), ülke sıralaması (tr Almanya < Avusturya, en tersi),
      `safeReturnUrl`.
    - **Formlar:** giriş sayfası (401, admin kilidi, geçici kilit, 400, 429, ağ; parola temizlenir; dönüş adresi
      sadece site içi), kayıt formunda sunucu hataları alanlarına ve Türkçe, hata eşleme tablosu (özellik adı,
      `$.alan`, form kodu, `Password` öneki), doğrulayıcılar (parola gücü, kullanıcı adı kalıbı).
    - **Paylaşılan:** dil seçici (klavye: oklar, Home/End, Enter/Space, Esc, odak), sıralama başlığı (`aria-sort`,
      ipucu), fotoğraf görüntüleyici (oklar döngülü, tekerlek uçta durur, paylaşım anahtarı), sayfalama aralığı
      ve sayfa boyutu, kırpma penceresi `stubModalDialogs`'a geçti (kullan, Vazgeç, Esc).
    - **Sayfalar:** koleksiyon silme penceresi (ad birebir, varsayılan taşıma, Esc), admin kullanıcı detayı
      (kilitle/kilidi aç/sil, iptal, hata; işlemden sonra odak ilk butona). Koleksiyon sayfasının URL
      yardımcıları `collection-url.ts`'e, sıralama okuma `coin-sort.ts` `parseSort`'a taşındı (davranış aynı,
      iki kopya birleşti).
    - Not: `/\evil.example` gibi ters çizgili bir dönüş adresi `safeReturnUrl`'den geçer, ama iki kullanım yeri de
      Angular router (`navigateByUrl`/`parseUrl`), adresi uygulama içi yol olarak işler: açık yönlendirme değil.
    - Testler: client 251 (önce 151), 3 koşu temiz.
65. **`v1.2.0`** (`chore/release-v1.2.0`, 2026-10-04): P1'in ikinci yarısı (Tamamlananlar 61–64) ve
    http-cache-semantics (Tamamlananlar 60). Migration yok, sunucu hazırlığı yok. Pipeline: Checks ~2 dk,
    Package ~1 dk, kullanıcı onayı, Deploy 24 sn; canlı `/api/health` `1.2.0+31d2b08`, `/login` 200,
    `coinportal.runasp.net` 308. Release notları `.notes/release-v1.2.0.md`, kullanıcı onayıyla Claude
    `.notes/scripts/create-release.js` ile yayınladı ("latest").
66. **Girişsiz sayfaların ağırlığı** (`fix/public-page-weight`, #33, 2026-10-04):
    - **Kırpma kodu:** koleksiyon sayfasının düzenleme ve silme pencereleri `@if (!readOnly())` + `@defer (when …;
      prefetch on idle)` içinde. Form penceresi kapak seçici üzerinden ngx-image-cropper'ı (~49 KB) getiriyordu;
      artık Keşfet, `/u` ve `/s` sayfalarında inmiyor (derleme çıktısında sayfa chunk'ı pencereyi sadece
      `import()` ile yüklüyor). Sahip modunda boşta önceden iner, pencere yine anında açılır.
      `prefetch when !readOnly()` Angular uyarısı (NG8021) verdiği için `@if` + `on idle` seçildi.
    - **Çift liste isteği:** `Newest` dışı sıralamada liste ülke listesini (`CountryService.settled`) bekliyor;
      soğuk açılışta tek istek gider. Ülke listesi alınamazsa sıralama sırasız (ISO kodu) yapılır, sayfa takılmaz.
    - **Kapak görseli:** başlıktaki kapak `loading="lazy"`; telefonda gizli olduğu için hiç inmiyor.
    - **Keşfet sorgusu:** `Include(Owner/Collection)` yerine SQL projeksiyonu (`ExploreCoinResponse.Projection`,
      `CoinListing.ToPagedAsync`'in `Expression` alan aşırı yüklemesi); kullanıcı satırının tamamı (parola özeti,
      e-posta) artık okunmuyor. Yanıt aynı.
    - **`Intl` önbelleği:** `core/i18n/intl-cache.ts` `cachedIntl(anahtar, oluştur)`; `plural` ve admin
      biçimlendiricileri (`formatNumber` yeni, admin sayfalarındaki üç `new Intl.NumberFormat` ona geçti).
    - **Bilinçli olarak yapılmadı:** tablo ve kartı `@if` ile tek render etmek (issue'da "gerekirse"): 10–50
      satırda fark yok, gizli kopyadaki küçük resimler zaten inmiyor; "Tümü" ile çok büyük koleksiyonlarda
      yeniden bakılır.
    - Testler: API 223 (Keşfet'te koleksiyon adı, sahip, yüz sırasıyla fotoğraflar), client 253 (sıralı liste
      ülkeleri bekler ve tek istek atar, ülke hatasında sırasız yüklenir, `settled`).
67. **UX düzeltmeleri** (`fix/ux-polish`, #32, 2026-10-04; sadece client; kararlar kullanıcıyla):
    - **404 sayfası:** `'**'` artık ana sayfaya yönlenmiyor; `pages/not-found` (başlık `titles.notFound`,
      metin `notFound.*` dört dilde: adres yok, link eksik kopyalanmış olabilir; "Ana sayfaya dön" + "Keşfet'e
      git"). Adres URL'de kalır. Sunucu bu adreslere SPA fallback ile 200 verdiği için sayfa açıkken
      `<meta name="robots" content="noindex">` ekler, çıkınca kaldırır.
    - **Açılış:** `me` ve antiforgery aynı anda (ikisi aynı cookie'yle gider, token `me`'nin döndüğü kullanıcıya
      ait; reddedilen cookie ikisinde de anonim). Cihazın dil dosyası oturum beklenirken iner
      (`LanguageService.preload`). `index.html`'de `<app-root>` içinde açılış ekranı (kullanıcı seçimi: ortada
      logo): `.app-splash` (`styles.css`), 400 ms sonra belirir (hızlı açılışta görünmez), logo hafifçe atar
      (`prefers-reduced-motion`'da atmaz), zemin ve yazı tema token'larıyla. Angular açılınca yerini alır.
    - **"Verilerimi indir":** `ExportDownload` directive'i (`pages/settings/export-download.ts`, Ayarlar > Hesap
      ve hesap silme penceresi). Tıklamada önce `GET api/settings` (oturum kontrolü): 401 interceptor'dan geçer
      (oturum kapanır, giriş sayfası + `returnUrl`), başka hata linkin altında `role="alert"`; sonra ayrı bir
      `<a download>` ile düz indirme (dosya yine sayfa belleğine girmez). Ctrl/orta tık tarayıcıda kalır.
      Sınır aşımı (429) ve sunucu hatası yine tarayıcının indirme çubuğunda (kullanıcı kararı: iki adımlı
      indirme gerekmez).
    - **Admin listeleri:** üstte de sayfalama (coin listesi gibi); telefonda sayfa boyutu üsttekinde.
    - **Yıkıcı butonlar:** ortak `btn-secondary-danger` (kırmızı yazı, üstüne gelince açık kırmızı zemin);
      kırmızı dolgu (`btn-danger`) sadece onay penceresinin butonunda. Admin kullanıcı sayfasındaki "Kilitle"
      ve Ayarlar'daki "Hesabımı sil" dolgudan bu stile geçti; diğer altı yer birleşti.
    - **Onay kutuları:** `form-checkbox` (`accent-brand-500`); giriş ve kayıttaki kutular tarayıcı mavisi yerine
      tema renginde.
    - Görsel kontrol (headless Edge): açılış ekranı açık/koyu, 404 masaüstü, giriş sayfası telefonda, koleksiyon
      ve Ayarlar > Hesap butonları. Admin sayfaları görülemedi (admin hesabı gerekir), kullanıcı bakar.
    - Testler: client 259 (404: adres korunur, başlık, `noindex` girer/çıkar; dışa aktarma: önce oturum,
      sonra indirme, 401'de giriş, hata mesajı; `preload`; açılışta iki istek birlikte).
68. **Erişilebilirlik taraması** (`chore/a11y-sweep`, #31, 2026-10-04; sadece client, görünüm aynı):
    - **Tablolar:** dört tabloda `sr-only` caption (koleksiyon adı / "Keşfet" / admin bölüm adı); `aria-sort`
      sadece sıralı sütunda (önce her sütunda `none`); kısaltılmış başlıklar ("Commem.", "Год.", "Münzz.")
      ekran okuyucuda tam ad (`SortHeader.fullLabel`, Darphane/Hatıra sütunlarında `sr-only`).
    - **Sayfalama:** "2 / 3" yerine okunan metin "Sayfa 2, toplam 3" (`pagination.pageOf`); düz metindeki
      `aria-current` kaldırıldı.
    - **Semboller:** `coinList.addCoin`, `collections.new` ve `home.browseCollectors` metinlerinden `+`/`→`
      çıktı, şablonda `aria-hidden`; geri linklerindeki `‹` ve kaydedildi `✓`'leri `aria-hidden`; boş hücrenin
      `–`'i ekran okuyucuda "Yok" (`common.none`).
    - **Yeni sekme:** kayıttaki gizlilik/şartlar linklerine `rel="noopener"`; o linkler, İletişim'deki kaynak ve
      lisans linkleri ve admin koleksiyon linki ekran okuyucuya "yeni sekmede açılır" der (`common.opensNewTab`).
    - **Tooltip:** ızgarada tam başlık kaplama butonunun/linkin `title`'ında (önce `<p>`'deydi, kaplama yüzünden
      hiç çıkmıyordu); Keşfet tablosunda koleksiyon adı ekran okuyucuya linkin içinde.
    - **Kırpma:** çerçevenin erişilebilir adı klavye kullanımını da söyler (`crop.frameLabel`: oklar taşır,
      Shift + oklar boyutlandırır), görselin alt metni pencere başlığı.
    - **Hareket:** sayfa değişiminde kaydırma `prefers-reduced-motion`'da anında (`shared/motion.ts`); ızgara ve
      koleksiyon kartlarındaki büyütme `motion-safe:`.
    - **Admin:** koleksiyon satırındaki Gizle/Kilidi kaldır butonunun adı koleksiyonu içerir ("Gizle: <ad>").
    - **Yapılmadı (bilinçli):** geri linklerinin konum/biçim birliği (görünüm kararı, ayrı iş); görünürlük
      rozetinin açıklaması ve admin'deki tam zaman damgası `title`'da kaldı (açıklama koleksiyon formunda,
      tam zaman kullanıcı detayında görünür); orta nokta `·` ayraçlar; Genel bakış'taki `–`. Klavyeyle görseli
      kaydırma (yakınlaştırınca) kütüphanede yok. Otomatik a11y taraması (`@axe-core/playwright`) #34'te.
    - Görsel kontrol (headless Edge): ana sayfa, koleksiyon tablosu (koyu), koyu temada koleksiyon formu ve silme
      penceresi; görünüm değişmedi.
    - CLAUDE.md "Client kuralları"na "Ekran okuyucu ve hareket" kuralı eklendi.
    - Testler: client 261 (sıralama başlığının tam adı, sayfa metni, kayıt linklerinin yeni sekme bilgisi).
69. **E2E testleri** (`feat/e2e-playwright`, #34, yol haritası 8b, 2026-10-04; kararlar kullanıcıyla):
    - **`tests/e2e`** ayrı npm paketi (`@playwright/test` 1.63, `@axe-core/playwright` 4.13). `server/start.mjs`
      client'ı ve API'yi `.build/`'e derler, API'yi 5091'de `CoinPortal_E2E` veritabanıyla ve client'ı
      `--webroot`'tan sunarak başlatır (canlıdaki gibi tek site); dev API, `ng serve` ve dev veritabanı
      etkilenmez. Admin için önce 5191'de `e2e-admin` açılır, Id'si ayarla verilip API yeniden başlar.
    - **Akışlar (7 test):** kayıt → yeni koleksiyon → coin + fotoğraf (dosya seçici, kırpma, Kaydet'te yükleme)
      → tablo, ızgara/liste, sıralama ve filtre URL'de; Unlisted link girişsiz → link yenileme → eski link
      "bulunamadı", yenisi açılır; 404 sayfası; "Beni hatırla" (14 günlük cookie / oturum cookie'si); düşen
      oturum → giriş → `returnUrl` ile geri; admin kilidi (paylaşılan koleksiyon gizlenir, giriş "kilitlendi"
      der); admin koleksiyon gizleme (ziyaretçide 404, sahipte "Hidden" rozeti). Açık oturumun bir dakika
      içinde düşmesi API testlerinde (orada cookie her istekte doğrulanır); e2e'de beklemek bir dakika sürerdi.
    - **axe taraması** her sayfada (kayıt, giriş, coin formu, kırpma, koleksiyon, paylaşılan koleksiyon,
      düzenleme penceresi, 404, admin kullanıcı ve koleksiyonlar): ciddi/kritik bulgu testi kırar (kullanıcı
      kararı), azı rapora eklenir. **Bulduğu iki gerçek sorun düzeltildi:** kırpma çerçevesinin
      `aria-label`'ı rolsüz `div`'de geçersizdi (#31'de eklenmişti; kırpıcı çizildikten sonra `role="group"`
      verilir), 404 sayfasındaki dekoratif "404" yazısının kontrastı 1.48'di (`shade-300` → `shade-500`).
      Pencere açılış animasyonu sürerken ölçülen kontrast yanlış çıkıyordu; tarama animasyonları bekler.
    - **CI:** `ci.yml`'de ayrı "E2E" işi (paralel; Chromium kurulumu, kendi SQL Server container'ı, hata olursa
      `e2e-report` artefaktı); `release.yml` `ci.yml`'i çağırdığı için etiket yayınında da koşar (kullanıcı
      kararı). Dependabot `tests/e2e` npm paketlerini de izler. **CI'daki ilk koşusu push'tan sonra
      görülecek** (Linux'ta denenmedi).
    - Lokalde: 7/7, `--repeat-each=3` ile 21/21 (4 worker; varsayılan worker sayısında dizüstü yetişmiyor).
      Bir koşu derlemeyle ~1,5 dk. CLAUDE.md'de e2e kuralı ve komutları, README'de bölüm.
    - Not: CLAUDE.md'deki headless Edge `DOM.setFileInputFiles` tuzağı Playwright'ın dosya seçicisinde
      yaşanmadı (fotoğraf yükleme e2e'de çalışıyor).
    - Push sonrası CI'da (Linux, Chromium) E2E ilk koşuda geçti; #31–#34 kapandı.
70. **Dependabot: Angular 21.2.25** (`chore/deps-angular-21.2.25`, PR #36, 2026-10-04): yedi Angular paketi
    21.2.24 → 21.2.25 (yama; düzeltme kullanmadığımız `platform-server`'da). Dependabot'un commit'i lokalde
    cherry-pick ile alındı (PR GitHub'da merge edilmez; `main`'e girince Dependabot kapatır). `ng build`,
    `ng test` (261) temiz; PR'da CI'ın üç işi de geçmişti. `npm audit`'teki tek konu yine `piscina`
    (Açık konular 15). Tuzak: `ng serve` çalışırken `npm ci` `node_modules`'u yarım bıraktı (CLAUDE.md'ye
    eklendi).
71. **`v1.3.0`** (`chore/release-v1.3.0`, 2026-10-04): P2 (Tamamlananlar 66–69) ve Angular 21.2.25
    (Tamamlananlar 70). Migration yok, sunucu hazırlığı yok. Pipeline: Checks artık E2E işiyle (API, Web, E2E
    paralel; geçti), Package, kullanıcı onayı, Deploy; canlı `/api/health` `1.3.0+cc0326c`, `/login` 200,
    bilinmeyen adres 200 (SPA, 404 sayfası), `coinportal.runasp.net` 308. Kullanıcı telefonda 404 sayfasını ve
    tema renkli onay kutusunu doğruladı. Release notları `.notes/release-v1.3.0.md`, kullanıcı onayıyla Claude
    `.notes/scripts/create-release.js` ile yayınladı ("latest").
72. **Yeni logo** (`feat/logo`, 2026-10-04): amber geçişli daire + "€" metni yerine sade bir logo: dolu
    daire, içinde uçları yuvarlak çizgilerle € (kullanıcının gösterdiği bir örnekten). `shared/logo`
    (inline SVG, header ve footer), açılış ekranında `index.html`'de kopyası.
    - **Renk temaya göre** (kullanıcı kararı): açıkta koyu para (#1c1f22) + altın € (#f2b51e), koyuda altın
      para + koyu kahve € (#3b2604). `styles.css` `--logo-coin` / `--logo-sign`; tema rengine bağlı değil.
      Koyu para koyu temada zemine karışıyordu, bu yüzden tersi.
    - İkonlar (`make-icons.mjs` yeni çizimle): manifest ve iPhone ikonları açık tema hali (koyu para),
      maskable/apple zemini slate-50 (manifest'in `background_color`'ı); yeni `favicon.svg` tarayıcının
      açık/koyu moduna göre renk değiştirir, `favicon.ico` yedek.
    - **Denenip bırakılanlar** (aynı sohbette, kullanıcı seçici): SVG'de parlak 3D altın para; three.js
      ile gerçekçi render (tırtıklı kenar, kenar yazısı "coinvitrine.com", buzlu/parlak yüzey): büyükte
      beğenildi ama 32 px'te bütün detay kayboldu, yazısız ve büyük € hali de yetmedi; sadece kenar
      çizgileriyle (içi boş) € ve halka: "çok çizgi dolu". Sonuç: küçük boyda okunan sade düz logo.
    - Doğrulama: `ng build`, `ng test` (261), Prettier; headless Edge'de iki temada header/footer ve
      üretilen ikonlar kontrol edildi. Kullanıcı localhost'ta baktı.
73. **Yeni ana sayfa** (`feat/home-page`, 2026-10-04; `feat/logo`'nun üstünde): taslaklar kullanıcıyla
    (A4 girişsiz, U1 girişli, telefon görünümleri; lokal `.notes/designs/home/`).
    - **Girişsiz (`HomeWelcome`):** slogan, açıklama, yan yana kayıt/giriş butonları (sığmazsa alt alta,
      yazı kırılmaz; 4 dilde 360 px'te ölçüldü), "ücretsiz · reklam yok · verilerin senin" satırı, çizgi
      paralı albüm çizimi (`LineCoin`, `stat-icon` renkli kutular), ikonlu üç özellik kartı, 1-2-3 adım
      (numaralar logo renkleriyle), "Ücretsiz. Reklamsız." bandı (iki temada ters renkli: `shade-900`).
      Ücretsiz/reklamsız vurgusu kullanıcı isteği.
    - **Girişli (`HomeDashboard`):** karşılama + "Coin ekle", "Bu coin bende var mı?" (bütün
      koleksiyonlarda arar, 300 ms gecikmeli, en fazla 5 sonuç + "ve N sonuç daha", yoksa "Koleksiyonunda
      yok"), sayılar (coin, koleksiyon, ülke, hatıra), son eklenen 5 coin (telefonda yana kayan şerit), ilk 5
      koleksiyon + "Yeni koleksiyon" (form penceresi `@defer`), herkese açık koleksiyonu varsa profil linki
      ve kopyalama. Taslaktaki "Tümü →" linki yok (bütün coin'leri listeleyen sayfa yok).
    - **API:** `GET api/coins/summary` (coin, ülke, hatıra sayısı; sadece kendi verisi). Arama artık
      kelime kelime (`CoinListing.SearchTerms`, her kelime başlıkta ya da açıklamada; en fazla 6): eski
      tek parça arama "almanya 2006"yı "2 € · Almanya · 2006"da bulmuyordu. Koleksiyon sayfası ve Keşfet de
      bundan yararlanıyor.
    - Metinler 4 dilde (Türkçe taslaktan; İngilizce, Almanca, Bulgarca Claude'un; kullanıcı gözden
      geçirebilir). `home.headline` ve `home.goToCollections` kaldırıldı.
    - **Telefonda dil butonu** (kullanıcı isteği, 2026-10-05): girişsiz ziyaretçinin header'ında tema
      butonunun yanında "文A" ikonu; footer'daki listenin aynısını açar (`LanguageSelect` `iconOnly`).
      Telefonda footer sayfanın sonunda kaldığı için çok dil desteği ilk ekranda görünmüyordu. Girişli
      kullanıcıda yok (dil Ayarlar'da, hesaba kayıtlı), masaüstünde yok (footer yapışkan, hep görünür).
    - Testler: API (kelime kelime arama, özet: sahiplik, boş hesap, girişsiz 401), client (`home.spec`,
      `home-dashboard.spec`, header ve dil seçici), e2e `home.spec.ts` (iki hal, telefonda dil değiştirme;
      axe). Axe albümdeki küçük yazıların kontrastını yakaladı (nötr renge çekildi). Toplam: API 225,
      client 270, e2e 10; Prettier, `ng build` temiz;
      kırpma kütüphanesi ana sayfa paketine statik girmiyor. Ekran görüntüleriyle iki tema, masaüstü/telefon,
      Almanca ve Bulgarca kontrol edildi (5090'da ayrı API ile).
    - **Saklanan taslak:** 8 euro coin'i için açık kutulu çizgi ikonlar (`.notes/designs/coin-icons/`):
      kullanıcı beğendi, "küçük kusurlar var, başka bir zaman kullanacağız".
74. **`v1.4.0`** (`chore/release-v1.4.0`, 2026-10-05): yeni logo (Tamamlananlar 72) ve yeni ana sayfa
    (Tamamlananlar 73). Migration yok, sunucu hazırlığı yok. Pipeline (Release #7): Checks (API, Web, E2E
    paralel), Package, kullanıcı onayı, Deploy, hepsi başarılı; canlı `/api/health` `1.4.0+8225c9e`, ana
    sayfa, `favicon.svg`, ikonlar ve manifest 200, `api/coins/summary` girişsiz 401, Keşfet'te çok kelimeli
    arama 200. Release notları `.notes/release-v1.4.0.md`, kullanıcı onayıyla Claude
    `.notes/scripts/create-release.js` ile yayınladı ("latest"). Pipeline'ı izlemek için yeni lokal betik
    `.notes/scripts/run-status.js <repo> <etiket>` (sadece okur; koşu, işler, onay bekleme durumu).
75. **Herkese açık koleksiyon kuralı** (`feat/public-requirements`, 2026-10-05/06; 1. ve 2. aşama bitti, `v1.5.0` ile
    yayında (Tamamlananlar 76); kararlar
    "Herkese açık koleksiyon kuralı: kararlar"). 1. ve 2. aşama aynı branch'te, merge ikisinden sonra
    (`main`'de kuralı uygulayan ama arayüzü hazır olmayan bir ara durum olmasın).
    - **1. aşama, backend (bitti):**
      - `Publishing/PublicationRules`: "fotoğraflı coin" tanımı tek yerde (ulusal yüz fotoğrafı;
        Expression, EF'te ve bellekte), `PublicationStatus`. `Publishing/PublicationGuard`: eşiği okur,
        koleksiyonun durumunu sayar, bir işlemin hangi Public koleksiyonları bozacağını bulur
        (`CollectionChange`: fotoğrafsız coin ekler / fotoğraflı coin eksiltir), `Unpublish` (Unlisted + yeni
        link). Görünürlük ve link kuralı `Collection.SetVisibility`'ye taşındı.
      - Site ayarı: `SiteSettings` tablosu (tek satır, Id 1, `MinPublicCoins` 1–100, varsayılan 10; satırı
        migration ekler, `HasData` değil). Admin uçları `api/admin/settings` (GET, PUT + isteğe bağlı not) ve
        `GET api/admin/settings/impact?minPublicCoins=N` (bu eşiğin altında kalan Public koleksiyon sayısı).
        Değişiklik denetim kaydına `SettingChanged` (yeni alanlar `Setting`, `OldValue`, `NewValue`).
      - Yayına alma: Public'e geçişte kural tam uygulanır; olmazsa 400 `public_requirements` + `coinCount`,
        `photographedCoinCount`, `minPublicCoins`. Yeni koleksiyon Public başlayamaz. Koleksiyon yanıtına
        `PhotographedCoinCount` ve `MinPublicCoins` eklendi.
      - Kati kontroller (409 `would_unpublish` + `collections: [{id, name}]`; `?unpublish=true` ile işlem
        yapılır ve koleksiyon aynı kayıtta Unlisted olur): ulusal yüz fotoğrafını silmek, coin silmek,
        coin taşımak (kaynak ve hedef), Public koleksiyona fotoğrafsız coin eklemek, koleksiyon silerken
        fotoğrafsız coin'leri Public bir koleksiyona taşımak.
      - Yeni coin fotoğraflarıyla tek istekte: `POST api/coins/with-photos` multipart (`coin` = istek
        JSON'u, `national` / `common` dosyaları). Ayrı adres, çünkü aynı adreste `[Consumes]` ile ayrılan iki
        uçtan OpenAPI dokümanı sadece birini gösteriyordu. Önce bütün görseller
        işlenir, sonra dosyalar, sonra tek `SaveChanges`; hata olursa dosyalar silinir. Fotoğraf hatası
        `side` da taşır. Fotoğraf işleme ortak yardımcıda (`ProcessCoinPhotoAsync`).
      - Coin listesi filtresi `photographed=true|false`.
      - Migration `AddPublicationRules`: tablo, ayar satırı, denetim alanları; kurala uymayan Public
        koleksiyonları Unlisted yapar (T-SQL'de `CRYPT_GEN_RANDOM(16)` → base64url link). Örnek veriyle hem
        `ef database update` hem idempotent `migrate.sql` yolu denendi.
      - Seed: herkese açık koleksiyonlardaki coin'lere yapay ulusal yüz fotoğrafı (`DevData/SeedPhotos`,
        metale göre renkli disk; değer başına bir kez işlenir), diğerleri fotoğrafsız.
      - Testler: `PublicationTests` (kural, kati kontroller, tek istekte kayıt, filtre), `SiteSettingsTests`
        (panel ucu, denetim kaydı, aralık, eşik yükseltme; `SiteSettingsCollection` diğer testlerle aynı anda
        koşmaz). Testlerde eşik 2 (`CoinPortalFactory.MinPublicCoins`); Public kuran eski testler
        `PublishAsync` / `CreatePublicCollectionAsync` / `CreatePhotographedCoinAsync` kullanır. e2e
        yardımcıları `createPhotographedCoin`, `publish` (e2e'de eşik varsayılan 10). API 243 test.
    - **2. aşama, client (bitti):**
      - Koleksiyon sayfası (sahip, Public değil, kilitli değil): başta her zaman görünen uyarı
        ("Herkese açık yapmak için · 7/10 fotoğraflı coin · 3 coin'in ulusal yüzü eksik · Bu arada linkle
        paylaşabilirsin."; son ipucu sadece Gizli'de, "eksik" linki `?photo=missing`). Şartlar sağlanınca yeşil
        "Koleksiyonun vitrine hazır" + "Herkese açık yap" butonu (`PUT` ile, eski veride `public_requirements`
        gelirse sayılar yenilenir). Fotoğraf filtresi (Tümü / Ulusal yüzü eksik / Ulusal yüzü var; sadece
        sahip, URL `photo=missing|complete`); sahip modunda arama kutusu geniş ekranda tek sütun (altı filtre
        bir satırda).
      - Koleksiyon formu: "Herkese açık" şartlar sağlanana kadar seçilemez, altında sebep ve sayılar
        ("Henüz seçilemez: 3/10 fotoğraflı coin · …"; yeni koleksiyonda "önce oluştur ve coin ekle"). Zaten
        Public olan (eşik yükselmiş) seçebilir. `public_requirements` formun mesajlarında.
      - `UnpublishConfirm` (`shared/`): coin formunda kaydet, taşı, coin sil ve ulusal yüz fotoğrafını sil
        bundan geçer; pencere hangi koleksiyonun neden linkle paylaşılana geçeceğini ve herkese açık adresin
        çalışmayacağını söyler. Vazgeçilirse değişiklik yapılmaz (fotoğraf silmede "değişiklik yapılmadı"
        mesajı). Koleksiyon silme penceresi seçimin altında uyarı gösterir (hedef Public ve fotoğrafsız coin
        varsa), adı yazmak onu da onaylar; sayfa eskiyse API'nin 409'u uyarıyı açar, ikinci tık onaylar.
      - Coin formu: yeni coin seçilen fotoğraflarıyla tek istekte (`createWithPhotos`); fotoğraf hatası yüzün
        adıyla gösterilir, coin oluşmaz.
      - Yönetim paneli: "Genel ayarlar" bölümü (`/admin/settings`, kaydırıcı ikonu): en az fotoğraflı coin
        (1–100), yazarken 300 ms sonra "bu değerle yayındaki N koleksiyon eşiğin altında kalır", isteğe bağlı
        not, Kaydet. Denetim kaydında "Ayar değiştirildi" + "En az fotoğraflı coin: 10 → 12" (filtrede de).
      - Kullanım şartları "İçeriğin" bölümüne kural paragrafı (4 dil, sayı yazılmadan: admin değiştirebilir),
        `TERMS_UPDATED` 2026-10-05. Gizlilik değişmedi (yeni kişisel veri yok).
      - Metinler 4 dilde (`publication.*`, `coinList.photo*`, admin `settings.*`); İngilizce, Almanca,
        Bulgarca Claude'un.
      - Testler: client `publication.spec`, `unpublish-confirm.spec`, `admin-settings.spec`, koleksiyon sayfası
        (uyarı, buton, filtre), form penceresi (Public kapalı/açık), silme penceresi (uyarı, 409 sonrası onay);
        e2e `publishing.spec.ts` (uyarı → eksik filtresi → yayına alma → ziyaretçi → coin silme penceresi →
        linkle paylaşılan; panel ayarları; axe). Toplam: API 243, client 292, e2e 12. Tarayıcıda gözle
        bakılmadı (e2e ve axe dışında); kullanıcının bakması önerildi.
    - **Review düzeltmeleri (2026-10-06):** 2. aşamanın ayrı bir modelle yapılan incelemesinden (bulgular
      sohbette değerlendirildi, hepsi kodda doğrulandı; kullanıcı onayıyla):
      - API: `POST api/collections/{id}/publish` (sadece görünürlük: sayfanın eski kopyası adı/açıklamayı geri
        yazamaz; kilitliyse 403 `moderation_locked`, şart yoksa 400 `public_requirements` + sayılar, zaten
        Public ise aynen döner). Koleksiyon yanıtına `canBePublic` (`PublicationStatus`'tan; client kararı
        API'ye bırakır, Euro dışı coin kuralı gelince sadece API değişir). `PublicationGuard.Unpublish`
        Information log yazar ("koleksiyonum neden indi" sorusunun izi). Fotoğraf kaydında geçici klasörün
        yerine taşınması Windows'ta virüs tarayıcısı yüzünden "Access denied" verebiliyor (testte görüldü):
        silmedeki gibi kısa aralıklarla yeniden denenir.
      - Koleksiyon sayfası: buton yeni ucu kullanır; **linkle paylaşılan koleksiyonda önce onay** ("Paylaşım
        linki çalışmayacak", kullanıcı kararı); "N coin eksik" linki arama ve filtreleri bırakır (sıralama,
        sayfa boyu, görünüm kalır); `publishError`/`deleteError` koleksiyon değişince sıfırlanır.
      - Form penceresi: `public_requirements` gelince koleksiyonu yeniden yükler (sayılar gerçekten güncellenir,
        seçim kayıtlı görünürlüğe döner, sayfa da taze sayıları alır); kapalı "Herkese açık"ın sebebi
        `fieldset`'in açıklaması da (ekran okuyucu kapalı radyoyu atlayabiliyor).
      - Silme penceresi: API'nin uyarısı `role="alert"`, buton "Yine de sil"; hedef değişince uyarı sıfırlanır;
        sayfa fotoğrafsız coin bilmiyorsa sayısız metin (`publication.moveUnpublishesSome`).
      - Coin formu: "herkese açık kalsın" denince fotoğraf silme geri alınır, hata yerine nötr bilgi
        (`publication.unpublish.photoKept`), çıkışta soru yok. Onay penceresi koleksiyon sayısına göre tekil/çoğul,
        adlar dilin tırnağı ve listesiyle (`Intl.ListFormat`: „A“ und „B“).
      - Admin ayarları: değer aynıysa gönderilmez, "Değer zaten N" (not kaybolmasın diye). TR denetim kaydı
        adı form etiketiyle aynı ("En az fotoğraflı coin sayısı").
      - README özellik listesi kuralı ve genel ayarları anıyor.
      - Testler: API +2 (yayın ucu: sadece görünürlük + link biter, başkasının 404 / girişsiz 401; kilitli 403
        ve `canBePublic` mevcut testlere), client: yeni `coin-form.spec` (fotoğraflarla tek istek, yüz adlı hata,
        409'da vazgeçme, fotoğraf silmeyi reddetme/onaylama), `toPhotographed`, form penceresinin
        `public_requirements`'i, silme penceresinde hedef değişimi, iki koleksiyonlu onay metni, admin'de aynı
        değer, sayfada linkle paylaşılan onayı ve eski veri. Toplam: API 245, client 309, e2e 12.
      - Bilerek yapılmayanlar: otomatik indirmede "askıya alınmış Public" (karar Unlisted kaldı: yeni durum
        bütün herkese açık okuyucuları etkiler, otomatik geri dönüş "yayına alma bilinçli adım" kararıyla
        çelişir); yarış durumu (Açık konular 22); coin formunda önceden uyarı ve kartlarda ilerleme rozeti
        (Açık konular 23).
    - **3. aşama:** coin ikonları; bitti (Tamamlananlar 77).
76. **`v1.5.0`** (`chore/release-v1.5.0`, 2026-10-06): herkese açık koleksiyon kuralı (Tamamlananlar 75).
    Kullanıcı tarayıcıda denedi, bulgu yok; `feat/public-requirements` merge, `main` push, etiket. Yeni migration
    (`AddPublicationRules`) olduğu için kullanıcı onaydan önce panelden veritabanı yedeği aldı ("Create BAK
    file", manuel .bak). Pipeline (Release #8): Checks (API, Web, E2E), Package, onay, Deploy, hepsi başarılı;
    canlı `/api/health` `1.5.0+fcff247`. **Canlı veri:** yayından önce iki Public koleksiyon vardı (`halid` /
    "Koleksiyonum", `yurtsever.d` / "Euro", 1'er coin); migration ikisini Linkle paylaşılana çekti, Keşfet ve
    profiller şimdilik boş (`api/public/collectors` `[]`, eski adresler 404). Eşik 10; sahipler fotoğraflı coin
    ekleyince butonla yeniden yayına alır. Release notları `.notes/release-v1.5.0.md`.
77. **Coin değer ikonları** (`feat/denomination-icons`, 2026-10-06; herkese açık koleksiyon kuralının 3. aşaması,
    `v1.5.1` ile yayınlanacak):
    - Taslak kullanıcıyla adım adım (`.notes/designs/coin-icons/coins-v5.html` son hali; v2–v4 ara adımlar):
      ikonlar **eşit boyda** (gerçek oran 40 px'te 1c'yi okunmaz yapıyordu); **dolu metal** (içi metal rengi,
      kenar ve noktalar koyu ton, yazı metalin üstünde koyu): kullanıcı önce koyu temanın çizgi renklerini
      beğendi, açık temada aynı renkler çizgide ~1,6:1 kaldığı için dolu stil seçildi, sonra koyu tema da aynı
      yapıldı (**coin iki temada aynı**, sadece zemin değişir); 20c'nin kenarında 7 küçük içe oyuk (ilk
      taslakta dışa taşan tümsekler, ikinci denemede dişli gibi büyük); noktalı halka çevreye oturtuldu (saat
      3'te iki nokta yan yanaydı); dış kenar ve 1 €/2 € halkaları 1,1 → 0,75 birim (kullanıcı: biraz ince).
      Kullanıcının seçmediği kusurlar (bakır/altın yakınlığı, 1 €/2 € çapraz zemini) aynen kaldı.
    - `shared/denomination-icon` (`DenominationIcon`, inline SVG, geometri kodda hesaplanır),
      `styles.css` `denomination-tile` / `-outlined` / `denomination-<copper|gold|bimetal>` (açık ve koyu).
      Kullanıldığı yerler: `CoinThumb` (liste, tablo, kartlar, ana sayfa; zeminsiz, `tight`: coin fotoğraf
      gibi daireyi doldurur, kullanıcı tarayıcıda iç içe iki daireyi fazla buldu), koleksiyon ızgarası (metalin
      renkli kare zemini, `tile`), ana sayfa "Son eklenenler" kartı. Görüntüleyici `[denomination]` alırsa eksik ortak yüzü ikonla gösterir (butonlar,
      oklar ve tekerlek dahil; ekran okuyucu "… – Ortak yüz (fotoğraf yok)", `viewer.noPhoto` 4 dilde); sadece
      koleksiyon sayfası verir (coin formunda boş ortak yüz kutusu zaten görünüyor). `CoinPlaceholder` kullanılmıyor,
      Euro dışı coin'ler için (yol haritası 18) duruyor.
    - Testler: client 319 (+10: `denomination-icon.spec` etiket, metal renkleri, 20c oyukları, noktaların eşit
      dağılımı, zemin; `coin-thumb.spec`; görüntüleyicide ikonlu ortak yüz ve `denomination`'sız hal); API 245
      (değişmedi), e2e 12 geçti (axe dahil). Ekran görüntüleriyle (ayse.yilmaz, 4200) ızgara, tablo, telefon kartları, görüntüleyici iki temada
      kontrol edildi.
78. **`v1.5.1`** (`chore/release-v1.5.1`, 2026-10-06): coin değer ikonları (Tamamlananlar 77). git-cliff 1.6.0
    önerdi (`feat`), kullanıcı yama sürümü seçti. Migration yok, sunucu hazırlığı yok. Pipeline (Release #9):
    Checks (API, Web, E2E), Package, onay, Deploy, hepsi başarılı; canlı `/api/health` `1.5.1+2420786`.
    Release notları `.notes/release-v1.5.1.md`.
    - **`v1.5.0`'ın Release'i taslak kalmıştı** (kullanıcı fark etti: repo sayfasında "Latest" ve README'deki
      release rozeti `v1.4.0` gösteriyordu). Rozet canlıdır (shields.io, en son *yayınlanmış* Release), elle
      güncellenmez; eksik adım Release'in yayınlanmasıydı. `v1.5.0` hazır notlarıyla, ardından `v1.5.1`
      yayınlandı (latest `v1.5.1`, rozet doğrulandı). `.notes/scripts/create-release.js` artık sonunda
      `releases/latest` = etiket ve taslak kalmadığını kontrol eder (değilse hata kodu); kural CLAUDE.md "Sürüm
      ve yayın"da.
79. **CodeQL** (`chore/codeql-alerts`, 2026-10-06; yol haritası 19a): kullanıcı GitHub'da "Default setup"ı
    açtı. Diller C#, JavaScript/TypeScript ve GitHub Actions; standart kural seti, tehdit modeli `remote`,
    `main` push'larında ve haftalık. İlk koşuda "Adjust Configuration" işinin atlanması normal (sadece bir
    dilin analizi başarısız olursa ya da kod bulunamazsa koşar). İlk tarama: C# 0 bulgu, 9 bulgu:
    - #8, #9 `js/insecure-randomness`: e2e'nin test kullanıcı adı `Math.random()` ile üretiliyordu (gerçek
      risk değil); `tests/e2e/support/users.ts` artık `crypto.randomBytes` kullanıyor, uzunluk aynı.
    - #1–#7 `actions/cache-poisoning/poisonable-step` (`ci.yml` web ve e2e adımları): **yanlış alarm**,
      "False positive" olarak kapatılır. Gerekçe: `ci.yml`'yi elle başlatmak (`workflow_dispatch`) ve
      `release.yml`'den çağırmak sadece yazma yetkisi olanların işi; `inputs.ref`'i sadece `release.yml`
      verir (kendi etiketimiz); fork PR'larının önbelleği `main`'inkinden ayrı. `inputs.ref` ve elle başlatma
      yayın pipeline'ı için gerekli, kod değişmedi.
    - Yeni bir bulgu çıkarsa: gerçekse düzeltilir ve mümkünse 19b–19c testlerine girer; yanlış alarmsa
      gerekçesiyle "False positive" kapatılır ve buraya yazılır.
    - Kullanıcı #1–#7'yi kapattı; #8 ve #9 push'tan sonraki taramada "Fixed" oldu. Açık bulgu yok.
80. **Yetki matrisi** (`feat/authorization-matrix`, 2026-10-06; yol haritası 19b): `tests/api/
    AuthorizationMatrixTests.cs`. API'nin 51 ucunun her biri tabloda bir satır: method + route şablonu +
    erişim kuralı. Kurallar: `Anyone` (girişsiz de başarılı), `SignedIn` (girişsiz 401, kendi verisi),
    `Owner` (sahibin gizli kaynağı: girişsiz 401, başka kullanıcı ve admin 404), `Visible` (girişsiz
    okunabilen uçlar: gizli hedef ziyaretçiye, başka kullanıcıya ve admin'e 404, sahibin görünür yaptığı hedef
    ziyaretçiye 200), `Admin` (girişsiz 401, kullanıcı 403). Her satırda sahibin isteği en son gider ve
    401/403/404 almamalı: yanlış bir adresin "404 geldi, geçti" demesini önler.
    - `EveryEndpoint_IsInTheMatrix` uçları uygulamadan okur (`ApiConventionsTests` gibi): tabloda olmayan yeni
      uç, silinen ya da adresi değişen uç testi kırar. Kural CLAUDE.md "API testleri"nde.
    - Her satır kendi verisini kurar (sahip, gizli koleksiyon + fotoğraflı coin + kapak, linkle paylaşılan
      koleksiyon, gizliye dönmüş bir koleksiyonun eski linki), sahibin silmesi diğer satırları etkilemez.
      `AdminCollection` içinde (admin açar); admin ayarı satırı mevcut değeri yazar, ayar değişmez.
    - Kapsam dışı (planlandığı gibi): gövdedeki başkasına ait Id'ler (19c); görünürlük durumlarının ayrıntısı
      zaten `PhotosAndCover_FollowTheCollectionsVisibility`, `VisibilityTests` ve
      `Lock_HidesTheUsersSharedCollections`'ta, matriste tekrarlanmadı.
    - Bulgu çıkmadı: bütün uçlar kurala uyuyor. Testin işe yaradığı bilinçli bozmayla doğrulandı (coin
      GET'inden sahiplik filtresi kaldırılınca "başka kullanıcı 404 bekliyordu, 200 aldı"; tablodan bir satır
      silinince eksik uç listelendi), sonra geri alındı.
    - `ApiClient.FileContent` / `CoinWithPhotosContent`: multipart gövdeleri tablodan da kurulabilsin diye
      ayrıldı. API testleri 297 (+52), süre ~1 dk.
81. **Kötüye kullanım testleri ve paylaşım linkinin harf duyarlılığı** (`fix/share-token-case` +
    `feat/abuse-tests`, 2026-10-06; yol haritası 19c).
    - **Bulgu (düzeltildi):** paylaşım linki büyük/küçük harf duyarsızdı: `ShareToken` sütunu veritabanının
      varsayılan (CI) collation'ını kullanıyordu, harfleri değiştirilmiş anahtar da koleksiyonu, coin
      listesini, fotoğrafları ve kapağı açıyordu. Etki düşük (linki bilmeyen kullanamaz, tahmin edilecek
      anahtar ~128 bitten ~110 bite iner), ama anahtar birebir eşleşmeli. Düzeltme: sütuna
      `Latin1_General_BIN2` (migration `ShareTokenCaseSensitive`: unique index'i kaldırır, sütunu değiştirir,
      index'i yeniden kurar; tek transaction, küçük tablo). Mevcut linkler aynen çalışır. Lokal veritabanına
      uygulandı, çalışan API'de asıl link 200, harfi değişmiş link 404. Test `VisibilityTests.
      ShareLink_WithItsLettersInOtherCase_DoesNotOpen`. Kural CLAUDE.md "Backend kuralları"nda (gizli değer
      tutan sütun binary collation alır). **Sonraki yayında migration var:** pipeline özeti yedek uyarısı verir,
      onaydan önce panelden veritabanı yedeği alınır.
    - `tests/api/AbuseTests.cs` (41 test), hepsi geçti: gövdedeki fazladan alanlar (`id`, `ownerId`,
      `createdAtUtc`, `shareToken`, `moderationLocked…`, `coverImageId`, kayıtta `roles`/`lockedAtUtc`,
      ayarlarda `userName`/`email`) etkisiz; başkasının koleksiyonuna fotoğraflı coin reddedilir ve dosya
      kalmaz; `?collectionId=<başkasının>` 404. Yükleme: `.jpg`/`.png` adlı SVG ve HTML `invalid_image`;
      metin chunk'ında ve sonunda betik taşıyan PNG kabul edilir ama kaydedilen WebP'lerde yok, sunum
      `image/webp` + `nosniff`; 50.000×50.000 diyen birkaç yüz baytlık PNG başlıktan reddedilir; dosya adındaki
      `../../` yok sayılır. Sorgu: aramada `%`, `_`, `[`, `'`, `' OR '1'='1` düz metin; 17 sınır dışı değer
      (sayfa, boyut, sıralama, yön, `countryOrder`, `collectionId`, yıl, ülke, değer) hem `api/coins` hem
      Keşfet'te 400; uzun değerler 400, uzun ya da joker/yol içeren kullanıcı adı 404.
    - `TestImages`: `SvgWithScript`, `Html`, `PngWithPayload`, `PngClaimingSize`. API testleri 339 (+42).
82. **ZAP baseline taraması, rapor modu** (`feat/zap-baseline`, 2026-10-06; yol haritası 19d, ilk adım).
    CI E2E işinin sonunda, Playwright testleri geçince: `start.mjs` siteyi `E2E_ENVIRONMENT=Production` ile
    HTTPS'te açar (`dev-certs` sertifikası, `coinportal.test` `/etc/hosts`'ta; `localhost` HSTS almaz),
    ZAP (`zaproxy/zap-stable:20260807` + digest, 2.17.0) `zap-baseline.py -j -m 3` ile girişsiz gezer.
    Production + HTTPS seçimi, çünkü Development'ta Swagger açık ve cookie'ler `Secure` değil, Production'da
    düz HTTP'de antiforgery 500 verir: ikisi de canlıda olmayan bulgular üretirdi. Lokalde denendi: HTTP → HTTPS
    307, HSTS, `secure; samesite=strict` cookie'ler, antiforgery 204, Swagger yok.
    - **Kullanıcı kararları (2026-10-06):** önce sadece rapor (bulgular CI'ı kırmaz; ilk rapordan sonra her
      kural için IGNORE / WARN / FAIL kararı `.zap/rules.tsv`'ye yazılır); deneme `main`'e push ile (ZAP
      lokalde çalışmaz: laptopta ve WSL'de docker/Java yok), adımlar `continue-on-error`: bozuk çıksalar da CI
      ve yayın kırmızı olmaz.
    - Rapor: artefakt `zap-report` (HTML, Markdown, JSON), Markdown özet koşunun Summary'sinde. E2E işinin
      süre sınırı 20 → 35 dk.
    - İlk koşu (CI #57) başarılı: site HTTPS'te tarandı (kayıt, iletişim, herkese açık koleksiyon, API
      çağrıları), 15 tür bulgu, yüksek seviye yok. Kararlar Tamamlananlar 83'te.
83. **ZAP kuralları ve site izolasyonu başlıkları** (`feat/zap-rules`, 2026-10-06; yol haritası 19d'nin
    bitişi). İlk rapor kullanıcıyla incelendi, kararlar (kullanıcı onayı 2026-10-06):
    - **CSP (10055, 4 bulgu, Orta):** WARN; tam CSP Açık konular 17, gelince FAIL olur.
    - **Site izolasyonu (90004, 3 bulgu, Düşük):** düzeltildi. `SecurityHeaders` her yanıta
      `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`,
      `Cross-Origin-Embedder-Policy: require-corp` ekler (site başka origin'den hiçbir şey yüklemiyor; kural
      CLAUDE.md'de). `HostingTests` kontrol eder, e2e (axe dahil) geçti.
    - **IGNORE (gerekçesi `.zap/rules.tsv`'de):** `XSRF-TOKEN` HttpOnly değil (istemci okumalı; oturum
      cookie'lerinin HttpOnly'si `AuthTests`'te), `bypassSecurityTrustHtml` (Angular'ın paketteki kendi kodu,
      uygulama çağırmıyor), localStorage'da dil tercihi, `index.html` yorumundaki "from", "Modern Web
      Application", Cache-Control ve önbelleklenebilir içerik (bilinçli).
    - **Kırma kuralı:** `.zap/rules.tsv` sadece kabul edilenleri listeler; raporda başka bir bulgu varsa
      `.zap/check.mjs` işi kırar (yeni bulgu sessizce geçmez), site raporda hiç yoksa da. `continue-on-error`
      kaldırıldı: ZAP adımı bozulursa da E2E işi ve yayın kırılır. `-I` kaldı (WARN'lar ZAP'ın çıkış kodunu
      değiştirmesin; karar `check.mjs`'te).
84. **Elle pentest oturumu ve bulguların düzeltmesi** (`fix/pentest-findings`, 2026-10-06; yol haritası 19e'nin
    ilk parçası). Lokal e2e sitesine (Production + HTTPS, kendi veritabanı) Node betikleri ve Edge
    (Playwright) ile; betikler lokal (scratchpad), bulgular testlere girdi.
    - **Temiz:** kayıtlı XSS (betikli başlık/açıklama/ad 7 sayfada, girişli ve girişsiz, düz metin), `returnUrl`
      ile dışarı yönlendirme (8 deneme, hepsi sitede kaldı), dosya sızıntısı (`appsettings*.json`, DLL,
      `.env`, Swagger 404; `/.git/config` gibi adresler SPA'nın `index.html`'i), TRACE/CONNECT reddedilir, yol
      parametreleriyle dizin aşma 404, dışa aktarma ZIP'i (giriş adları sadece Id: zip slip yok), oturum
      (girişte yeni cookie, "Beni hatırla" işaretsizken oturum cookie'si, 5 hatada kilit, 423 sadece doğru
      parolayla, giriş süresi bilinen/bilinmeyen kullanıcıda ~42/45 ms).
    - **Orta, düzeltildi: çıkış oturumu sunucuda bitirmiyordu.** Cookie'nin kopyası çıkıştan sonra 14 gün
      geçerliydi. Seçenekler kullanıcıyla tartışıldı (her yerden çıkış / sunucu taraflı oturumlar / kabul);
      **karar: her yerden çıkış** (küçük değişiklik, mevcut güvenlik damgası mekanizması, migration ve istek
      başına yük yok; çıkışın önemli olduğu ortak bilgisayar senaryosunda daha güvenli; sunucu taraflı
      oturumlar "aktif oturumlarım" özelliği istenirse). `AuthController.Logout` damgayı yeniler; test
      `AuthTests.Logout_EndsEverySessionOfTheUser_EvenACopiedCookie`.
    - **Düşük, düzeltildi: JSON hata mesajları iç tip adlarını veriyordu** (`System.Nullable`1[CoinPortal.Api.
      Data.CollectionVisibility]`, satır/konum). `AllowInputFormatterExceptionMessages = false`; test
      `AbuseTests.MalformedBody_IsRejected_WithoutInternalDetails`.
    - **Düşük, düzeltildi: kontrol karakterleri kabul ediliyordu** (NUL'lu koleksiyon adı kaydediliyordu).
      `Validation/NoControlCharactersAttribute` ad, başlık, darphane işareti, kayıttaki ad/soyad/e-posta ve
      (satır sonu/sekme serbest) açıklamalar ile admin notlarında; testler `AbuseTests`. Canlıda böyle bir
      değer varsa sahibi o alanı düzeltmeden kaydedemez (pek olası değil).
    - **Kabul, belgelendi:** kayıtta `DuplicateEmail` (Açık konular 24); düz HTTP'de `Host` yansıması (25,
      not). API testleri 354 (+15).
85. **Elle başlatılan aktif ZAP taraması** (`feat/zap-active-scan`, 2026-10-06; yol haritası 19e'nin ikinci
    parçası). Ayrı workflow yerine CI'ın `workflow_dispatch`'ine `zap_active` kutusu: işaretliyse E2E işi aynı
    siteyi (Production + HTTPS, e2e testlerinin doldurduğu veritabanı) `zap-full-scan.py` ile tarar (spider +
    aktif saldırılar; `scanner.maxRuleDurationInMins=5`, `maxScanDurationInMins=60`), iş süre sınırı 120 dk,
    concurrency grubu ayrı (push'un koşusu aktif taramayı iptal etmez). Push, PR ve yayın koşuları değişmedi.
    Aynı `rules.tsv` + `check.mjs`. Girişsiz; girişli aktif tarama ilk rapora göre düşünülecek.
    - **İlk aktif tarama** (CI #62, 2026-10-06, kullanıcı başlattı): ~9 dk; SQL injection, XSS, yol aşımı gibi
      saldırıların hiçbiri sonuç vermedi. İki yeni bulgu CI'ı kırdı, ikisi de yanlış alarm, kullanıcı onayıyla
      `rules.tsv`'de IGNORE (`chore/zap-active-findings`): **43** "Source Code Disclosure - File Inclusion"
      (Yüksek, orta güven: görsel adresindeki `v=` GUID, dosya yolu sadece Id'lerden; iki yanıt da aynı 400,
      sadece `traceId` farklı, benzerlik %74–75 / eşik %75) ve **90027** "Cookie Slack Detector" (bilgi,
      girişsiz taramada cookie'siz yanıt aynı). Girişli aktif tarama şimdilik yok: girişsiz tarama temiz,
      girişli uçların erişimi yetki matrisi ve kötüye kullanım testleriyle kapalı.
    - **Pasif taramada yeni yanlış alarm** (CI #63, 2026-10-06; `v1.6.0`'ın etiketi bu yüzden bir kez geri alındı,
      push edilmemişti): **10031** "User Controllable HTML Element Attribute" (bilgi, düşük güven). Gezgin ilk kez
      sıralamalı bir adrese (`?sort=Title&dir=Desc`) denk geldi; `Desc`'i `<meta name="description">` içinde
      buldu. Sunucu her sayfaya aynı sabit `index.html`'i gönderir, adresten HTML'e bir şey yazılmaz;
      kullanıcı onayıyla IGNORE. Ders: pasif tarama da gezginin o koşuda bulduğu adreslere göre değişir, yeni
      bir bulgu yayını durdurabilir (bilinçli).
87. **`v1.6.0`** (`chore/release-v1.6.0`, 2026-10-06): güvenlik testleri ve bulguların düzeltmeleri (Tamamlananlar
    79–86). git-cliff `v1.6.0` önerdi (`feat`: site izolasyonu başlıkları), kullanıcı onayladı. İlk etiket push
    edilmeden geri alındı: `main`'in CI'ında ZAP yeni bir yanlış alarm (10031) buldu, kullanıcı onayıyla
    IGNORE edildi, yayın commit'i ve etiket onun üstüne yeniden kuruldu (`b408ab7`). Pipeline (Release #10):
    Checks (API, Web, E2E + ZAP), Package, kullanıcı panelden veritabanı yedeği alıp onayladı, Deploy; hepsi
    başarılı. Canlı `/api/health` `1.6.0+b408ab7`, `Cross-Origin-*` başlıkları canlıda. Migration
    `ShareTokenCaseSensitive` açılışta uygulandı. Release notları `.notes/release-v1.6.0.md`, yayınlandı
    (latest `v1.6.0`). Testler: API 354, client 319, e2e 12 (README rozeti 685).
88. **E-posta doğrulama** (`feat/email-verification`, 2026-10-06/07; yol haritası 15'in e-posta kısmı; `v1.7.0` ile yayında, 89).
    Kullanıcı kararları (2026-10-06): önce doğrulama, şifre sıfırlama ayrı ve sonraki iş; **paylaşmak için
    doğrulama şart** (giriş ve kendi koleksiyonları serbest); mevcut kullanıcılar doğrulanmamış başlar ama
    paylaşılmış koleksiyonları yerinde kalır (migration yok: kayıt hiç `EmailConfirmed` işaretlemiyordu,
    seed kullanıcıları zaten işaretli).
    - **Altyapı** (`src/api/Email/`): `IMailSender` (MailKit 4.18.1 sadece burada), `SmtpMailSender` /
      `PickupFolderMailSender` (SMTP yoksa `.eml` dosyası), `EmailOptions` (`Email` bölümü, açılışta
      doğrulanır; `SiteUrl` http(s), yolsuz). Açılış logu e-postanın nereye gittiğini yazar; Development
      dışında SMTP yoksa ya da `SiteUrl` loopback ise Warning. Linkler `Email:SiteUrl`'den, `Host`'tan değil.
    - **Token** `EmailVerificationTokens`: Data Protection (`CoinPortal.EmailVerification`), kullanıcı Id +
      e-posta, 24 saat. Identity'nin `GenerateEmailConfirmationTokenAsync`'i kullanılmadı: güvenlik damgasına
      bağlı ve çıkış artık damgayı yeniliyor (Tamamlananlar 84), kayıttan sonra çıkış yapanın linki
      bozulurdu. E-postaya bağlı: ileride e-posta değişirse eski link işe yaramaz.
    - **Uçlar:** kayıt e-postayı gönderir (hata kaydı bozmaz, Error log); `POST api/auth/verify-email`
      (girişsiz, `Auth` hız sınırı, 400 `invalid_token`, tekrar 204); `POST api/auth/verify-email/resend`
      (girişli, yeni `Email` politikası 10 dk'da 3, 503 `email_not_sent`). `me`/login/kayıt yanıtında
      `emailConfirmed`; admin kullanıcı listesi ve detayında, dışa aktarmada (`account.json`) da.
      Koleksiyon Create/Update/Publish yeni paylaşımda 403 `email_not_confirmed`.
    - **E-posta metni** dört dilde (`Email/EmailTexts`; Almanca "du", Bulgarca "Вие", mevcut
      çevirilerle aynı). Gönderen `CoinVitrine <contact@coinvitrine.com>`. Düz metin + HTML (kullanıcı kararı
      2026-10-06: smtp4dev düz metindeki linki tıklanabilir göstermiyordu, programlara göre değişir): HTML'de
      amber "doğrula" butonu, altında linkin kendisi; sade kart, dışarıdan görsel yok (engellenir, okunduğunu
      ele verir), ad HTML'e kodlanarak (`EmailHtml`, test `HtmlBody_EncodesTheName`). Masaüstü ve 360 px'te
      headless Edge'de bakıldı.
    - **Client:** `layout/email-banner` (her sayfanın üstünde, tekrar gönder; `role="status"`/`alert`),
      `/verify-email` sayfası (girişsiz de; token adres çubuğundan silinir, `noindex`; girişliyse `me`
      yenilenir), koleksiyon formunda kapalı seçenekler + gerekçe, koleksiyon sayfasında yayın butonu
      yerine not, admin detayında "Doğrulandı/Doğrulanmadı". `email_not_confirmed` hesap geneli kod
      (`CODE_MESSAGE_KEYS`); `httpErrorKey` artık bu tabloya da bakar.
    - **Gizlilik:** `privacy.data.i5`, `purposes.i1`, `hosting.p1` dört dilde (hesap e-postaları, sadece
      hesapla ilgili, MonsterASP'tan gönderilir); `PRIVACY_UPDATED` 2026-10-06. Log maskesine `token=`.
      `THIRD-PARTY-NOTICES.md`: MailKit/MimeKit, BouncyCastle (MIT).
    - **Doğrulanmamış hesabın sınırları** (kullanıcı kararları 2026-10-06, ikinci tur): doğrulamadan **yeni
      koleksiyon yok** (kayıttaki koleksiyon kalır) ve hesapta en fazla **`SiteSettings.UnverifiedMaxCoins`**
      coin (varsayılan 20, admin panelinden 0–10.000; migration `UnverifiedMaxCoins` satırı 20 ile başlatır).
      Kuralı `Accounts/UnverifiedAccounts` tutar; 403 `email_not_confirmed` (yeni koleksiyon) ve
      `unverified_coin_limit` (+ `maxCoins`). Mevcut hesaplar da doğrulanmamış başlar ve sınırlar onlara da
      uygulanır (kullanıcı kararı: bant tek tıkla link gönderiyor); ellerindeki koleksiyon ve coin'ler kalır,
      sadece ekleme engellenir. Sınırı düşürmek coin silmez. Client: bant sınırları söyler; "Yeni koleksiyon"
      ve sınırda "Coin ekle" yerine not. Panel: durum **Doğrulanmamış** (gri rozet, filtrede; kilitli ve
      geçici kilit ağır basar) ve isimde **zarf + saat ikonu** (seçim taslaklarla yapıldı: gri nokta, zarf,
      kesik halka, kum saati, etiket arasından; durum "Kilitli" iken de doğrulanmamış olduğu görünsün diye).
      Ayarlar sayfasında ikinci bölüm; değişen her ayar ayrı denetim kaydı. Durum sütununun genişliği
      değişmedi (yeni metinler "Vorübergehend gesperrt"ten kısa). Sonra testler: API 373, client 331, e2e 14
      (golden path artık koleksiyon açmadan önce e-postayı linkle doğrular).
    - **Doğrulanmamış hesabın ömrü ve toplu silme** (kullanıcı kararları 2026-10-07, üçüncü tur): süre admin
      ayarı (varsayılan 30 gün, 0 = kapalı); mevcut hesaplarda süre yayın gününden (`UnverifiedLifetimeSinceUtc`,
      migration `UnverifiedLifetime` `SYSUTCDATETIME()` ile); **iki hatırlatma** (7 gün ve 1 gün önce);
      **kilitli hesaplar silinmez** (adres engelli kalsın). Kullanıcının uyarısı (2026-10-07): hatırlatma
      gönderilemezse silme onu beklemez, son gün gönderilemeyen hatırlatma silinen hesaba tekrar denenmez;
      metinler e-postanın ulaşacağına söz vermez ("göndermeye çalışırız, garanti edemeyiz"). Tek güvence:
      silme, ilk hatırlatma *denemesinden* en az 1 gün sonra (kısaltılan süre önce uyarır, e-posta sunucusu
      bozuksa silme takılmaz). İş birkaç saatte bir çalışır (günde bir yerine 6 saat: 1 günlük hatırlatma
      penceresini kaçırmasın). Kilitli spam hesapları için kullanıcı isteği: **toplu silme** (sayfadaki
      seçilenler, sayıyı yazarak onay, en fazla 100; "filtredeki herkesi sil" bilinçli olarak yok: görünmeyen
      sayfaları da silerdi) ve listede **E-posta filtresi**. Panel: Ayarlar'da süre, kullanıcı detayında silinme
      tarihi, Genel bakış'ta son çalışmanın özeti (gönderilen/gönderilemeyen hatırlatma, silinen hesap).
      Kullanım şartları (`terms.ending.p2`) ve gizlilik (`privacy.retention`) dört dilde, tarihleri 2026-10-07.
      Testler: API 384, client 333, e2e 15.
    - **Bir seferlik doğrulama isteği ve elle doğrulama** (kullanıcı kararları 2026-10-07): mevcut hesaplar
      yayında e-postayla haberdar edilir; admin Genel bakış'tan başlatır (canlıda e-posta ayarı denendikten
      sonra), arka planda 5 saniyede bir, her hesaba bir kez, kilitliler hariç; e-postada sınırlar ve (süre
      açıksa) silinme tarihi. Hatırlatma ve bu istekteki linkler 7 gün geçerli (kullanıcı onayı; kayıt ve
      "tekrar gönder" 24 saat). Admin, e-postası ulaşmayan kullanıcının adresini detay sayfasından
      doğrulanmış işaretleyebilir (denetim kaydında `EmailConfirmed`). Açık konular 24 için öneri: kabul
      kalsın (şifre sıfırlama aynı açığı vermesin). Testler: API 390, client 337.
      Bant düzeni (kullanıcı seçimi 2026-10-07, taslaklarla): 1. satır zarf ikonu + "E-posta adresini doğrula:
      <adres>" ve sağda "Linki tekrar gönder"; 2. satır aynı sütunda, aynı boyutta saat ikonu + silinme tarihi
      (tarih kalın); altında "Doğrulayana kadar:" ve üç madde (yeni koleksiyon, paylaşım, coin sınırı).
      "Linki tekrar gönder" her genişlikte ikincil buton. Ekleme butonları (yeni koleksiyon, coin) kullanılamazken
      **yerinde ve gri** (`btn-unavailable`; soluk görünüm "işlem sürüyor" demek olduğu için ayrı), ayrı not ve
      "coin sınırı" kutuları kaldırıldı: neden bantta, ekran okuyucu butondan banttaki maddeye gider (kullanıcı
      kararları 2026-10-07). Bütün butonlara el imleci (Tailwind 4 ok yapıyordu; linkler el gösteriyordu).
    - **Testler:** API 13 yeni (`EmailVerificationTests`: dil, `SiteUrl`, HTML gövdesi ve adın kodlanması, çıkıştan sonra link, bozuk/süresi
      dolmuş/başka adres/kullanıcısız token, tekrar gönderme sınırı, sunucu kapalıyken kayıt + 503, paylaşma
      kuralı, eskiden paylaşılmışın kalması) + matris satırları + admin/dışa aktarma kontrolleri; testler
      `FakeMailSender` ile, `SignUpAsync` varsayılan doğrulanmış. Client: `email-banner.spec`,
      `verify-email.spec`, formda doğrulanmamış seçenekler. E2E: `email-verification.spec` (bant, tekrar
      gönder, `.eml`'deki link, axe) ve e2e kullanıcıları kayıtta linkle doğrulanır (`support/mail.ts`).
    - **Yayından önce sunucuda** (Yayın öncesi yapılacaklar): SMTP ayarları ve `Email__SiteUrl`.
    - **Lokal posta sunucusu** (kullanıcı kararı 2026-10-06): smtp4dev 3.15.0 repo'nun yerel .NET aracı
      (`.config/dotnet-tools.json`; NuGet'ten, kurulum ve yönetici yetkisi istemez; MailHog bakımsız, Mailpit
      GitHub'dan exe ister). Geliştirmede varsayılan (`appsettings.Development.json` → `localhost:2525`,
      `Security: None`), gelen kutusu http://localhost:5050; e2e `.eml` klasöründe kalır.
89. **`v1.7.0`** (`chore/release-v1.7.0`, 2026-10-07): e-posta doğrulama ve doğrulanmamış hesaplar
    (Tamamlananlar 88). Önce `feat/email-verification` kullanıcının gözden geçirmesiyle main'e alındı (28 commit).
    **Sunucuda e-posta:** `web.config`'e `Email__SiteUrl=https://coinvitrine.com`, `Email__Smtp__Host=mail2248.mailasp.net`,
    `Email__Smtp__UserName=contact@coinvitrine.com`, `Email__Smtp__Password` (kullanıcı girdi; port 587 ve
    STARTTLS varsayılan). DNS: SPF (`v=spf1 a mx include:spf.mailasp.net ~all`), DKIM, DMARC (`p=none`) ve MX
    Cloudflare'de yerinde; panelin "SPF: Needs DNS record / Manual DNS setup required" uyarısı harici DNS
    yüzünden, kayıt panelin beklediğiyle aynı. git-cliff `v1.7.0` önerdi (`feat`). Pipeline (Release #11):
    Checks (Web, API, E2E + ZAP), Package, kullanıcı veritabanı yedeği alıp onayladı, Deploy; hepsi başarılı.
    Canlı `/api/health` `1.7.0+d382ec0`; üç migration (`UnverifiedMaxCoins`, `UnverifiedLifetime`,
    `VerificationRequest`) açılışta uygulandı. Release notları `.notes/release-v1.7.0.md`, yayınlandı (latest
    `v1.7.0`). **Yayın sonrası:** kullanıcı kendi hesabını bantla doğruladı (canlıda e-posta geldi, link
    çalıştı) ve Genel bakış'tan bir seferlik doğrulama e-postasını gönderdi. Bütün mevcut hesaplar doğrulanmamış
    başladı; ömür sayacı 2026-10-07'den (ilk silmeler en erken 2026-11-06). Testler: API 390, client 337, e2e 15
    (README rozeti 742).
90. **Görsel düzeltmeler** (`feat/ui-touch-ups`, 2026-10-07; kullanıcının ekran görüntüleriyle, her biri önce
    mockup'la seçildi; sadece client, yayında değil). Commit başına bir iş:
    - **Admin kullanıcı listesi, toplu seçim çubuğu:** telefonda tek satır (kutu + metin + küçük ikonlu "Seçilenleri
      sil"); metin seçim yokken "Tümünü seç", seçilince "N kullanıcı seçili". "Seçimi kaldır" kalktı (kutu
      temizliyor), `admin.users.selectPage` dört dilde kısaldı. Masaüstünde tablonun başlık kutusu, çubukta sayı.
    - **Genel ayarlar sayfası:** tam genişlik (`max-w-2xl` kalktı); her grup kendi kartında, renkli başlık şeridinde
      Genel bakış'taki ikon ve renkle (herkese açık: küre/emerald, doğrulanmamış: zarf/sky); her ayar bir satır
      (solda ad + ipucu, sağda değer, telefonda altta), birim kutunun içinde (`admin.settings.unit.coins|days`,
      çoğul, ekran okuyucu için etikette `sr-only`), etiketten "(gün)" kalktı; Not + Kaydet ayrı kartta.
    - **Coin formu, fotoğraf kutuları:** iki yüz formun ızgarasını paylaşıyor (`PhotoSlot` host'u
      `grid-rows-subgrid row-span-3`), uzun ipucu kutuyu aşağı itmiyor (dört dilde 360 px'te bakıldı).
    - **Yayına alma bandı:** başlık "Herkese açık yapmak için" → "Koleksiyonunu yayına almak için" (dört dilde
      aynı anlam; durum adını tekrarlamıyor, "Yayına alınıyor…" ile aynı fiil). Başlıkta rozet denendi, yanlış
      izlenim verdiği için bırakıldı.
    - **Sayfa yolu (breadcrumbs, `shared/breadcrumbs`):** profil, herkese açık koleksiyon, kendi koleksiyonu ve
      coin formunda; üst sayfalar yuvarlak buton (D stili, kullanıcı seçti; gri yazı ve renkli link seçenekleri
      "belirgin değil" bulundu), bulunulan sayfa telefonda yok. Eski "‹ …" geri linkleri kalktı. "Keşfet" son
      Keşfet adresine döner (`ExploreReturn`). Coin formu artık coin'in koleksiyonunu adıyla gösteriyor. Kurallar
      CLAUDE.md'de. Kullanıcı sitede baktı ve beğendi (2026-10-07), kalıcı.
    - Sohbette konuşulan **fotoğraf alanı** (kullanıcıya kalan alan, admin'e kota ayarı) API ve migration istediği
      için yol haritası 20 oldu, sıradaki iş. Testler: client 342 (+5), e2e 15; API değişmedi.
91. **Fotoğraf alanı** (`feat/photo-quota-setting`, 2026-10-07; yol haritası 20; ekranlar mockup'la seçildi).
    - **Kota site ayarı oldu:** `SiteSettings.UserQuotaMegabytes` (migration `UserQuota`, başlangıç 300, check
      constraint 50–2000; kullanıcı kararı aralık 50–2000 MB). `PhotoStorage:UserQuotaBytes` ayarı kalktı
      (sunucudaki `web.config`'te varsa yok sayılır). `PhotoQuota` sınırı her yüklemede veritabanından okur
      (`LimitBytesAsync`, `UsedBytesAsync`, `ExceededLimitAsync`); admin kullanıcı detayındaki kota da oradan.
    - **Admin:** Genel ayarlar'da üçüncü kart "Fotoğraflar" (pembe fotoğraf ikonu, Genel bakış'taki gibi), MB
      cinsinden; değişiklik denetim kaydına (`SettingChanged`, `UserQuotaMegabytes`). Kaydetmeden önce "bu
      değerle N kullanıcı sınırın üstünde kalır" (kullanıcı kararı; `GET api/admin/settings/quota-impact`).
      Düşürmek hiçbir şey silmez; üstündeki kullanıcı yer açana kadar yükleyemez.
    - **Kullanıcı:** Ayarlar > Hesap'ın başında "Fotoğraf alanı" (`GET api/settings/storage`: kullanılan ve
      sınır): doluluk çubuğu (`role="meter"`, `usage-bar`), "X / Y kullanıldı", "Z kaldı"; %90'dan itibaren
      turuncu ve not, dolunca kırmızı ve not; sınır düşürülüp üstünde kalınca da "doldu". Çok küçük kullanım
      ince bir dolguyla görünür (en az %1). Coin formunda kota hatası `/settings/account`'a link verir
      ("Fotoğraf alanına bak"; koleksiyon penceresindeki kapak hatasında yok, pencere içinden sayfa
      değiştirmek girdiyi kaybettirirdi).
    - `formatBytes` admin'den `core/i18n/format-bytes.ts`'e taşındı (admin-format yeniden dışa aktarır).
    - Testler: API 396 (+6: kota hatası artık site ayarıyla, düşürülen kota, aralık dışı, kendi kullanım, iki
      yetki matrisi satırı), client 348 (+6), e2e 15 (iki ekran geçici bir testle iki temada ve telefonda axe'ten
      geçti).

## Yol haritası

2026-09-29'daki proje yönü değerlendirmesinden çıkan sıra. Gerekçeler, elenen seçenekler, tuzaklar ve
doğrulanan dış bilgiler [reviews/2026-09-29-project-direction.md](reviews/2026-09-29-project-direction.md)
içinde (dondurulmuş doküman; burası güncel tutulur). Adımlar kullanıcı onayıyla başlar; durum değiştikçe
başındaki işaret güncellenir.

Özet kararlar (kullanıcı onayladı, 2026-09-29/30; hepsi uygulandı ya da kural oldu): klasörler `src/api` + `src/web` + `tests/` + `docs/`;
container şimdi yok (tetikleyici bekler); tek kimlik doğrulama şeması cookie + antiforgery kalır (JWT yok,
mobil de buna göre); sosyal katman kendi domain modeliyle, önce temel, yorum en son; mobil PWA önce,
mağaza için TWA.

- [x] 1. Yayın izni (Açık konular 2): kişisel GitHub, public (2026-09-29).
- [x] 2. `chore/folder-layout`: klasör taşıması (API ve `ng serve` durdurulur, terminaller repo köküne).
- [x] 3. `chore/format`: bir kerelik Prettier / dosya sonu satır sonu / kök `.editorconfig`.
- [x] 4. `chore/publish-prep`: LICENSE, İngilizce README, dokümanlarda ortama özel notların
      nötrleştirilmesi, `index.html` başlığı ve meta.
- [x] 5. `chore/release-tooling`: sürüm (`Directory.Build.props`), health + footer sürümü, git-cliff,
      CHANGELOG, `v0.1.0`.
- [x] 6. `chore/ci`: GitHub Actions + Dependabot.
- [x] 7. GitHub publish (2026-09-29/30), release `v0.1.0`. ImageSharp lisansı alındı (Tamamlananlar 21).
- [x] 8a. `chore/api-tests`: `tests/api` (xUnit v3), CI'da SQL Server'a karşı (2026-09-30).
- [x] 12. **Yönetici paneli temeli (arayüzüyle), hosting'den önce** (2026-09-30'da öne alındı, aşağıda;
      kararlar "Yönetici paneli: kararlar"). Sonunda `v0.2.0`.
  - [x] `feat/admin-role`: rol, `Admin:UserIds` senkronu, policy, 1 dk doğrulama, `me` → `roles`,
        `GET api/admin/stats` (Tamamlananlar 23).
  - [x] `feat/sign-in-times`: `LastSeenAtUtc`, `LastSignInAtUtc`, `PreviousSignInAtUtc` + migration;
        Ayarlar > Profil'de "Önceki giriş" (Tamamlananlar 24).
  - [x] `feat/admin-api`: `AuditLog`; kullanıcılar (liste, detay, kilitle/aç); Public/Unlisted
        koleksiyonlar (liste, gizle + kilit, kilidi kaldır); denetim kaydı (Tamamlananlar 25).
  - [x] `feat/admin-ui`: panel arayüzü, geniş sayfa, sahip tarafı ve giriş mesajı (Tamamlananlar 26).
  - [x] `v0.2.0` yayını (2026-10-01, Tamamlananlar 27).
- [x] 9. Hosting temeli (2026-10-01'de alt adımlara bölündü; sonunda `v0.3.0`, Tamamlananlar 34). Turnstile 15. adıma,
      forwarded headers hosting seçimine kaldı (sitenin önüne CDN konursa).
  - [x] 9a. `chore/hosting-infra`: wwwroot + SPA fallback + önbellek, publish'te client, Serilog,
        DataProtection, rate limiter (Tamamlananlar 28).
  - [x] 9b. `fix/photo-upload-limits`: büyük telefon fotoğrafları, tür kararı cropper'da, HEIC mesajı
        (Tamamlananlar 29).
  - [x] 9c. `feat/remember-me`: "Beni hatırla" varsayılan işaretli, kayıttan sonraki oturum kalıcı
        (kullanıcı kararı 2026-10-01; Tamamlananlar 30).
  - [x] 9d. `feat/pwa-manifest`: manifest, mevcut logodan 192/512 + maskable ikonlar, apple-touch-icon,
        açık/koyu theme-color, favicon (Tamamlananlar 31; service worker 11. adımda).
  - [x] 9e. `feat/account-deletion`: hesap silme + dışa aktarma, admin'in kullanıcı silmesi, denetim
        kaydında anonimleştirme (Tamamlananlar 32).
  - [x] 9f. `feat/privacy-contact`: gizlilik + iletişim sayfaları, footer linkleri, kayıtta zorunlu kutu
        (Tamamlananlar 33). İşletmeci adı ve e-posta yayın öncesi doldurulacak.
  - [x] `v0.3.0` yayını ve push (2026-10-01, Tamamlananlar 34).
- [x] 8b. `tests/e2e` (Playwright; #34, 2026-10-04, Tamamlananlar 69).
- [x] 10. ~~ImageSharp kararı~~ (Community lisansı, 2026-09-30) → ~~CI Release~~ → `release.yml` (#21,
      2026-10-02, Tamamlananlar 48; ilk gerçek koşusu bir sonraki etikette).
- [ ] 11. ~~Hosting seçimi~~ (MonsterASP.NET, 2026-10-02; `v0.4.0` canlıda, Tamamlananlar 50) →
      ~~alan adı~~ (coinvitrine.com, ~~`OPERATOR`~~, ~~e-posta~~, 2026-10-03, Tamamlananlar 51) →
      ~~Impressum kararı~~ (2026-10-03: şimdilik yok, Açık konular 14) → ~~elle ilk yayın `v1.0.0`~~ (etiket 2026-10-03,
      Tamamlananlar 52) → service worker → ~~otomatik deploy~~ (onaylı pipeline, 2026-10-03,
      Tamamlananlar 53).
- [ ] 13. Sosyal A: takas / istek listesi, bağımsız profil, takip, feed.
- [ ] 14. Bildirim + Web Push.
- [ ] 15. Yorum + şikayet + engelleme + e-posta doğrulama; yönetici paneline "Şikayetler" ve "Yorumlar"
      bölümleri eklenir (panelin kendisi 12. adımda). Turnstile giriş formuna da (Açık konular 16).
      E-posta doğrulama 2026-10-06'da yapıldı (Tamamlananlar 88); sıradaki parça şifre sıfırlama (aynı altyapı).
- [ ] 16. Mağaza: TWA → gerekirse Capacitor → iOS.
- [ ] 17. Koşullu: container/PaaS, yalnızca tetikleyiciyle.
- [ ] 18. **Euro dışı coin'ler** (kullanıcı 2026-10-05'te not ettirdi; ayrıntı Açık konular 10): coin
      ekleme sayfasının başında "Euro coin / Diğer coin" seçimi; Euro bugünkü form, Diğer serbest değer ve
      para birimi, tüm ülkeler (`Intl.DisplayNames`), yüz adları "Ön yüz / Arka yüz" (veritabanındaki iki yüz
      yeri aynen, etiketler türe göre). **Diğer coin'de iki yüzün fotoğrafı zorunlu** (standart bir ortak yüz
      yok); bunun için sadece `Publishing/PublicationRules.IsPhotographed` değişir. Fotoğrafsız diğer coin'in
      yer tutucusu bugünkü genel çizim (`CoinPlaceholder`).
- [ ] 19. **Güvenlik testleri** (kullanıcı 2026-10-06'da ekletti; `v1.5.1`'den sonraki sürümün gündemi). Amaç bir
      kerelik pentest değil, açıkların bir daha açılmamasını sağlayan kalıcı testler + otomatik tarama. Sıra:
  - [x] 19a. CodeQL "Default setup" (2026-10-06, kullanıcı açtı; C#, TypeScript, Actions; bulgular
        Tamamlananlar 79).
  - [x] 19b. **Yetki matrisi** (2026-10-06, Tamamlananlar 80; `AuthorizationMatrixTests`): her uç için
        beklenen sonuç tablosu (yabancı kullanıcı 404, girişsiz 401, admin olmayan 403, görünürlük). Tabloda
        olmayan yeni bir uç testi kırar (IDOR'a karşı en etkili koruma).
  - [x] 19c. (2026-10-06, Tamamlananlar 81; paylaşım linkinin harf duyarsızlığı bulundu ve düzeltildi)
        Hedefli kötüye kullanım testleri: mass assignment (gövdede `ownerId`, başkasının
        `collectionId`'si, fazladan alanlar), dosya yükleme (uzantısı JPEG olan SVG/HTML, küçük dosyada dev
        piksel boyutu, bozuk başlık), girdi parametreleri (`search`, `sort`, `countryOrder`, `owner`),
        paylaşım anahtarı (yanlış, kısa, başka koleksiyonun; görünürlük değişince eskisi çalışmaz).
  - [x] 19d. CI'da OWASP ZAP baseline (pasif) taraması, e2e'nin lokal yayın derlemesine karşı (Production +
        HTTPS), rapor artefakt (2026-10-06, Tamamlananlar 82–83; kabul edilmeyen bulgu CI'ı ve yayını
        kırar). **Canlı siteye tarama yok** (paylaşımlı hosting şartları, rate limit). İlk raporda tam CSP
        eksikliği beklenir (Açık konular 17).
  - [x] 19e. Ara sıra elle, lokal ortamda aktif tarama ya da kısa bir manuel pentest oturumu; bulunan her şey
        19b–19c'deki testlere eklenir. (İlk tur 2026-10-06: elle oturum, Tamamlananlar 84, 1 orta + 2 düşük bulgu
        düzeltildi; aktif ZAP elle başlatılır, ilk taraması temiz, Tamamlananlar 85. Ara sıra tekrarlanır.) Fuzzing şimdilik yok (getirisi düşük, testleri yavaşlatır).
- [x] 20. **Fotoğraf alanı: kullanıcıya göster, admin ayarlasın** (kullanıcı 2026-10-07'de ekletti; aynı gün
      `feat/photo-quota-setting`'te yapıldı, Tamamlananlar 91; aşağısı yapılmadan önceki plan). Önceden kota sunucu ayarındaydı (`PhotoStorage:UserQuotaBytes`, 300 MB; değiştirmek
      `web.config` + yeniden başlatma ister), kullanıcı kullanımını hiçbir yerde görmüyor (sadece dolunca
      `quota_exceeded`), admin kullanıcı detayında görüyor. Önerilen (2026-10-07 sohbetinde konuşuldu, kodlamadan
      önce kullanıcıyla netleşir, ekranlar önce mockup'la):
  - Kullanıcı: Ayarlar > Hesap'ın başında "Fotoğraf alanı" bölümü (doluluk çubuğu, "45 MB / 300 MB
        kullanıldı · 255 MB kaldı"); ana sayfa panosuna değil. Kendi kullanımı için yeni bir API ucu (yetki
        matrisine satırıyla).
  - Admin: kota `SiteSettings`'e taşınır (migration başlangıç değeri 300 MB, literal), Genel ayarlar'da üçüncü
        kart "Fotoğraflar" (Genel bakış'taki fotoğraflar ikonu ve rengi), MB cinsinden, önerilen aralık
        10–10.000 (kullanıcı 50–2000 seçti); değişiklik denetim kaydına (`SettingChanged`, `settings.names` çevirisi). Düşürmek hiçbir
        şeyi silmez, sınırın üstündeki kullanıcı yer açana kadar yükleyemez (doğrulanmamış hesabın coin sınırı
        gibi). `PhotoStorage:UserQuotaBytes` ayarı kalkar (sunucudaki `web.config`'te varsa yok sayılır),
        `HostingTests`'teki kota testi site ayarıyla yazılır (`SiteSettingsCollection`).
  - Kararlar: ayrı branch `feat/photo-quota-setting`; kaydetmeden önce "bu değerle şu kadar kullanıcı sınırın
        üstünde kalır" bilgisi var (kullanıcı kararı).

**Yeniden sıralama (2026-09-30, kullanıcıyla):** Değerlendirme admin'i hosting'den sonra ve arayüzsüz
(sadece JSON uçları), arayüzü de şikayet kuyruğuyla 15. adımda öneriyordu. Değişti, çünkü:
(1) herkese açık koleksiyonlarda kullanıcı metni ve fotoğrafı yayının ilk gününden var; "koleksiyonu gizle"
ve "kullanıcıyı kilitle" canlıda hemen gerekebilir, hosting DB panelinden elle SQL yazmak zahmetli ve
hataya açık; (2) Swagger sadece Development'ta, arayüzsüz uçlar production'da antiforgery token'lı elle
isteklerle kullanılamaz; (3) ilk admin atama yolu ilk kurulumda denenmiş olmalı. Panelin arayüzü yeni ve
lazy bir alan, uçları policy arkasında: canlıya eklemek düşük riskli. 15. adımı büyük yapan panel değil,
mevcut kuralları değiştiren yorum/şikayet/e-posta doğrulama. Admin uçları bir erişim matrisi olduğu için
önce API testleri (8a) yapıldı.

## Aksiyon planı (inceleme 2026-10-02)

2026-10-02'deki kapsamlı incelemeden (Tamamlananlar 35) çıkan işler. **Ayrıntı GitHub issue'larında**
(bulgular, kanıt, etki, öneri; Türkçe), burası sırayı ve durumu tutar: yeni sohbet GitHub'a bakmadan
buradan okur, işe başlarken ilgili issue açılır. Her iş kendi branch'inde (adı aşağıda, iş netleşince
değişebilir); commit mesajına `Closes #N` yazılır, `main` push edilince issue kendiliğinden kapanır.
Bittiğinde satırın kutusu işaretlenir. Etiketler `P0`–`P2` + konu; P0'lar `v1.0.0` milestone'unda.

- **P0, ilk yayından (hosting, `v1.0.0`) önce:**
  - [x] [#10](https://github.com/halid-ali/coin-portal/issues/10) S `fix/spa-fallback-dotted-paths`: noktalı adreslerde (`/u/ayse.yilmaz`) SPA fallback 404 veriyor (Tamamlananlar 36).
  - [x] [#11](https://github.com/halid-ali/coin-portal/issues/11) M `feat/security-headers`: güvenlik başlıkları, HSTS, API yanıtlarında `no-store` (Tamamlananlar 41).
  - [x] [#12](https://github.com/halid-ali/coin-portal/issues/12) S `fix/login-lockout-disclosure`: giriş kilidinin kötüye kullanımı ve 423'ün hesabı ifşa etmesi (Tamamlananlar 37; kilit kuralı aynen, Açık konular 16).
  - [x] [#13](https://github.com/halid-ali/coin-portal/issues/13) M `fix/moderation-lock-scope`: moderasyon kilidi coin taşıma ve silmeyi de kapsamalı (Tamamlananlar 39).
  - [x] [#14](https://github.com/halid-ali/coin-portal/issues/14) M `fix/abuse-limits`: görsel işleme belleği, kullanıcı başına satır ve yazma sınırları (Tamamlananlar 42).
  - [x] [#15](https://github.com/halid-ali/coin-portal/issues/15) S `fix/account-deletion-files`: hesap silmede fotoğraf klasörünün kesin silinmesi (Tamamlananlar 38; süpürme #27'de).
  - [x] [#16](https://github.com/halid-ali/coin-portal/issues/16) M `fix/collection-delete-safety`: koleksiyon silme ve kayıtta veri bütünlüğü (Tamamlananlar 40).
  - [x] [#17](https://github.com/halid-ali/coin-portal/issues/17) M `chore/privacy-policy-sync`: gizlilik metnini kodla eşitle, `OPERATOR`'ı doldur (Tamamlananlar 45; `OPERATOR` kullanıcı kararıyla yayın öncesine kaldı).
  - [x] [#18](https://github.com/halid-ali/coin-portal/issues/18) M `feat/terms-of-use`: kullanım şartları ve içerik kuralları (Tamamlananlar 46; Impressum kararı ayrı, Açık konular 14).
  - [x] [#19](https://github.com/halid-ali/coin-portal/issues/19) M `feat/startup-self-check`: açılışta ayar ve klasör kontrolü, SQL retry, yanıt sıkıştırması (Tamamlananlar 43).
  - [x] [#20](https://github.com/halid-ali/coin-portal/issues/20) M `chore/docs-sync`: yayın kontrol listesi eksikleri ve eskimiş doküman satırları (Tamamlananlar 47).
  - [x] [#21](https://github.com/halid-ali/coin-portal/issues/21) L `chore/release-workflow`: `release.yml` ve yayın zinciri (yol haritası 10; Tamamlananlar 48).
- **P1, ilk yayından hemen sonraki sürümler:**
  - [x] [#22](https://github.com/halid-ali/coin-portal/issues/22) M `fix/collection-search-paging`: arama kutusu ve sayfalama hataları (Tamamlananlar 54; ek: boş koleksiyonda filtre kartı yok).
  - [x] [#23](https://github.com/halid-ali/coin-portal/issues/23) M `fix/dialog-close-and-unsaved`: Esc ile kapanan pencere, kaydedilmemiş değişiklikler (Tamamlananlar 55).
  - [x] [#24](https://github.com/halid-ali/coin-portal/issues/24) M `feat/form-accessibility`: form hatalarının ekran okuyucuya bağlanması (Tamamlananlar 57).
  - [x] [#25](https://github.com/halid-ali/coin-portal/issues/25) M `fix/a11y-keyboard-contrast`: odak halkası kontrastı, odak kaybı, hesap menüsü (Tamamlananlar 58; kenarlık #35'e ayrıldı).
  - [x] [#26](https://github.com/halid-ali/coin-portal/issues/26) M `fix/client-auth-and-errors`: birbirini ezen ayar güncellemeleri, kodlu hataların eşlenmesi (Tamamlananlar 56).
  - [x] [#27](https://github.com/halid-ali/coin-portal/issues/27) M `fix/photo-storage-robustness`: yetim fotoğraf klasörleri, yükleme hata yolları (Tamamlananlar 61; ek: admin panelinde disk istatistikleri).
  - [x] [#28](https://github.com/halid-ali/coin-portal/issues/28) M `fix/i18n-wording`: arayüze sızan İngilizce sunucu mesajları, terim düzeltmeleri (Tamamlananlar 62).
  - [x] [#29](https://github.com/halid-ali/coin-portal/issues/29) L `chore/api-test-gaps`: API test boşlukları (cookie bayrakları, antiforgery, fotoğraf kodları) (Tamamlananlar 63).
  - [x] [#30](https://github.com/halid-ali/coin-portal/issues/30) L `chore/client-unit-tests`: client birim testleri (Angular 22'den önce) (Tamamlananlar 64; testler Esc hatasını buldu).
- **P2, planlı:**
  - [x] [#31](https://github.com/halid-ali/coin-portal/issues/31) M `chore/a11y-sweep`: kalan erişilebilirlik ayrıntıları, CLAUDE.md'ye a11y kuralı (Tamamlananlar 68).
  - [x] [#32](https://github.com/halid-ali/coin-portal/issues/32) M `fix/ux-polish`: 404 sayfası, açılış iskeleti, indirme hata geri bildirimi (Tamamlananlar 67).
  - [x] [#33](https://github.com/halid-ali/coin-portal/issues/33) S `fix/public-page-weight`: girişsiz sayfaların ağırlığı (Tamamlananlar 66).
  - [x] [#34](https://github.com/halid-ali/coin-portal/issues/34) L `feat/e2e-playwright`: Playwright e2e (yol haritası 8b; Tamamlananlar 69).

Notlar: Issue'lar incelemenin ham bulgu kimliklerini (`api-auth-1` gibi) taşır; tam rapor lokal
`.notes/reviews/2026-10-02-full-review.md`. Bilgi seviyesindeki 89 bulgu doğrulanmadı ve hiçbir işe
bağlanmadı; sadece o raporda. Açık konular ve yayın öncesi listesine dokunan düzeltmeler (6 ve 11'in
kısmen yeniden açılması, 12'nin yeniden yazılması, eksik kontrol listesi maddeleri) #20'de yapılır.

## Sıradaki adım

**Sıradaki iş:** fotoğraf alanı (yol haritası 20, Tamamlananlar 91) bitti; `main`'e alınıp görsel
düzeltmelerle (90) birlikte bir sonraki sürüme girer (yayında migration `UserQuota` açılışta uygulanır,
onaydan önce veritabanı yedeği). Ondan sonra e-posta doğrulama (`v1.7.0` ile yayında, Tamamlananlar 88–89) üzerine **şifre sıfırlama**
(kullanıcıyla kararlaştırıldı, 2026-10-07): ayrı branch `feat/password-reset`, aynı e-posta altyapısı; "şifremi
unuttum" her adres için aynı cevabı verir (Açık konular 24), sıfırlama linki e-postayı da doğrulamış sayılabilir. Güvenlik testleri (yol haritası 19)
bitti ve `v1.6.0` ile yayında (Tamamlananlar 79–87): ~~19a CodeQL~~ → ~~19b yetki matrisi~~ → ~~19c kötüye
kullanım testleri~~ → ~~19d ZAP~~ → ~~19e elle tarama~~. Elle aktif ZAP taraması ve pentest ara sıra tekrarlanır.

**P2, kullanıcıyla 2026-10-04'te kararlaştırılan sıra (aynı sohbette):** ~~#33 girişsiz sayfaların ağırlığı~~
(Tamamlananlar 66) → ~~#32 UX~~ (Tamamlananlar 67) → ~~#31 a11y~~ (Tamamlananlar 68) → ~~#34 e2e~~
(Tamamlananlar 69). **P2 bitti ve `v1.3.0` ile yayında** (2026-10-04, Tamamlananlar 71); P1 `v1.1.0` ve
`v1.2.0`'da (#22–#30). Aksiyon planı (2026-10-02 incelemesi) tamamen kapandı; sıradaki iş kullanıcıyla seçilir. Diğer adaylar (Angular 22, profil düzenleme, watermark) sonraki sohbetlerde; logo ve ana sayfa bitti ve `v1.4.0` ile yayında (Tamamlananlar 72–74); 2026-10-07'deki görsel düzeltmeler turu Tamamlananlar 90. Saklanan coin ikonları: `.notes/designs/coin-icons/`. Diğerleri:

- **Yayın sonrası küçük işler:**
  - Site birkaç hafta sorunsuz çalışınca `Hsts__MaxAgeDays=365` (sunucudaki `web.config`).
  - Pipeline birkaç sürüm sorunsuz çalışınca onay adımı kaldırılabilir (`production` ortamında
    "Required reviewers"); karar kullanıcının. (`v1.1.0`–`v1.5.1` sorunsuz.)
  - ~~Yetim süpürmenin canlı sonucu~~ (kullanıcı 2026-10-04'te baktı, çalışıyor).
  - Esc düzeltmesi (Tamamlananlar 64) canlıda bir kez denenir (kırpma penceresi). 2026-10-04: denenemedi,
    şirket bilgisayarından site açılmıyor (Defender), telefonda Esc yok; masaüstü bir tarayıcıda bakılır.
- **P1 işleri** ("Aksiyon planı"; sıra kullanıcıyla 2026-10-04'te kararlaştırıldı): ~~#22~~ → ~~#23~~ →
  ~~#26~~ → ~~#24~~ → ~~#25~~ → ~~**`v1.1.0`**~~ (2026-10-04) → ~~#27 fotoğraf depolama~~ →
  ~~#28 çeviriler~~ → ~~#29 API testleri~~ → ~~#30 client testleri~~ → ~~**`v1.2.0`**~~ (2026-10-04).
- ~~**8b** e2e (#34)~~ (Tamamlananlar 69). **Açık konular 15** (`piscina`): 2026-10-02'de Angular 21'in son sürümü (21.2.24) hâlâ
  5.2.0 getiriyor; çözüm Angular 22 yükseltmesi (Node ön koşuluyla, aşağıda 5).

Alt adımlar ve kullanıcı kararları "Yol haritası"nda. Panel için kullanıcının bir sonraki geri bildirimleri de
buraya.

Diğer adaylar (kullanıcı 2026-09-30'da ayrıca logo çalışmasını ve Angular 22 yükseltmesini andı;
2026-09-28'de watermark "biraz daha ertelensin" dendi):

1. **Watermark** (Açık konular 8): kararlar bekliyor (içerik, konum, saydamlık, sadece herkese açık
   fotoğraflara mı).
2. **Görünüm üzerinde çalışmaya devam** (kullanıcı 2026-09-28'de "sitenin görünümü üzerinde çalışalım"
   dedi; koyu tema ve tema rengi bitti). Kullanıcı ayrı bir sohbette genel görsellerle ilgili birkaç
   düzeltme ve logo için ayrı bir çalışma yapmak istiyor. Genel düzeltmeler sohbeti 2026-09-28/29'da
   yapıldı ve bitti (Tamamlananlar 14); logo da bitti (Tamamlananlar 72). Akılda tutulacak (kullanıcı, 2026-09-29): koleksiyon sayfasındaki sahip
   aksiyonları (Linki kopyala / Düzenle / Sil) çoğalırsa ya da tasarım değişirse tek bir "⋯" (daha
   fazla) menüsüne toplanabilir; şimdilik telefonda ikon butonlar yetiyor.
3. **Profil bilgilerinin düzenlenmesi** (kullanıcı 2026-09-28'de kaydettirdi): Ayarlar > Profil şimdilik
   salt okunur. Hangi alanların değiştirilebileceğine kullanıcıyla karar verilecek (isim/soyisim kolay;
   kullanıcı adı paylaşım linklerini `/u/…` bozar; e-posta doğrulama ister; doğum tarihi 18+ kuralına
   bağlı). Ayarlar'da ayrıca Güvenlik (parola değiştirme) bölümü düşünülüyor.
4. Diğer adaylar (sıra değişebilir): gelişmiş filtreler, istatistikler, referans katalog / eksik listesi.
5. **Angular 22'ye yükseltme** (2026-09-29'da Dependabot gösterdi): `ng update @angular/core @angular/cli`
   ile ayrı bir branch'te, Vitest 5 ve jsdom 30 ile birlikte; testler ve görsel kontrol. Dependabot bu
   major sürümleri artık önermiyor, takip burada. **Ön koşul:** Angular 22 ve jsdom 30 Node ≥ 22.22.3 ister,
   geliştirme makinesi 22.19.0 (Node güncellenir; README'deki sürüm ve CI'daki Node 22 kontrol edilir).
   `npm outdated` motor filtresi yüzünden jsdom 30'u göstermeyebilir. Angular 21 2026-06'dan beri LTS'de,
   LTS 2027-06'da biter. `piscina` uyarısını da bu yükseltme kapatır (Açık konular 15).

## Koleksiyonlar ve paylaşım: kararlar

Kararlar (2026-09-27, kullanıcıyla):

- **Kullanıcı birden fazla koleksiyon oluşturabilir; görünürlük koleksiyon başına.** Amaç ileride Euro
  dışı ve antika coin'leri de ayrı koleksiyonlarda tutabilmek (bkz. Açık konular 10).
- **1. aşama – `feat/collections` (tamamlandı, bkz. Tamamlananlar 9):** `Collections` tablosu (sahip, ad, açıklama), her coin bir koleksiyona
  bağlı. Migration her kullanıcıya "Koleksiyonum" açıp mevcut coin'leri oraya taşır; yeni kayıtta da
  otomatik açılır. "Koleksiyonlarım" sayfası (kapak fotoğrafı, coin sayısı), koleksiyon oluşturma /
  yeniden adlandırma / silme, koleksiyon sayfası (mevcut liste/ızgara), coin formunda koleksiyon seçimi
  (taşıma). Fotoğraf kotası kullanıcı başına kalır.
  - **Silme:** Onay penceresinde koleksiyonun adı yazılmadan silinemez (boş olsa da). İçinde coin varsa
    seçenek: coin'leri başka koleksiyona taşı ya da coin'lerle (ve fotoğraflarıyla) birlikte sil.
    Kullanıcının tek koleksiyonu silinemez.
- **2. aşama – `feat/sharing` (tamamlandı, bkz. Tamamlananlar 10):** Koleksiyon başına görünürlük: Özel (varsayılan) / Sadece linkle (gizli,
  tahmin edilemeyen `/s/…` linki, yenilenebilir, Keşfet'te görünmez) / Herkese açık. Profil sayfası
  `/u/{kullanıcıadı}` (sadece kullanıcı adı görünür; ad, e-posta, doğum tarihi asla). Herkese açık
  koleksiyonlar giriş yapmadan da görülebilir, salt okunur. Keşfet: herkese açık koleksiyonlardaki tüm
  coin'ler, kullanıcı filtresiyle (zorunlu gereksinimdeki "kullanıcı filtresi"). Fotoğraf erişimi
  görünürlüğe göre; aşama sonunda güvenlik gözden geçirmesi. Watermark bu aşamayla konuşulur
  (Açık konular 8).
- Varsayılanlar (2026-09-27): profil `/u/{kullanıcı}`, herkese açık koleksiyon `/u/{kullanıcı}/{id}`,
  gizli link `/s/{anahtar}`, Keşfet `/explore`; "sadece linkle"den çıkınca link iptal, tekrar
  açılınca yeni link; herkese açık koleksiyonu olmayan profil 404.

## Herkese açık koleksiyon kuralı: kararlar

Kararlar (2026-10-05, kullanıcıyla). Gerekçe: site bir vitrin; fotoğrafsız coin'i yayına sokmak boş vitrin
sergilemek gibi.

- **Kural:** bir koleksiyon ancak bütün coin'lerinin fotoğrafı varsa ve en az eşik kadar fotoğraflı coin'i
  varsa Herkese açık olabilir. Sayılan coin satırıdır, adet (`Quantity`) değil.
- **Fotoğraflı coin = ulusal yüzünün fotoğrafı olan coin.** Euro'da farklı olan yüz ulusal yüz, ortak yüz
  her ülkede aynı; sadece ortak yüzü olan coin sayılmaz.
- **Eşik site ayarı, varsayılan 10**, admin panelden değiştirir ("Genel ayarlar" bölümü), değişiklik
  denetim kaydına yazılır. Panel kaydetmeden önce bu eşiğin altında kalacak yayındaki koleksiyon sayısını
  gösterir.
- **Eşik yükseltilince** yayındaki koleksiyonlar hemen inmez; sayı kontrolü sadece sayıyı azaltan
  işlemlerde (coin silme, taşıma) yapılır. Eşiğin altındaki bir yayına coin eklemek onu indirmez.
- **Linkle paylaşılan ve Gizli koleksiyonlarda kural yok**; fotoğrafsız coin serbest. Fotoğrafsız coin'lerde
  değere göre coin ikonu gösterilir (3. aşama, Tamamlananlar 77).
- **Kati kural:** Public bir koleksiyonun şartını bozacak işlem uyarı penceresiyle sorulur; kullanıcı
  onaylarsa işlem yapılır ve koleksiyon **Linkle paylaşılana** geçer (yeni link; herkese açık adres çalışmaz,
  pencere bunu söyler). Kontrolü API yapar (`would_unpublish`), iki sekme açık olsa da kural delinmez.
- **Yeni coin fotoğraflarıyla tek istekte** kaydedilir: coin bir an bile fotoğrafsız var olmaz. Kullanıcının
  önerdiği "bir dakikalık süre + arka planda kontrol" yerine seçildi: arka plan zamanlayıcısı uygulama
  yeniden başlayınca kaybolur, kullanıcı beklemede kalır, yarış olur.
- **Yayına alma butonla** (otomatik değil): şartlar sağlanınca koleksiyon sayfasındaki uyarı "Hazır ·
  Herkese açık yap" olur; yayına almak bilinçli bir adım kalır.
- **Koleksiyon sayfasının başındaki uyarı her zaman görünür** (bilerek Gizli tutulan koleksiyonlarda da,
  kapatılamaz). Metin duruma göre: Gizli'de "linkle paylaşabilirsin" ipucu, Linkle paylaşılanda yok;
  "N coin eksik" fotoğrafsız filtresine götürür.
- **Fotoğrafsız filtresi** coin listesinde (sahip için).
- **Canlı veri:** migration kurala uymayan Public koleksiyonları Linkle paylaşılana çeker (canlıda 2
  kullanıcı, 2 coin; şimdi yapmak ucuz).
- **Gelecek:** Euro dışı coin'lerde iki yüz zorunlu (yol haritası 18, Açık konular 10).

## Çok dilli destek: kararlar

Kararlar (2026-09-28, kullanıcıyla):

- **Diller:** İngilizce (varsayılan, tarayıcı dili desteklenmiyorsa), Türkçe, Almanca, Bulgarca. Kaynak
  dil Türkçe (`tr.json`); diğer dosyalar ona göre, test eşliği denetler.
- **Kütüphane: Transloco** (kullanıcı biliyor). Angular'ın kendi i18n'i elendi: dil başına ayrı derleme
  ve `/tr/…` gibi URL ön ekleri, dil değişince sayfa yenilenmesi, `wwwroot`'ta dil başına SPA fallback ve
  paylaşım linklerinin (`/s/…`, `/u/…`) yönlendirilmesi gerekirdi. Transloco ile tek derleme, dil anında
  değişir, adresler dilden bağımsız (paylaşılan link herkese kendi dilinde açılır).
- **Dil seçimi:** hesaptaki dil > bu tarayıcıdaki son seçim > tarayıcı dili > İngilizce. Tercih hesaba
  kaydedilir (başka cihazda da aynı dil; ileride e-postalar da bu dilde). Kayıtta o anki dil hesaba yazılır;
  seed ve eski hesaplarda boş kalır (cihaz dili kullanılır, Ayarlar'da seçilince kaydedilir).
- **Ayarlar sayfası** kullanıcı isteğiyle eklendi, avatar menüsünden açılır; soldaki menü ileride
  Görünüm, Güvenlik vb. ile genişleyecek. Dil footer'dan (herkes) ve Ayarlar'dan değişir; girişliyse
  ikisi de hesaba kaydeder.
- **API arayüz metni üretmez** (hata kodları client'ta çevrilir). İstisna: kullanıcı adına oluşturulan
  içerik (ilk koleksiyon adı). `Accept-Language` kullanılmıyor, dil istekte açıkça gönderiliyor.
- **Çoğul:** Transloco'nun ICU eklentisi yerine küçük bir `plural` pipe'ı (`Intl.PluralRules`, anahtar
  altında `one`/`other`). Ek bağımlılık yok, Türkçe metinlerdeki kesme işaretleri ICU sözdizimiyle
  çakışmıyor.
- **Terimler** (araştırma: ECB ve Bulgaristan Merkez Bankası euro sayfaları, Alman darphaneleri MDM/BTN,
  YouTube/Google yerelleştirmeleri):
  - Almanca: "du" hitabı (hobi uygulaması, Türkçedeki "sen"e denk). Nennwert, nationale Seite / gemeinsame
    Seite (ECB), Münzzeichen, Gedenkmünze, "50 Cent", görünürlük Privat / Nur mit Link / Öffentlich.
  - Bulgarca: küçük harfli "вие" hitabı (Google/Microsoft bg arayüzlerindeki norm), butonlarda emir kipi
    (Запази, Изтрий, Отказ). Номинал, национална страна / обща страна (ECB, BNB), знак на монетния двор,
    възпоменателна монета; sentler "1 цент / 2–50 цента" (ECB ve BNB kullanımı; "стотинка" Bulgar
    paralarında yazıyor ama tüm ülkelerin coin'leri için "цент" daha tarafsız), link için "връзка".
  - İngilizce: national side / common side (ECB), Denomination (tabloda "Value"), Link only; "username",
    "email" (tire yok, ayrı yazılmaz; 2026-10-04).
  - Türkçe: "coin"in ekleri kesmeyle (coin'ler, coin'i; okunduğu gibi yazılmayan yabancı sözcük),
    kullanıcı adı kuralı "İngilizce harfler (ç, ğ, ı, ö, ş, ü olmadan)" (2026-10-04, #28).
  - Almanca paylaşım linki tek terimle "Link zum Teilen" (2026-10-04). Renk adları renk olarak
    ("Hellgrün", meyve adı "Limette" değil); Bulgarca Lime "Зелено" (TR "Yeşil" gibi; "Светлозелено"
    renk kartının sütununa sığmıyordu: 78,6 px, en geniş sığan "Тюркоазено" 68,6 px).
- **Çeviri kontrolü:** kullanıcı şu an anadili konuşan birine kontrol ettiremiyor, Claude'a güveniyor.
  Yayından önce Almanca ve Bulgarca metinlerin bir anadil konuşanına gösterilmesi önerilir (Açık konular 12).

## Görünüm ve tema: kararlar

Kararlar (2026-09-28, kullanıcıyla):

- **Üç seçenek: Açık / Koyu / Sistem.** Navbar butonu sadece açık ↔ koyu geçer (Sistem'deyken görünenin
  tersine); Sistem'e dönmek Ayarlar'dan. Üç durumlu döngü sezgisel bulunmadı.
- **Tercih hesapta**, dil gibi: hesaptaki tema > bu tarayıcıdaki son seçim (`localStorage`
  `coinportal.theme`) > Sistem. Hesapta null = hiç seçmedi (tarayıcının seçimi geçerli), `System` =
  açıkça "cihazı izle". Girişsiz kullanıcı da butonu kullanır, seçim tarayıcıda kalır. Kayıtta tema
  gönderilmez (dil ilk koleksiyonun adı için gönderiliyor; temada gerek yok).
- **Ayarlar > Görünüm:** görünümle ilgili ayarlar tek bölümde (şimdilik dil ve tema). Tema seçici küçük
  önizlemeli kartlar (kullanıcı onayı).
- **Renkler token'la** (Claude'un teknik seçimi): her class'a `dark:` eklemek template'leri şişirirdi.
  Tailwind paletinin yerine tema duyarlı ölçekler; koyu temada ölçek ters döner (düşük adımlar koyu
  zemin/tonlar, yüksek adımlar açık metin), `shade-0` kart yüzeyi. Ton ayarı tek yerden (`styles.css`).
- **Tema rengi** (2026-09-28, kullanıcıyla): 7 renk: Altın (amber, varsayılan), Camgöbeği (teal), Mavi,
  Çivit, Mor, Gül (rose), Yeşil (lime; green yerine kullanıcı seçti). Emerald, sky ve red bilerek yok:
  başarı, bilgi ve tehlike mesajlarıyla karışırdı. Seçim sadece Ayarlar > Görünüm'de (navbar butonu yok),
  tercih tema gibi hesapta (hesap > tarayıcı > Altın).
- **Birincil buton renge uyar, logo uymaz** (kullanıcı kararı). Logo 2026-10-04'ten beri temaya göre iki renkli
  (Tamamlananlar 72), tema rengiyle değişmez.
  Buton dolgusu iki temada aynı: amber/teal/lime açık dolgu + koyu yazı, blue/indigo/violet/rose 600 dolgu
  + beyaz yazı (hover bir ton koyu), okunabilirlik için.
- **Kaydırma çubuğunun yeri hep ayrılır** (2026-09-28, kullanıcı onayı): `scrollbar-gutter: stable`.
  `overflow-y: scroll` (hep görünen boş çubuk) ve `both-edges` (iki kenarda boşluk) elendi. Kısa
  sayfalarda sağda zemin renginde ince bir şerit kalıyor; telefonda çubuk içeriğin üstünde, etkisi yok.

## Yönetici paneli: kararlar

Kararlar (2026-09-30, kullanıcıyla):

- **Ne olduğu:** Sadece `Admin` rolüne açık, uygulama çapında bir **moderasyon ve işletim paneli**:
  istatistikler, kullanıcılar (kilitleme), herkese açık ve linkle paylaşılan koleksiyonlar (gizleme),
  denetim kaydı; sonra şikayetler ve yorumlar. Tüm verilerin yönetimi (kullanıcının coin'ini düzenlemek
  gibi) değil: moderasyon bunu gerektirmiyor, olağanüstü veri düzeltmesi veritabanından yapılır. Her
  yeni özellik panele sadece moderasyon ihtiyacı kadar girer. Her kullanıcının kendi paneli zaten var
  (Koleksiyonlarım, Ayarlar).
- **Giriş noktası:** avatar menüsünde en üstte "Yönetim", altında ayırıcı çizgi, sonra herkesin gördüğü
  öğeler; mobil menüde hesap bölümünün en üstünde aynı düzen. Link sadece admin'e görünür; navbar'da
  yok. Adresi gizlemek güvenlik sağlamaz (repo ve JS paketi açık), güvenlik API'deki rol kontrolünde.
- **Rol:** sadece ayardan (`Admin:UserIds`), açılışta senkron; panelden rol verilmez (panelde ele
  geçirilen bir oturum başkasını admin yapamaz, tek admin için rol ekranı gereksiz). Kullanıcı adı değil
  Id: boşta kalan bir ad (hiç kaydolmamış ya da hesabı silinmiş) başkası tarafından kaydedilip admin
  olabilirdi. Komut satırı anahtarı (IIS'te çalışmaz) ve elle `INSERT` elendi. Rol migration'la değil
  açılışta oluşturulur (senkron zaten açılışta çalışıyor, ayrı migration gereksiz; Claude'un teknik
  seçimi, plandan sapma).
- **Gizli içerik:** admin görmez. Kullanıcının koleksiyon/coin sayılarını ve kota kullanımını görür,
  içerik olarak sadece Public ve Unlisted koleksiyonları. Görünürlük kuralı `CollectionAccess`'te tek
  yerde kalır.
- **Koleksiyonu gizle, kilitli:** admin herkese açık ya da linkle paylaşılan bir koleksiyonu Private
  yapar ve kilitler; kilit kalkana kadar sahibi yayınlayamaz (API kodlu hata, arayüzde "Yönetici
  tarafından gizlendi"). Kilitsiz gizleme içeriği bir tıkla geri getirmeye izin verirdi.
  Kilit coin'leri de kapsar (2026-10-02, #13): kilit sürdükçe coin'ler başka koleksiyona taşınamaz ve
  koleksiyon coin'leri taşınarak silinemez (taşıma içeriği yeniden yayınlardı); coin'leriyle birlikte
  silmek serbest (içerik yok olur). Coin yerinde düzenlenebilir.
- **Giriş zamanları:** `LastSeenAtUtc` (son görülme; `me` isteğinde en fazla saatte bir; admin listesinde,
  sıralanabilir), `LastSignInAtUtc` (son giriş; admin detayında), `PreviousSignInAtUtc` (önceki giriş;
  kullanıcının Ayarlar > Profil'inde, bankalardaki gibi; yoksa "Kayıtlı önceki giriş yok"). Son giriş tek
  başına yetmiyordu: 14 günlük kayan cookie yüzünden aktif kullanıcı da haftalarca giriş yapmayabilir,
  profilde ise "son giriş" hep "şimdi" olur. Boş değer için önce "Bu ilk oturumun" düşünülmüştü; bu
  özellikten önce açılmış hesapların ilk girişinde de önceki giriş boş olduğu için yanlış olurdu, metin
  nötr (Claude'un düzeltmesi, 2026-10-01).
- **Dil:** panel de dört dilde (kullanıcının kararı). Sadece EN/TR + İngilizce yedek dil, arayüz DE/BG
  iken aynı ekranda iki dil gösteriyordu; hesaba kayıtlı ayrı bir panel dili de konuşuldu (sütun, rotaya
  göre dil geçişi, footer seçicisinin panelde başka anlamı). Dört dil bu belirsizliği kaldırıyor, mevcut
  "dört dosyaya birden" kuralı ve eşlik testi aynen işliyor; bedeli yeni dillerde panel metinleri de
  (~60–100 anahtar). Panel metinleri ayrı, lazy dosyalarda (`i18n/admin/<dil>.json`, Transloco scope):
  normal kullanıcının indirdiği dil dosyası büyümez.
- **Kilitli kullanıcının içeriği** (2026-10-01): admin kilidi sürdükçe kullanıcının paylaşılan
  koleksiyonları herkesten gizlenir, kilit açılınca geri gelir (veri değişmez; kural `CollectionAccess`'te).
  Kilit sadece girişi engelleseydi, spam yapan birinin içeriği ayrıca tek tek gizlenmek zorundaydı. 5
  hatalı girişin geçici kilidi içeriği etkilemez.
- **Not (gerekçe):** kilitleme ve gizlemede isteğe bağlı, en fazla 500 karakter, **sadece denetim
  kaydında**. Kullanıcıya gösterilmesi (çevrilmeyen serbest metin) bildirim adımına (14) kaldı.
- **Admin'in gördüğü kullanıcı bilgisi:** listede kullanıcı adı ve e-posta (iletişim için), detayda ek
  olarak ad soyad; doğum tarihi, dil, tema gösterilmez.
- **Admin'ler panelden kilitlenemez** (Claude'un sadeleştirmesi, kullanıcı onayladı): "kendini ve son
  admini kilitleyemez" kuralının yerine; admin'ler zaten ayardan belirleniyor, durdurmak için ayardan
  çıkarılır.
- **Neden hosting'den önce ve arayüzlü:** "Yol haritası" bölümündeki "Yeniden sıralama" notu.
- **İçerik moderasyonu herkese, hesap işlemleri admin olmayanlara** (2026-10-01, kullanıcıyla): bir
  admin başka bir admin'in koleksiyonunu gizleyebilir; admin hesabı kilitlenemez (Discourse gibi
  sistemlerdeki yaklaşım: içerik kuralları herkes için, görevliye hesap işlemi yetkiyi almayı gerektirir).
  Panelde admin'in koleksiyonunda sahibinin yanında "Admin" rozeti (`ownerIsAdmin`), başka bir admin'in
  içeriğine dokunulduğu görülsün. Admin kendi koleksiyonunun kilidini kaldırabilir; bunu engellemek tek
  admin varken kilidi kaldırılamaz yapardı, denetim kaydı yeterli. Alternatif (admin içeriği de
  gizlenemez) elendi: uygunsuz içeriğe karşı tek yol ayardan çıkarıp yeniden başlatmak olurdu.
- **Geniş sayfa** (2026-10-01, kullanıcıyla; B seçeneği): soldaki menüyle 1024 px'lik kutuda kullanıcı
  tablosu dört dilde sığmıyordu (sabit sütunlar 702 px istiyordu, kullanıcı sütununa ~58 px kalıyordu).
  Kullanıcı "panel uygulamanın dar düzenini izlemesin" dedi; tam genişlik yerine 1280 px sınır seçildi
  (büyük monitörde satırlar okunamayacak kadar uzamasın), menü solda kaldı, tablolar `xl`'den, altında
  kartlar. Header ve footer da genişler, kenarlar hizalı kalır; düzen sayfa adı bilmez (rota
  `data: { pageWidth: 'wide' }` → `<html data-page-width>` → CSS değişkeni). "Menü üstte" ve "sınırsız
  genişlik" seçenekleri karşılaştırıldı.
- **Genel bakış kartları** (kullanıcı geri bildirimi): her kartta sağda anlamını simgeleyen ikon; renkler
  anlama göre sabit, tema renginden bağımsız ve iki temada okunaklı (kullanıcı: "renk teması ikonları
  değiştirmesin"). Rozeti olan anlamlarda rozetle aynı renk (herkese açık yeşil, linkle gök mavisi,
  kilitli/gizlenmiş kırmızı), coin altın (logo gibi).
- **Satırdaki "Gizle"** ikincil stilde (kırmızı yazı), her satırda kırmızı dolgu listeyi bağırgan
  yapıyordu; kırmızı dolgu onay penceresinde.

## Gizlilik ve iletişim: kararlar

Kararlar (2026-10-01, kullanıcıyla):

- **İşletmeci Almanya'da**, GDPR geçerli. Sayfalarda ad soyad ve e-posta görünür; posta adresi yok.
  **Impressum:** 2026-10-03'te kullanıcı kararıyla şimdilik yok (adres yayınlanmaz; gerekçe ve yeniden
  ele alma koşulları Açık konular 14).
- **İşletmeci Halid Ali, e-posta `contact@coinvitrine.com`** (2026-10-03, `OPERATOR`). Ad gerçek ad
  olmalı (veri sorumlusu); repoda ve sitede herkese açık olduğu kullanıcıya söylendi. Gizlilik metni
  sağlayıcıyı adıyla anar (MonsterASP.NET s.r.o.); iletişim e-postaları talebi cevaplamak için gerektiği sürece
  saklanır, sonra silinir (kullanıcı kararı: sabit süre yok, GDPR md. 13 ölçütle de karşılanır; pratikte eski
  e-postalar ara sıra silinir, md. 5/1-e).
- **Kayıtta işaretlenmesi zorunlu kutu** (bilgi metni + link yerine; kullanıcı daha resmi olanı seçti).
  2026-10-02'den beri aynı kutu kullanım şartlarını da kabul ettirir (#18, kullanıcı kararı); şartlar
  moderasyonun kurallarını kullanıcıya bildirir.
- Metinler hukuki danışmanlık değildir; Claude yazdı, kullanıcı yayından önce okuyacak. İletişim formu
  yok (site e-posta göndermiyor); GitHub reposu hata bildirimi için anılır.

## Hesap silme: kararlar

Kararlar (2026-10-01, kullanıcıyla):

- **Parolayla onay, hemen ve geri alınamaz.** Bekleme süresi (askıda hesap) elendi: zamanlanmış iş ister,
  paylaşımlı hosting'de ek karmaşa. Pencere önce dışa aktarmayı önerir.
- **Dışa aktarma ZIP: JSON + fotoğraflar** (en büyük boyut). Sadece JSON elendi: GDPR taşınabilirliği
  kullanıcının yüklediği her şeyi kapsar.
- **Admin kendi hesabını silemez**, önce `Admin:UserIds`'ten çıkarılır (kilitlemedeki kuralla aynı; son
  admin'in kendini silmesini de önler).
- **Silmeden sonra** ana sayfada bir kerelik bilgi mesajı.
- **"Verilerimi indir" düz indirme kalır** (2026-10-04, #32): tıklamada önce oturum kontrol edilir; sınır
  aşımı ve sunucu hatası tarayıcının indirme çubuğunda görünür. İki adımlı indirme (önce sunucuda hazırlama,
  hatalar sitede) elendi: geçici dosya ve temizlik ister, sınır nadiren aşılır.
- **Admin bir kullanıcıyı silerken** kullanıcı adını birebir yazar (koleksiyon silmedeki gibi); not isteğe
  bağlı. Admin'ler panelden silinemez.
- **Denetim kaydı:** kayıtlar kalır, silinen kullanıcının adları (hedef, koleksiyon, admin olarak) silinir
  (9. adım planındaki karar). Adminin serbest notu olduğu gibi kalır (içinde ad geçebilir; kullanıcı
  biliyor).

## Fotoğraflar

### Kararlar (2026-09-27)

Amaç: aynı kod lokalde ve hostingde çalışsın, publish fotoğraflara hiç dokunmasın; değişen tek şey ayar.

- **Coin başına en fazla 2 fotoğraf: ulusal yüz ve ortak yüz.** Ayrı `CoinPhotos` tablosu (`Side` alanı,
  coin + yüz başına tek kayıt). Tek fotoğraftan sonradan geçiş yapmak daha pahalı olacağı için baştan böyle.
  - **Adlar Euro terimleriyle:** `CoinSide.National` ("Ulusal yüz", ülkeye özgü) ve `CoinSide.Common`
    ("Ortak yüz", değerin yazdığı, tüm ülkelerde aynı). "Ön/arka yüz" (obverse/reverse) bilerek
    kullanılmıyor: insanlar bu terimleri iki taraf için de kullanıyor (kullanıcıyla netleştirildi).
  - **Varsayılan gösterilen taraf ulusal yüz** (listelerde thumbnail, tam ekranda ilk açılan, formda
    solda), çünkü aynı değerdeki coinleri birbirinden ayıran taraf o.
- **Saklama yeri yapılandırmadan:** `PhotoStorage:RootPath`.
  - Lokalde `App_Data/photos` (proje klasörüne göre), `.gitignore`'da ve `.csproj` ile publish dışı.
  - Hostingde mümkünse **site klasörünün dışında** mutlak bir yol (panel ortam değişkeni veya
    `appsettings.Production.json`). Sebep: Web Deploy'un "hedefteki fazla dosyaları sil" seçeneği veya
    klasörü temizleyen bir publish, uygulama klasörünün içindeki fotoğrafları siler.
  - Yedek plan: `App_Data` (IIS dışarıya sunmaz) + publish'te fazla dosyaları silme kapalı.
  - Kodda `IPhotoStorage` arayüzü + tek dosya sistemi uygulaması (ileride Blob/S3'e geçiş kolay olsun).
- **Adlandırma:** `photos/{ownerId}/{photoId}/{thumb|preview|full}.webp`, `photoId` GUID. Kullanıcının
  dosya adı hiçbir yerde kullanılmaz.
- **Format ve boyutlar:** Giriş JPG/PNG, çıktı **WebP** (kalite ~80). thumb 150x150, preview 600x600,
  full en fazla 1600x1600.
- **Sunum API üzerinden:** `GET api/coins/{id}/photos/{side}/{size}`, coin ile aynı erişim kuralı
  (sahibi, herkese açık koleksiyonlarda herkes, linkle paylaşılanlarda `s=` anahtarıyla; `CollectionAccess`). URL'de sürüm anahtarı (`?v=`),
  `Cache-Control: private, max-age=31536000, immutable` (`v`'siz istek `private, no-cache`). `wwwroot`
  altından statik sunum yok.
- **Yükleme akışı:**
  - Client ngx-image-cropper ile 1:1 kırpar, en fazla 1600x1600'e küçültüp multipart gönderir.
  - Server client'a güvenmez: görseli ImageSharp ile açarak doğrular (uzantı/content-type'a bakmaz),
    boyut ve piksel sınırı uygular, kare değilse ortadan kırpar, EXIF yönüne göre döndürüp EXIF/GPS'i
    temizler, üç boyutu üretir.
  - Dosyalar önce `.tmp` altına yazılır ve tek bir yeniden adlandırmayla yerine taşınır; sonra veritabanı
    satırı kaydedilir, kayıt başarısızsa yeni klasör silinir. Değiştirilen fotoğrafın eski dosyaları satır
    kaydedildikten sonra silinir. Fotoğraf veya coin silinince dosyalar satırdan sonra silinir; silinemeyen
    klasör Error logu (Tamamlananlar 38); geride kalanları günlük yetim süpürmesi siler (Tamamlananlar 61).
    Antiforgery multipart isteklerde de geçerli.
- **Sınırlar (yapılandırılabilir):** yükleme başına 10 MB (2026-10-01'den beri kırpılmış JPEG'e
  uygulanır, seçilen dosyaya değil; Tamamlananlar 29), kaynak en fazla 4000x4000 piksel ve aynı anda iki
  görsel (2026-10-02, Tamamlananlar 42; önce ~6000x6000), **kullanıcı başına 300 MB** (2026-10-07'den beri
  admin ayarı, 50–2000 MB, Tamamlananlar 91). Her fotoğrafın toplam bayt boyutu veritabanında tutulur, kota tek sorguyla kontrol edilir
  (yaklaşık: aynı anda yüklemeler birkaç görsel aşabilir).
  (Üç boyut birlikte ~250-350 KB, yani kota ~1000 fotoğraf.)
- **Görsel işleme kütüphanesi:** SixLabors ImageSharp 4.1.2 (tamamen managed, native bağımlılığı yok).
  Lisansı Six Labors Split License: yıllık geliri 1 milyon doların altındaki kullanıcılar için Apache 2.0.
  4.x derlemede lisans anahtarı arıyor; anahtarsız Release/publish derlemesi başarısız. Proje ücretsiz
  Community lisansı aldı (2026-09-30, Açık konular 1).
  Kütüphane sadece `IImageProcessor` arkasında, değiştirmek bir dosya + DI kaydı (bkz. Açık konular 1).
- **Kaydetme davranışı:** Formda fotoğraf değişiklikleri "Kaydet"e basınca uygulanır, "Vazgeç" hepsini
  geri alır (kullanıcı kararı).
- **Hatalar:** API fotoğraf hatalarında `code` döner (`file_missing`, `file_too_large`, `invalid_image`,
  `quota_exceeded`, `conflict`); client bunları Türkçe mesaja çevirir.

## Açık konular

1. ~~**ImageSharp lisans anahtarı**~~ (kapandı 2026-09-30): Six Labors ücretsiz Community lisansı verdi,
   ImageSharp'ta kalındı (SkiaSharp'a geçiş gerekmedi). Uygulama Tamamlananlar 21'de. Kalan tek iş
   **yenileme: lisans 2027-12-26'da biter.** Yeni anahtar https://licensing.sixlabors.com/ adresinden
   alınır; `src/api/sixlabors.lic` ve GitHub secret `SIXLABORS_LICENSE_KEY` birlikte güncellenir.
   Yenilenmezse `main`'deki CI (Release) ve publish kırılır; Debug geliştirme etkilenmez. Hatırlatma
   kullanıcının takviminde (2027-12-01).
2. ~~**Yayın izni**~~ (kapandı 2026-09-29): hobi projesi, kullanıcının kişisel GitHub hesabında public
   repo. Push yine kullanıcı onayıyla.
3. ~~**Hosting seçilmedi.**~~ (kapandı 2026-10-02): MonsterASP.NET Premium Single, Tamamlananlar 50.
4. GitHub: https://github.com/halid-ali/coin-portal (public, 2026-09-29'da boş oluşturuldu; remote `origin`).
   Push'ta etiketler ayrıca gönderilir (`git push origin vX.Y.Z`).
5. ~~**Production connection string**~~ (kapandı 2026-10-02): sunucudaki `web.config`'te ortam değişkeni;
   parola repoda ve lokal notlarda yok (Tamamlananlar 50).
6. ~~**Yayında SPA fallback**~~ (kapandı 2026-10-01): `SpaHosting`, Tamamlananlar 28.
7. ~~**Backend testleri yok.**~~ (kapandı 2026-09-30): `tests/api`, Tamamlananlar 22. e2e testleri
   (Playwright) 2026-10-04'te geldi (yol haritası 8b, Tamamlananlar 69).
8. **Fotoğraflara watermark (ileride, 2026-09-27'de konuşuldu):** Paylaşım 2026-09-27'den beri var, yani
   fotoğrafları başkaları da görebiliyor; karar bekliyor (Sıradaki adım 1). Kütüphane ImageSharp kaldı.
   - Önerilen yol: sunucuda, **hazır bir PNG** (yazı veya logo) yarı saydam olarak köşeye basılır. Bunun
     için ek kütüphane gerekmez (ImageSharp temel paketi ve SkiaSharp ikisi de görsel üst üste bindirir).
     `IImageProcessor` sözleşmesine eklenir.
   - Dinamik yazı (ör. "@kullanıcıadı") ImageSharp'ta ek paket ister (`ImageSharp.Drawing` + `Fonts`),
     SkiaSharp'ta dahili. Kütüphane kararı (Açık konular 1) bu seçeneği etkiler.
   - Sadece preview ve full boyutlarına basılır; 150 px thumbnail'de okunmaz.
   - Temiz bir ana kopya sunucuda saklanır, gösterilen boyutlar ondan üretilir. Böylece watermark
     değişirse fotoğraflar yeniden üretilebilir. Bedeli fotoğraf başına ~%30-50 fazla disk (kotaya yansır).
     Mevcut fotoğraflar için bir kerelik yeniden üretme işi gerekir (ana kopyası olmayanlar için full
     boyut ana kopya sayılabilir).
   - İstenirse sadece herkese açık fotoğraflara uygulanır.
   - Tarayıcıda (Canvas) eklemek ve sadece CSS ile bindirmek elendi: ilki API'ye doğrudan yüklemeyle
     atlatılabilir, ikincisi dosyayı korumaz.
   - Karar verilecekler: watermark içeriği (yazı/logo), konum, saydamlık, sadece herkese açıklara mı.
9. İleride: e-posta doğrulama ve şifre sıfırlama (e-postalar `PreferredLanguage` dilinde), kayıt formunda
   kullanıcı adı/e-posta müsaitlik kontrolü (kayıt ucunun e-postayı ele vermesini büyütür, bilinçli karar
   gerekir). Mobilde katlanabilir filtreler 2026-09-28'de, Register'ın ortak `applyServerErrors`'ı
   kullanması 2026-10-04'te (#26) yapıldı.
10. **Euro dışı, tedavülden kalkmış ve antika coin'ler (ileride, 2026-09-27'de kullanıcı istedi):**
    Birden fazla koleksiyon bunun için temel. Gerekecekler: koleksiyona bir "tür" alanı (Euro / diğer);
    nominalin genelleşmesi (şu an Euro değerleri enum'u, `CK_Coins_Denomination`), ülkenin genelleşmesi
    (şu an 25 Euro ihraççısı, `Countries` tablosu; tarihî ülkeler de gerekebilir), yılın genelleşmesi
    (şu an 1999 ve sonrası, `CK_Coins_Year`; antikalarda tahmini yıl/dönem), para birimi. Euro'ya özgü
    kurallar (ulusal/ortak yüz, 2 € hatıra) sadece Euro türünde geçerli olmalı.
    **2026-10-05 güncellemesi:** tür koleksiyonda değil coin'de düşünülüyor (coin ekleme sayfasında seçim,
    yol haritası 18). Herkese açık koleksiyon kuralı: Euro coin ulusal yüzüyle, diğer coin iki yüzüyle
    fotoğraflı sayılır; kural tek yerde (`PublicationRules`), tür gelince orası değişir. Tür alanı şimdi
    eklenmedi (ileride `Euro` varsayılanıyla eklemek kolay bir migration).
11. ~~**İstek sınırlama (rate limiting) yok**~~ (kapandı 2026-10-01): yerleşik rate limiter, Tamamlananlar
    28. Sınırlar bellekte (uygulama yeniden başlayınca sıfırlanır) ve IP başına: sitenin önüne CDN/proxy
    konursa `UseForwardedHeaders` + `KnownProxies` gerekir, yoksa herkes proxy'nin IP'siyle tek kovaya
    düşer.
12. **Çeviriler (2026-09-28):**
    - Almanca ve Bulgarca metinleri anadili konuşan biri henüz görmedi; yayından önce önerilir.
      Bulgarcada en emin olunmayanlar: hitap şekli (вие), buton kipi (emir), tablo kısaltmaları
      ("Год.", "Знак", "Възпом."), "тайна връзка" (gizli link).
    - Kullanıcının yazdığı içerik (coin başlıkları, koleksiyon adları) çevrilmez. Otomatik başlık önerisi
      o anki dilde üretilir (ör. "2 € · Deutschland · 2006"); dev seed içeriği Türkçe.
    - ~~Identity'nin bazı parola hataları API'den İngilizce gelir ve öyle gösterilir~~ (kapandı 2026-10-04,
      #28): API'nin İngilizce mesajı artık hiç gösterilmez (Tamamlananlar 62).
    - #28'de (2026-10-04) inceleme bulgularıyla düzeltilenler: BG buton kipi tekil emre çekildi,
      "евромонети", kilit için "заключ-", depolama terimi; DE "Link zum Teilen". Anadil kontrolü hâlâ yok.
    - Yeni bir dil eklemek: `SupportedLanguages` + `languages.ts` + `src/i18n/<dil>.json` +
      `Collection.DefaultNameFor`; test dosya eşliğini kontrol eder. Tablo başlıklarını ölç.

13. ~~**Telefonda fotoğraf denemesi**~~ (kapandı 2026-10-02): kullanıcı canlı sitede telefonla çektiği
    fotoğrafları yükledi; paylaşım linkleri ve veri indirme (fotoğraflar dahil) sorunsuz. Diğer telefon
    platformu ve Android'deki HEIC mesajı ayrıca denenmedi; sorun görülürse yeniden açılır.

14. **Impressum: şimdilik yok (bilinen risk, kullanıcı kararı 2026-10-03).** Sayfalarda ad (Halid Ali) ve
    `contact@coinvitrine.com` var, posta adresi yok.
    - Değerlendirme (hukuki danışmanlık değil): §5 DDG "ticari, genelde ücretli" hizmetler için; reklamsız,
      ücretsiz hobi sitesi büyük ihtimalle dışında. Asıl yükümlülük **§18/1 MStV**: "sadece kişisel ya da
      ailevi amaçlı olmayan" her site ad + tebligat yapılabilir adres (posta kutusu değil) göstermeli; açık
      kayıtlı bir site bu muafiyete pek girmiyor, yani adressiz hali büyük ihtimalle uymuyor. Pratik risk
      düşük: rakip yok (UWG Abmahnung'u beklenmez), ama eyalet medya kurumu bir şikâyetle (ör. moderasyona
      kızan kullanıcı) yazabilir. DSA ücretsiz hobi sitesine muhtemelen uygulanmaz; uygulansa da iletişim
      noktası, şartlar ve moderasyon kaydı var.
    - Elenen seçenekler: A ev adresi (en sağlam, adres herkese açık), B Impressum adres hizmeti (ayda
      ~5–15 €, yeterliliği tartışmalı). Kullanıcı ikisini de şimdilik istemedi.
    - **Yeniden ele alınır:** bir kurumdan ya da avukattan yazı gelirse (hemen A/B'ye geçilir), sitede
      reklam, bağış ya da ücretli bir özellik olursa (o zaman §5 DDG de), site belirgin büyürse.
    - A/B'ye geçilirse plan hazır: adres repoya girmez (public git geçmişi), sunucudaki `web.config`'ten
      okunur ve API'den sayfaya gelir; iletişim sayfası Almancada "Impressum" başlığı alır, adres dört dilde
      görünür; sayfaya `noindex` (aramada listelenmesin).

15. **`piscina` güvenlik uyarısı** (GHSA-67c8-pqhq-4rmx, critical, 2026-10-01): `piscina` < 5.3.2.
    `@angular/build` 21.2.24 onu sabit 5.2.0 olarak getiriyor; düzeltilmiş sürümü sadece Angular 22
    kullanıyor. `piscina` sadece derlemede (`ng build`/`ng serve`, geliştirici makinesi ve CI) çalışır,
    yayınlanan sitede yok; gerçek risk düşük. Dependabot'un güvenlik PR'ı #9 `@angular/build`'i tek
    başına 22'ye çıkardığı için `npm ci` kırıldı; kullanıcı kararıyla (B seçeneği) açıklamalı yorumla
    kapatıldı ve Angular 21 yaması bekleniyor. **Kontrol:** `npm view @angular/build@21 dependencies.piscina`
    (son 21.x) 5.3.2 ya da üstüyse `fix/` branch'inde Angular 21 paketleri (`ng update @angular/core@21
    @angular/cli@21`) yükseltilir, `ng build` + `ng test`. Elenen: npm `overrides` ile 5.3.2'yi zorlamak
    (A; çalışırdı ama Angular'ın resmi bağımlılığından sapma) ve Angular 22'yi şimdi yapmak (C; planlı,
    büyük iş). Angular 22 yükseltmesi (Sıradaki adım 5) de bunu çözer. Son kontrol 2026-10-04: 21.2.24 hâlâ
    5.2.0 getiriyor, karar aynen.

16. **Kasıtlı giriş kilidi (bilinen risk, 2026-10-02, kullanıcı kararı):** kullanıcı adları herkese açık;
    biri 5 yanlış parolayla başkasının yeni girişini 10 dakika engelleyebilir ve bunu tekrarlayabilir.
    Açık oturumlar (14 günlük kalıcı cookie) etkilenmez; #12'den beri saldırgan kilidi kurup kuramadığını
    göremez. Eşiği gevşetmek ve IP'ye bağlı kilit (özel kod, çok IP'li saldırgana karşı zayıf) elendi;
    hobi sitesi için kural aynen kaldı. Kötüye kullanım görülürse ya da Turnstile gelince (yol haritası
    15) yeniden ele alınır: giriş formunda belli sayıda hatadan sonra Turnstile.

17. **Tam Content-Security-Policy** (2026-10-02, #11'den kalan): şimdilik CSP sadece
    `frame-ancestors 'none'`. Tamamı için `index.html`'deki satır içi tema betiğinin hash'i
    (`script-src 'self' 'sha256-…'`) ve Angular'ın satır içi stilleri (`style-src 'self' 'unsafe-inline'`)
    gerekir; önce `Content-Security-Policy-Report-Only` ile, gerçek tarayıcıda (yayın paketi + HTTPS)
    denenerek açılır. Satır içi betik değişince hash de değişir (CLAUDE.md'ye kural olarak girer).
    ZAP taraması bunu 4 bulguyla (kural 10055) raporlar, `.zap/rules.tsv`'de WARN; tam CSP gelince
    satır silinir, bulgu tekrar çıkarsa CI kırılır.

18. **Elle karşılanacak gizlilik talepleri ve denetim kaydı süresi** (2026-10-02, #17'den): profil salt
    okunur olduğu için ad, e-posta ya da doğum tarihi düzeltmesi e-postayla istenir ve veritabanında elle
    yapılır (profil düzenleme Sıradaki adım 3). Admin'in kilitlediği kullanıcı giriş yapamadığından kendi
    verisini indiremez; isterse admin panelinde bir dışa aktarma aracı yok, elle hazırlanır (ya da kilit
    geçici açılır). Denetim kaydının saklama süresi belirlenmedi (şimdi süresiz; silinen kullanıcının Id'leri
    de kalıyor): bir süre kararı ve gerekirse eski kayıtları silen bir bakım komutu.

19. **GitHub güvenlik ayarları** (2026-10-02, #20): private vulnerability reporting, Dependabot alerts ve
    security updates, secret scanning, push protection açık; `SECURITY.md` bildirimi oraya yönlendiriyor.
    Kullanıcıya kalan: malware alerts ve grouped security updates'i açmak (Settings > Code security, tek
    tık). CodeQL "Default setup" 2026-10-06'da açıldı (Tamamlananlar 79).

20. **Canlı sitenin güvenlik ayarları** (2026-10-02, hosting'den kalan):
    - ~~Veritabanının uzaktan erişimi~~ (dışarıdan 1433): `sqlcmd` denemesi için açılmıştı, kullanıcı
      2026-10-03'te kapattı (script'ler zaten panelden çalışıyor).
    - `DataProtection__Dpapi=LocalMachine`: anahtarları sunucudaki her hesap çözebilir; koruma
      `\private` klasörünün site hesabına özel olması (MonsterASP'ın site izolasyonu). Paylaşımlı hosting
      için kabul edildi.
    - Yedekler (2026-10-03, MonsterASP kullanım şartları): ücretli pakette site dosyaları, veritabanı ve
      e-posta kutuları her gün yedeklenir, 21 gün tutulur; "nezaketen", garanti değil, kendi yedeğinden
      müşteri sorumlu. Veritabanı yedeği panelden tek tıkla geri yüklenir. Kalan: `\private\photos`'un
      bu yedeğe dahil olduğu ve geri dönüşün nasıl yapıldığı panelde kontrol edilecek; ayrıca ara sıra
      kendi yedeğimiz (veritabanı yedeği + fotoğraf klasörü indirme) düşünülebilir.
21. **Form alanı kenarlığının kontrastı** (2026-10-04, #25'ten ayrıldı,
    [#35](https://github.com/halid-ali/coin-portal/issues/35)): `.form-input` kenarlığı `shade-300`, açık
    temada 1,5:1 (WCAG 1.4.11 3:1). `shade-400` önizlemesi fazla koyu bulundu, kullanıcı mevcut hali korudu.
    Seçenekler issue'da (koyu kenarlık, dolguyla ayrışma, sadece koyu temada). Karar kullanıcının.

22. **Yayına alma ile fotoğrafsız coin eklemenin yarışı** (2026-10-06, review): Public'e geçiş sayıp
    kaydeder; aynı anda gelen fotoğrafsız coin ekleme, koleksiyon henüz Public olmadığı için guard'dan geçer.
    Sonuç fotoğrafsız coin'li bir Public koleksiyon olabilir. Aynı kullanıcının iki sekmesi ve çok dar bir an
    gerekir; kapatmak yayına almayı ve coin eklemeyi aynı kilide (koleksiyon satırında `UPDLOCK`) almayı
    ister. Kullanıcı kararı: şimdilik sadece not. Bir sonraki fotoğraf/sayı azaltan işlem koleksiyonu
    zaten indirir.
23. **Herkese açık kural için sonraki UX fikirleri** (2026-10-06, review; isteğe bağlı): coin formunda
    önceden uyarı (silme onayına "koleksiyon linkle paylaşılana geçecek" cümlesi, Public hedefe fotoğrafsız
    coin taşırken anında ipucu; iki pencere yerine bir) ve Koleksiyonlarım / pano kartlarında "7/10"
    ilerleme rozeti. Önceden uyarı kuralın bir kopyasını client'a getirir (karar API'de kalmalı);
    yapılırsa API'nin 409'u son söz olarak kalır.
24. **Kayıtta e-postanın kayıtlı olduğu anlaşılıyor** (2026-10-06, pentest, Tamamlananlar 84): alınmış
    e-postayla kayıt 400 `DuplicateEmail` döner, yani biri bir e-postanın hesabı olup olmadığını öğrenebilir
    (kullanıcı adı zaten herkese açık). Kayıt `Auth` hız sınırında. Kullanıcı kararı: kabul, belgelendi.
    Gerçek çözüm e-posta doğrulaması (yol haritası 15): kayıt her durumda "e-postanı kontrol et" der, kayıtlı
    adrese "zaten hesabın var" e-postası gider. 2026-10-06'da doğrulama geldi (Tamamlananlar 88) ama kayıt
    hâlâ oturum açıyor (karar: "paylaşmak için doğrula"); bu çözüm "doğrulamadan giriş yok" modelini ister,
    o yüzden konu açık kalıyor. 2026-10-07 önerisi: kabul kalsın (sızan bilgi küçük, kullanıcı adları zaten açık;
    çözüm "doğrulamadan giriş yok" modelini ister; kayıt hız sınırında). **Şifre sıfırlama bu açığı vermez:**
    "e-postanı kontrol et" her durumda aynı cevap olur. Kötüye kullanım görülürse kayda CAPTCHA düşünülür.
25. **Düz HTTP'de `Host` başlığı HTTPS yönlendirmesine yansır** (2026-10-06, pentest; not, bulgu değil):
    `http://` + sahte `Host` → 307 `https://<sahte host>`. Canlıda `CanonicalHost` başka host adlarını önce
    `coinvitrine.com`'a çevirdiği için etkisi yok; sitenin önünde paylaşılan bir önbellek de yok. `CanonicalHost`
    kapatılırsa ya da önüne bir proxy/CDN önbelleği girerse yeniden değerlendirilir.
26. **Yarıda bırakılan istek "500 / severe error" diye loglanıyor** (2026-10-06, e2e'de görüldü; kullanıcı
    "not edelim" dedi): sayfadan hemen ayrılınca tarayıcı süren isteği iptal eder, `RequestAborted` SQL
    komutunu keser ve SqlClient bunu `OperationCanceledException` yerine `SqlException` ("A severe error
    occurred on the current command") olarak fırlatır; istek logu Error seviyesinde 500 yazar (e2e: kayıttan
    hemen sonra doğrulama linkine geçince ana sayfanın `GET /api/coins?sort=Newest`'i). Kullanıcıya etkisi yok
    (yanıtı bekleyen kimse yok), ama loglarda sahte hata ve 500 sayısı. Olası çözüm: istek iptal edilmişse
    (`HttpContext.RequestAborted.IsCancellationRequested`) hatayı 499 / Information'a indiren bir ara katman
    ya da exception handler; önce lokalde tekrar üretilip mevcut davranış doğrulanır.

## Yayın öncesi yapılacaklar

İlk publish'ten önce tamamlanması gerekenler (ayrıntılar Açık konular'da):

- [x] Hosting seçimi (2026-10-02, MonsterASP.NET, Tamamlananlar 50).
- [x] ImageSharp lisans anahtarı (Açık konular 1, 2026-09-30); `dotnet build -c Release` hatasız.
- [x] Production connection string ve site klasörü dışındaki yollar (2026-10-02): sunucudaki `web.config`
      ortam değişkenleri, `DataProtection__Dpapi=LocalMachine` (havuz profil yüklemiyor).
- [x] Angular derlemesinin `wwwroot`'tan sunulması ve SPA fallback (2026-10-01, Tamamlananlar 28).
- [x] Rate limiter, loglama, DataProtection anahtar yolu (2026-10-01, Tamamlananlar 28).
- [x] Hesap silme ve veri dışa aktarma (2026-10-01, Tamamlananlar 32).
- [x] Gizlilik ve iletişim sayfası (2026-10-01, Tamamlananlar 33).
- [x] İşletmeci adı ve iletişim e-postası (2026-10-03): `OPERATOR` = Halid Ali, `contact@coinvitrine.com`.
- [x] Alan adı (2026-10-03): coinvitrine.com (Cloudflare), `www` ile birlikte HTTPS'li (Tamamlananlar 51).
- [x] `contact@coinvitrine.com` kutusu ve e-posta DNS kayıtları (2026-10-03; SPF, DKIM, DMARC `PASS`,
      Tamamlananlar 51).
- [x] **E-posta doğrulamalı ilk yayından önce** (Tamamlananlar 88; 2026-10-07 yapıldı, 89), sunucudaki `web.config`'e:
      `Email__SiteUrl=https://coinvitrine.com`, `Email__Smtp__Host` / `__Port` / `__UserName` /
      `__Password` (MonsterASP posta sunucusu, `contact@coinvitrine.com` kutusu; parola sadece sunucuda).
      Yoksa e-postalar sunucuda bir klasöre yazılır, kimse doğrulayamaz ve paylaşamaz (açılış logunda
      Warning). Sonra bir deneme hesabı: e-posta geliyor mu, spam'e düşüyor mu (SPF/DKIM uyumu), link
      `https://coinvitrine.com/verify-email`'i açıyor mu. Gönderim sağlayıcısı değişirse gizlilik metni
      (`privacy.hosting.p1`) de değişir.
- [ ] Yayında sunucudaki `web.config`'e `CanonicalHost__Host=coinvitrine.com`; ardından
      `https://coinportal.runasp.net/x` ve `https://www.coinvitrine.com/x` → 308 `https://coinvitrine.com/x`.
- [x] Impressum kararı (2026-10-03): şimdilik adres yok, bilinen risk (Açık konular 14).
- [x] Canlı veritabanının dışarıdan erişimi kapalı (2026-10-03, Açık konular 20).
- [x] Sağlayıcıyla veri işleme sözleşmesi (AVV / Art. 28 GDPR): MonsterASP'ın kullanım şartlarının parçası.
- [x] Gizlilik metnindeki barındırma, sağlayıcının erişim logları ve yedek süresi cümlelerinin
      MonsterASP'a göre kontrolü (2026-10-03, Tamamlananlar 51; `PRIVACY_UPDATED` 2026-10-03).
- [x] Yayın yöntemi fazla dosyaları silmiyor (dosya yöneticisinde ZIP açma üzerine yazar, silmez;
      fotoğraflar zaten site klasörü dışında, `\private`).
- [x] HTTPS kontrolü (2026-10-02): `http://` → 307 `https://`, `Strict-Transport-Security` 30 gün, Brotli.
      Kalan: site ve alan adı oturunca `Hsts__MaxAgeDays=365`.
- [x] İlk kurulum sırası (2026-10-02): önce `migrate.sql` panelin "Import SQL"i ile, sonra site; HTTPS
      açıldı (sertifika birkaç dakikada hazır oldu).
- [x] İlk admin (2026-10-02): kullanıcı sitede kayıt oldu, Id `Admin__UserIds__0`'da, panel açılıyor.
- [x] İlk açılış: `private\logs` altında log, `photos` ve `keys` klasörleri oluştu; `GET /api/health`
      `0.4.0+c17f03d`.
- [x] Gizlilik politikası ve kullanım şartlarının kullanıcı tarafından okunması (2026-10-03; Claude yazdı,
      hukuki danışmanlık değildir).
- [ ] (Önerilir) Almanca ve Bulgarca metinlerin anadili konuşan biri tarafından gözden geçirilmesi
      (Açık konular 12).

## Yayın (deploy) adımları

Canlı site: https://coinvitrine.com (MonsterASP.NET; sağlayıcının adresi `coinportal.runasp.net`; sunucu
adları ve yollar lokal `.notes/environment.md`'de, parolasız `web.config` şablonu `.notes/deploy/`).

**Normal yol: pipeline** (Tamamlananlar 53, kural CLAUDE.md "Sürüm ve yayın"). Etiket push edilince Release
workflow'u kontrol, paket ve onay bekleyen deploy adımlarını çalıştırır:

1. Actions'ta Release koşusunun özetine bakılır: yeni migration varsa **önce panelden veritabanı yedeği**
   (Databases > Backups management > Create Backup). Sürüm sunucuda bir hazırlık istiyorsa (yeni ortam
   değişkeni vb.) o da şimdi, sunucudaki `web.config`'e.
2. GitHub'ın e-postasındaki ya da koşu sayfasındaki **Review deployments → Approve**.
3. Deploy ve canlı kontrol yeşilse iş biter; elle kontrol: giriş, bir fotoğraf, paylaşım linki. Kırmızıysa
   koşunun logu, sonra `\private\logs`. Eski sürüme dönüş: Run workflow, eski etiket + deploy
   (veritabanı geri alınmaz).

**Yedek yol: elle kurulum** (pipeline çalışmazsa):

1. Etiketin GitHub Release'inden `coinportal-vX.Y.Z.zip` indirilir, `.sha256` ile karşılaştırılır.
2. **Veritabanı önce:** paketteki `migrate.sql` (idempotent) panelde Databases > Manage > "Import SQL"
   ile çalıştırılır. Dosyanın başına `SET QUOTED_IDENTIFIER ON; SET ANSI_NULLS ON;` + `GO` eklenir
   (filtreli index'ler ister; v0.4.0'da böyle yapıldı). Şirket ağı 1433'ü kapattığı için `sqlcmd` /
   SSMS buradan bağlanamaz.
3. **Site:** `site/` klasörünün içeriği, **`web.config` hariç**, ZIP'lenip `\wwwroot`'a yüklenir ve
   üzerine yazılarak açılır, ZIP silinir. Sunucudaki `web.config` parolayı ve bütün ayarları tutar;
   pakettekiyle değiştirilirse site açılmaz (o zaman şablondan yeniden kurulur, parolayı kullanıcı yazar).
   Paketten kalkan eski dosyalar silinmez; hash'li client dosyaları birikir, zararsızdır.
4. Panelden uygulama havuzu yeniden başlatılır (yeni DLL'ler yüklensin).
5. Kontrol: `GET https://coinvitrine.com/api/health` → yeni sürüm, footer'daki sürüm aynı; giriş, bir
   fotoğraf ve paylaşım linki açılır; `coinportal.runasp.net` ve `www.` 308 ile `coinvitrine.com`'a gider. Hata olursa `\private\logs` (uygulama logu) ya da geçici olarak
   `stdoutLogEnabled="true"` (`\wwwroot\logs`).

## Hosting seçimi kontrol listesi

Hosting firmasına satın almadan önce sorulacaklar. Kalın olanlar olmazsa olmaz.

**Seçim (2026-10-02): MonsterASP.NET Premium Single** (Tamamlananlar 50). Cevaplar kısaca: .NET 10
in-process (x86 havuz) var; ortam değişkenleri sunucudaki `web.config`'te; havuz profil yüklemiyor
(`DataProtection__Dpapi=LocalMachine`); önünde CDN yok (`KnownProxies` gerekmez); bellek 512 MB (aynı
anda 1 görsel, en fazla 2000 px); site klasörünün yanında `\private` yazılabilir; MSSQL, collation
`SQL_Latin1_General_CP1_CI_AS`; Let's Encrypt otomatik; yayın dosya yöneticisi / FTP (fazla dosya
silinmez); özel alan adı Premium'da var (Tamamlananlar 51), e-posta 10 GB. Liste sağlayıcı değişirse diye
duruyor; SMTP (uygulamadan e-posta) ve WebSocket soruları açık (ileride).

**Uygulama**
- **.NET 10 (ASP.NET Core) destekleniyor mu?** ASP.NET Core Hosting Bundle kurulu mu, in-process
  hosting (ASP.NET Core Module v2) çalışıyor mu?
- **Ortam değişkenleri panelden tanımlanabiliyor mu?** (`ASPNETCORE_ENVIRONMENT`, connection string,
  `PhotoStorage__RootPath`)
- Uygulama havuzu boşta kalınca ne zaman kapanıyor (idle timeout)? "Always on" / önceden yükleme var mı?
  (İlk istekte soğuk başlama gecikmesi.)
- Uygulamanın yazdığı log dosyalarına (site klasörü dışında, `Logs__Path`) dosya yöneticisi / FTP ile
  erişilebiliyor mu?
- Uygulama havuzunda "Load User Profile" açık mı? **Önce bunu açtır**, `CurrentUser` kalsın (DPAPI ile
  anahtarları sadece havuzun hesabı çözebilir). Açılamıyorsa `DataProtection__Dpapi=LocalMachine`; o zaman
  sunucudaki her hesap çözebileceği için anahtar klasörü sadece havuz kimliğine açık olmalı (`icacls`).
- Sitenin önünde CDN/proxy var mı ya da konacak mı? (Varsa rate limiter ve loglar için
  `KnownProxies`.)
- `web.config` ile istek boyutu sınırı (`maxAllowedContentLength`) ayarlanabiliyor mu?
- Uygulama havuzunun bellek sınırı ne? (Aynı anda 2 görsel çözülür, her biri ~64 MB'a kadar;
  `PhotoStorage__MaxConcurrentDecodes` ve `MaxSourceDimension` buna göre ayarlanır.)

**Fotoğraflar ve disk**
- **Uygulama havuzu kimliğinin (app pool identity) yazabildiği, site klasörü dışında bir klasör var mı?**
  (Ör. Plesk'te `httpdocs` yanında `private`.) Yoksa `App_Data`'ya yazma izni verilebiliyor mu?
- **Disk kotası ne kadar?** Veritabanı ve e-posta da bu kotaya dahil mi?
- Fotoğraf klasörü otomatik yedeklemeye dahil mi? Yedekten geri dönüş nasıl yapılıyor?

**Veritabanı**
- **MSSQL var mı, hangi sürüm ve boyut sınırı ne?** (Yoksa MySQL/PostgreSQL; EF Core provider değişir.)
- Veritabanına dışarıdan (SSMS / `dotnet ef`) bağlanılabiliyor mu, yoksa migration'ları SQL script olarak
  mı uygulamak gerekiyor?
- Veritabanı yedekleri otomatik mi, ne sıklıkla, ne kadar saklanıyor?
- **Varsayılan collation ne, oluştururken seçilebiliyor mu?** Kod `SQL_Latin1_General_CP1_CI_AS` gibi büyük/küçük
  harf duyarsız bir collation varsayıyor (unique index'ler, arama); `Turkish_CI_AS` i/I aramasını değiştirir.
  Farklıysa CI'daki SQL Server container'ı `MSSQL_COLLATION` ile aynı collation'da çalıştırılır ya da
  ilgili sütunlara `UseCollation` verilir.

**Yayın ve alan adı**
- **SSL sertifikası (ör. Let's Encrypt) ve özel alan adı** destekleniyor mu, sertifika otomatik yenileniyor mu?
- **Yayın yöntemi:** Web Deploy ve/veya FTP. Web Deploy'da "hedefteki fazla dosyaları sil" seçeneği
  kapatılabiliyor mu? (FTP zaten silmez.)

**İleride gerekecek**
- SMTP ile e-posta gönderimi (e-posta doğrulama, şifre sıfırlama) destekleniyor mu, gönderim sınırı ne?
- WebSocket ve uzun bağlantılar (SSE, SignalR; bildirimler için) destekleniyor mu, zaman aşımı ne?

## Web uygulamasının kapsamı

Zorunlu gereksinimler: JPG/PNG yükleme, 1:1 kırpma ve üç boyut, kayıt formu (isim, soyisim, kullanıcı adı,
benzersiz e-posta, doğum tarihi, en az 18 yaş), Tailwind ile stil, yükleme formunda başlık ve açıklama,
liste/tablo/kart görünümü, filtreler (nominal, ülke, kullanıcı, yıl).

Önerilen ek özellikler: "Bende var mı?" hızlı kontrol (filtreli liste yeterli bulundu), ülkeye göre eksik
listesi için referans Euro coin kataloğu, istatistikler. Yapılanlar: görünürlük ayarı (herkese açık /
sadece linkle / özel) ve profil sayfası, fotoğraf boyut/tür/kota sınırları, gizlilik politikası, kullanım
şartları ve iletişim sayfası, dil desteği (EN/TR/DE/BG), karanlık mod ve tema rengi, PWA manifest
(service worker HTTPS'ten sonra, yol haritası 11).
