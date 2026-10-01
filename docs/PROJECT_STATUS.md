# Coin Portal - Proje Durumu ve Kararlar

Son güncelleme: 2026-10-01 (9. adım hosting temeli: 9a `chore/hosting-infra` (wwwroot + SPA fallback,
publish'te client, Serilog, DataProtection anahtarları, rate limiter), 9b `fix/photo-upload-limits`
(büyük telefon fotoğrafları, HEIC mesajı), 9c `feat/remember-me` ve 9d `feat/pwa-manifest` bitti,
main'de (push edilmedi); sırada 9e. Proje GitHub'da public: https://github.com/halid-ali/coin-portal; yol
haritası ve sıra "Yol haritası" bölümünde)

## Yeni sohbete başlarken

- Durum: `main` temiz; açık feature branch yok (`chore/hosting-infra`, `fix/photo-upload-limits`,
  `feat/remember-me` ve `feat/pwa-manifest` 2026-10-01'de merge edildi, henüz push edilmedi; son
  etiket ve release `v0.2.0`). GitHub: https://github.com/halid-ali/coin-portal (public;
  sadece `main` ve etiketler push edilir, CI her push'ta koşar). Yeni sohbette önce `git status -sb` ile
  lokal `main`'in `origin/main` ile aynı olduğu kontrol edilir. Yollar: API `src/api`, client `src/web`
  (komutlar CLAUDE.md'de).
- Veritabanı en son migration'da (`AddModeration`); dev seed 2026-09-27'de çalıştırıldı
  (seed kullanıcılarında örnek paylaşımlar var: ayse ve elif'in birer koleksiyonu herkese açık, jonas'ın
  "Koleksiyonum"u sadece linkle). Seed kullanıcılarının kayıtlı dili yok (arayüz cihazın diliyle açılır).
- API'yi Claude sohbetlerde kendi arka plan oturumunda çalıştırıyor; sohbet kapanınca durur. Yeni
  sohbette API'nin kullanıcının terminalinde çalışıp çalışmadığı kontrol edilir (`/api/health`).
- İlk iş: kullanıcıyla sıradaki adımı seçmek ("Yol haritası" ve "Sıradaki adım").
- Lokal admin: `src/api/appsettings.Development.json` → `Admin:UserIds` (API açılışta rolü verir).
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
  Google/Microsoft girişi sonradan eklenecek.
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
      edilmedi.

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
      alerts ve security updates, secret scanning ve push protection açık. Öneri: malware alerts ve
      grouped security updates da açılsın. CodeQL şimdilik kapalı (istenirse "Default setup" tek tık).
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
    - Six Labors ücretsiz **Community** lisansı verdi (License ID `ctm_01m3hrxvqkt74ke0cdc359x79p`,
      geçerlilik **2027-12-26**'ya kadar). Six Labors'un şartı: anahtar ya da `.lic` public repoya girmez;
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

## Yol haritası

2026-09-29'daki proje yönü değerlendirmesinden çıkan sıra. Gerekçeler, elenen seçenekler, tuzaklar ve
doğrulanan dış bilgiler [reviews/2026-09-29-project-direction.md](reviews/2026-09-29-project-direction.md)
içinde (dondurulmuş doküman; burası güncel tutulur). Adımlar kullanıcı onayıyla başlar; durum değiştikçe
başındaki işaret güncellenir.

Özet kararlar (öneri, kullanıcı onayı bekliyor): klasörler `src/api` + `src/web` + `tests/` + `docs/`;
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
- [x] 7. GitHub publish (2026-09-29/30), release `v0.1.0`. Six Labors başvurusunun repo adresiyle
      güncellenmesi kullanıcıda.
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
- [ ] 9. Hosting temeli (2026-10-01'de alt adımlara bölündü; sonunda `v0.3.0`). Turnstile 15. adıma,
      forwarded headers hosting seçimine kaldı (sitenin önüne CDN konursa).
  - [x] 9a. `chore/hosting-infra`: wwwroot + SPA fallback + önbellek, publish'te client, Serilog,
        DataProtection, rate limiter (Tamamlananlar 28).
  - [x] 9b. `fix/photo-upload-limits`: büyük telefon fotoğrafları, tür kararı cropper'da, HEIC mesajı
        (Tamamlananlar 29).
  - [x] 9c. `feat/remember-me`: "Beni hatırla" varsayılan işaretli, kayıttan sonraki oturum kalıcı
        (kullanıcı kararı 2026-10-01; Tamamlananlar 30).
  - [x] 9d. `feat/pwa-manifest`: manifest, mevcut logodan 192/512 + maskable ikonlar, apple-touch-icon,
        açık/koyu theme-color, favicon (Tamamlananlar 31; service worker 11. adımda).
  - [ ] 9e. `feat/account-deletion`: hesap silme (parolayla onay, hemen ve geri alınamaz; kullanıcı
        kararı) + dışa aktarma (ZIP: JSON + tam boy fotoğraflar; kullanıcı kararı), Ayarlar > Hesap;
        admin'in kullanıcı silmesi aynı servisle (admin silinemez, denetim kaydı), `AuditLog`'daki ad
        anlık görüntüleri anonimleştirilir.
  - [ ] 9f. `feat/privacy-contact`: gizlilik + iletişim sayfaları (4 dil, e-postayla iletişim),
        footer ve kayıt formunda link; operatör bilgileri ve Impressum kullanıcıya sorulacak.
- [ ] 8b. `tests/e2e` (Playwright).
- [ ] 10. ~~ImageSharp kararı~~ (Community lisansı, 2026-09-30) → ~~CI Release~~ (tamam) + `release.yml`
      (9. adımdaki wwwroot + SPA fallback'ten sonra; onsuz paket client'sız olur).
- [ ] 11. Hosting seçimi → elle ilk yayın `v1.0.0` → service worker → otomatik deploy.
- [ ] 13. Sosyal A: takas / istek listesi, bağımsız profil, takip, feed.
- [ ] 14. Bildirim + Web Push.
- [ ] 15. Yorum + şikayet + engelleme + e-posta doğrulama; yönetici paneline "Şikayetler" ve "Yorumlar"
      bölümleri eklenir (panelin kendisi 12. adımda).
- [ ] 16. Mağaza: TWA → gerekirse Capacitor → iOS.
- [ ] 17. Koşullu: container/PaaS, yalnızca tetikleyiciyle.

**Yeniden sıralama (2026-09-30, kullanıcıyla):** Değerlendirme admin'i hosting'den sonra ve arayüzsüz
(sadece JSON uçları), arayüzü de şikayet kuyruğuyla 15. adımda öneriyordu. Değişti, çünkü:
(1) herkese açık koleksiyonlarda kullanıcı metni ve fotoğrafı yayının ilk gününden var; "koleksiyonu gizle"
ve "kullanıcıyı kilitle" canlıda hemen gerekebilir, hosting DB panelinden elle SQL yazmak zahmetli ve
hataya açık; (2) Swagger sadece Development'ta, arayüzsüz uçlar production'da antiforgery token'lı elle
isteklerle kullanılamaz; (3) ilk admin atama yolu ilk kurulumda denenmiş olmalı. Panelin arayüzü yeni ve
lazy bir alan, uçları policy arkasında: canlıya eklemek düşük riskli. 15. adımı büyük yapan panel değil,
mevcut kuralları değiştiren yorum/şikayet/e-posta doğrulama. Admin uçları bir erişim matrisi olduğu için
önce API testleri (8a) yapıldı.

## Sıradaki adım

9. adımın alt adımları sırayla: 9a–9d bitti (main'de, push edilmedi), sırada **9e**
(`feat/account-deletion`). Alt adımlar ve kullanıcı kararları "Yol haritası"nda.
Panel için kullanıcının bir sonraki geri bildirimleri de buraya.

Diğer adaylar (kullanıcı 2026-09-30'da ayrıca logo çalışmasını ve Angular 22 yükseltmesini andı;
2026-09-28'de watermark "biraz daha ertelensin" dendi):

1. **Watermark** (Açık konular 8): kararlar bekliyor (içerik, konum, saydamlık, sadece herkese açık
   fotoğraflara mı).
2. **Görünüm üzerinde çalışmaya devam** (kullanıcı 2026-09-28'de "sitenin görünümü üzerinde çalışalım"
   dedi; koyu tema ve tema rengi bitti). Kullanıcı ayrı bir sohbette genel görsellerle ilgili birkaç
   düzeltme ve logo için ayrı bir çalışma yapmak istiyor. Genel düzeltmeler sohbeti 2026-09-28/29'da
   yapıldı ve bitti (Tamamlananlar 14); görünümde sırada logo var. Akılda tutulacak (kullanıcı, 2026-09-29): koleksiyon sayfasındaki sahip
   aksiyonları (Linki kopyala / Düzenle / Sil) çoğalırsa ya da tasarım değişirse tek bir "⋯" (daha
   fazla) menüsüne toplanabilir; şimdilik telefonda ikon butonlar yetiyor.
3. **Profil bilgilerinin düzenlenmesi** (kullanıcı 2026-09-28'de kaydettirdi): Ayarlar > Profil şimdilik
   salt okunur. Hangi alanların değiştirilebileceğine kullanıcıyla karar verilecek (isim/soyisim kolay;
   kullanıcı adı paylaşım linklerini `/u/…` bozar; e-posta doğrulama ister; doğum tarihi 18+ kuralına
   bağlı). Ayarlar'da ayrıca Güvenlik (parola değiştirme) bölümü düşünülüyor.
4. Diğer adaylar (sıra değişebilir): gelişmiş filtreler, istatistikler, referans katalog / eksik listesi.
5. **Angular 22'ye yükseltme** (2026-09-29'da Dependabot gösterdi): `ng update @angular/core @angular/cli`
   ile ayrı bir branch'te, Vitest 5 ve jsdom 30 ile birlikte; testler ve görsel kontrol. Dependabot bu
   major sürümleri artık önermiyor, takip burada.

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
  - İngilizce: national side / common side (ECB), Denomination (tabloda "Value"), Link only.
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
- **Birincil buton renge uyar, logo altın kalır** (kullanıcı kararı; logo için ayrı bir çalışma yapılacak).
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
  (şimdilik sadece sahibi; görünürlük ayarı gelince burada genişler). URL'de sürüm anahtarı (`?v=`),
  `Cache-Control: private, max-age=31536000, immutable`. `wwwroot` altından statik sunum yok.
- **Yükleme akışı:**
  - Client ngx-image-cropper ile 1:1 kırpar, en fazla 1600x1600'e küçültüp multipart gönderir.
  - Server client'a güvenmez: görseli ImageSharp ile açarak doğrular (uzantı/content-type'a bakmaz),
    boyut ve piksel sınırı uygular, kare değilse ortadan kırpar, EXIF yönüne göre döndürüp EXIF/GPS'i
    temizler, üç boyutu üretir.
  - Dosyalar önce geçici klasöre yazılır, veritabanı kaydı başarılıysa yerine taşınır. Fotoğraf veya coin
    silinince dosyalar da silinir. Antiforgery multipart isteklerde de geçerli.
- **Sınırlar (yapılandırılabilir):** dosya başına 10 MB, piksel sınırı ~6000x6000, **kullanıcı başına
  300 MB**. Her fotoğrafın toplam bayt boyutu veritabanında tutulur, kota tek sorguyla kontrol edilir.
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
3. **Hosting seçilmedi.** Seçerken aşağıdaki "Hosting seçimi kontrol listesi" kullanılacak.
4. GitHub: https://github.com/halid-ali/coin-portal (public, 2026-09-29'da boş oluşturuldu; remote `origin`).
   Push'ta etiketler ayrıca gönderilir (`git push origin vX.Y.Z`).
5. **Production connection string:** `appsettings.Production.json` veya hosting paneli ortam değişkeni;
   parolalı connection string repoya girmeyecek.
6. ~~**Yayında SPA fallback**~~ (kapandı 2026-10-01): `SpaHosting`, Tamamlananlar 28.
7. ~~**Backend testleri yok.**~~ (kapandı 2026-09-30): `tests/api`, Tamamlananlar 22. e2e testleri
   (Playwright) yol haritasında 8b.
8. **Fotoğraflara watermark (ileride, 2026-09-27'de konuşuldu):** Görünürlük ayarı ve herkese açık profil
   sayfasıyla birlikte yapılacak; o zamana kadar fotoğrafları sadece sahibi gördüğü için gerek yok.
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
   kullanıcı adı/e-posta müsaitlik kontrolü, Register'ın da `applyServerErrors` kullanması, mobilde
   katlanabilir filtre paneli.
10. **Euro dışı, tedavülden kalkmış ve antika coin'ler (ileride, 2026-09-27'de kullanıcı istedi):**
    Birden fazla koleksiyon bunun için temel. Gerekecekler: koleksiyona bir "tür" alanı (Euro / diğer);
    nominalin genelleşmesi (şu an Euro değerleri enum'u, `CK_Coins_Denomination`), ülkenin genelleşmesi
    (şu an 25 Euro ihraççısı, `Countries` tablosu; tarihî ülkeler de gerekebilir), yılın genelleşmesi
    (şu an 1999 ve sonrası, `CK_Coins_Year`; antikalarda tahmini yıl/dönem), para birimi. Euro'ya özgü
    kurallar (ulusal/ortak yüz, 2 € hatıra) sadece Euro türünde geçerli olmalı.
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
    - Identity'nin bazı parola hataları (client doğrulamasının yakalamadıkları) API'den İngilizce gelir ve
      öyle gösterilir; client doğrulaması aynı kuralları uyguladığı için pratikte görünmez.
    - Yeni bir dil eklemek: `SupportedLanguages` + `languages.ts` + `src/i18n/<dil>.json` +
      `Collection.DefaultNameFor`; test dosya eşliğini kontrol eder. Tablo başlıklarını ölç.

13. **Telefonda fotoğraf denemesi (hosting'den sonra):** Android (Chrome) ve iPhone (Safari) ile kameradan
    doğrudan fotoğraf ekleme; büyük fotoğrafın kırpma penceresinde açılması (bellek), Android'de HEIC
    mesajı. Masaüstü headless Edge'de denendi (Tamamlananlar 29).

## Yayın öncesi yapılacaklar

İlk publish'ten önce tamamlanması gerekenler (ayrıntılar Açık konular'da):

- [ ] Hosting seçimi ("Hosting seçimi kontrol listesi").
- [x] ImageSharp lisans anahtarı (Açık konular 1, 2026-09-30); `dotnet build -c Release` hatasız.
- [ ] Production connection string ve site klasörü dışındaki yollar hosting panelinde:
      `PhotoStorage__RootPath`, `Logs__Path`, `DataProtection__KeysPath` (uygulama havuzu profil
      yüklemiyorsa `DataProtection__Dpapi=LocalMachine`).
- [x] Angular derlemesinin `wwwroot`'tan sunulması ve SPA fallback (2026-10-01, Tamamlananlar 28).
- [x] Rate limiter, loglama, DataProtection anahtar yolu (2026-10-01, Tamamlananlar 28).
- [ ] Publish ayarında "hedefteki fazla dosyaları sil" kapalı (fotoğraflar `App_Data`'daysa).
- [ ] (Önerilir) Almanca ve Bulgarca metinlerin anadili konuşan biri tarafından gözden geçirilmesi
      (Açık konular 12).

## Hosting seçimi kontrol listesi

Hosting firmasına satın almadan önce sorulacaklar. Kalın olanlar olmazsa olmaz.

**Uygulama**
- **.NET 10 (ASP.NET Core) destekleniyor mu?** ASP.NET Core Hosting Bundle kurulu mu, in-process
  hosting (ASP.NET Core Module v2) çalışıyor mu?
- **Ortam değişkenleri panelden tanımlanabiliyor mu?** (`ASPNETCORE_ENVIRONMENT`, connection string,
  `PhotoStorage__RootPath`)
- Uygulama havuzu boşta kalınca ne zaman kapanıyor (idle timeout)? "Always on" / önceden yükleme var mı?
  (İlk istekte soğuk başlama gecikmesi.)
- Uygulamanın yazdığı log dosyalarına (site klasörü dışında, `Logs__Path`) dosya yöneticisi / FTP ile
  erişilebiliyor mu?
- Uygulama havuzunda "Load User Profile" açık mı? (DataProtection anahtarlarının DPAPI şifrelemesi:
  açıksa `CurrentUser`, değilse `DataProtection__Dpapi=LocalMachine`.)
- Sitenin önünde CDN/proxy var mı ya da konacak mı? (Varsa rate limiter ve loglar için
  `KnownProxies`.)
- `web.config` ile istek boyutu sınırı (`maxAllowedContentLength`) ayarlanabiliyor mu?

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

**Yayın ve alan adı**
- **SSL sertifikası (ör. Let's Encrypt) ve özel alan adı** destekleniyor mu, sertifika otomatik yenileniyor mu?
- **Yayın yöntemi:** Web Deploy ve/veya FTP. Web Deploy'da "hedefteki fazla dosyaları sil" seçeneği
  kapatılabiliyor mu? (FTP zaten silmez.)

**İleride gerekecek**
- SMTP ile e-posta gönderimi (e-posta doğrulama, şifre sıfırlama) destekleniyor mu, gönderim sınırı ne?

## Web uygulamasının kapsamı

Zorunlu gereksinimler: JPG/PNG yükleme, 1:1 kırpma ve üç boyut, kayıt formu (isim, soyisim, kullanıcı adı,
benzersiz e-posta, doğum tarihi, en az 18 yaş), Tailwind ile stil, yükleme formunda başlık ve açıklama,
liste/tablo/kart görünümü, filtreler (nominal, ülke, kullanıcı, yıl).

Önerilen ek özellikler: "Bende var mı?" hızlı kontrol, görünürlük ayarı (herkese açık / sadece linkle /
özel) ve paylaşılabilir profil sayfası, ülkeye göre eksik listesi için referans Euro coin kataloğu,
fotoğraf boyut/tür/kota sınırları, gizlilik politikası ve iletişim sayfası, istatistikler, dil desteği
(yapıldı: EN/TR/DE/BG), karanlık mod, PWA.
