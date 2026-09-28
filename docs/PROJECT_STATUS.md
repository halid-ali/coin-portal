# Coin Web Portal - Proje Durumu ve Kararlar

Son güncelleme: 2026-09-29 (genel görsel düzeltmeler: kaydırma çubuğu kayması ve header taşması
giderildi, kullanıcı adı sınırı 20 karaktere indi, fotoğrafsız coin ve kapaksız koleksiyon için yeni
görseller, son coin fotoğrafı artık kapak değil, görüntüleyicide fare tekerleğiyle yüz değiştirme,
telefonda katlanan filtreler, sadeleşen sıralama; hepsi main'de. ImageSharp lisans kararı ilk publish'ten önce)

## Yeni sohbete başlarken

- Durum: `main` güncel ve temiz; açık feature branch yok (`feat/mobile-filters` 2026-09-29'da merge edildi).
  Push yapılmadı (repo sadece lokal).
- Veritabanı en son migration'da (`AddUserPreferredAccent`); dev seed 2026-09-27'de çalıştırıldı
  (seed kullanıcılarında örnek paylaşımlar var: ayse ve elif'in birer koleksiyonu herkese açık, jonas'ın
  "Koleksiyonum"u sadece linkle). Seed kullanıcılarının kayıtlı dili yok (arayüz cihazın diliyle açılır).
- API'yi Claude sohbetlerde kendi arka plan oturumunda çalıştırıyor; sohbet kapanınca durur. Yeni
  sohbette API'nin kullanıcının terminalinde çalışıp çalışmadığı kontrol edilir (`/api/health`).
- İlk iş: kullanıcıyla sıradaki adımı seçmek ("Sıradaki adım"). Bekleyen dış konu: Six Labors'tan
  ImageSharp lisans cevabı (Açık konular 1).

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

## Ortam (kullanıcının bilgisayarı)

- Node.js 22.19.0, npm 11, Git 2.55, .NET SDK 10 (yanında 9.0.306), Angular CLI 21.2.24, PowerShell 7.6,
  VS Code (C# Dev Kit, Angular Language Service, Tailwind CSS IntelliSense, ESLint, Prettier,
  Claude Code), SQL Server LocalDB 16, `sqlcmd`.
- `dotnet-ef` 10.0.12 local tool (`dotnet-tools.json`). `global.json` SDK'yı sabitliyor, `nuget.config`
  sadece nuget.org.
- Terminal çoğunlukla Git Bash (MINGW64).
- Repo: `C:\repos\private\coin-web-portal`. Şirket bilgisayarı; Git kimliği sadece repo seviyesinde
  (`72255478+halid-ali@users.noreply.github.com`).
- Şirketin global `.npmrc`'sinde Azure DevOps feed'i var. Eski dokümanda `src/client/.npmrc` ile public
  npm'e sabitlendiği yazıyordu ama bu dosya repoda yok (2026-09-27 kontrolü). Paket kurulumunda sorun
  çıkarsa yeniden eklenmeli.
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

## Sıradaki adım

Kullanıcıyla seçilecek (2026-09-28'de watermark "biraz daha ertelensin" dendi):

1. **Watermark** (Açık konular 8): kararlar bekliyor (içerik, konum, saydamlık, sadece herkese açık
   fotoğraflara mı).
2. **Görünüm üzerinde çalışmaya devam** (kullanıcı 2026-09-28'de "sitenin görünümü üzerinde çalışalım"
   dedi; koyu tema ve tema rengi bitti). Kullanıcı ayrı bir sohbette genel görsellerle ilgili birkaç
   düzeltme ve logo için ayrı bir çalışma yapmak istiyor. Genel düzeltmeler sohbeti 2026-09-28'de başladı
   (Tamamlananlar 14).
3. **Profil bilgilerinin düzenlenmesi** (kullanıcı 2026-09-28'de kaydettirdi): Ayarlar > Profil şimdilik
   salt okunur. Hangi alanların değiştirilebileceğine kullanıcıyla karar verilecek (isim/soyisim kolay;
   kullanıcı adı paylaşım linklerini `/u/…` bozar; e-posta doğrulama ister; doğum tarihi 18+ kuralına
   bağlı). Ayarlar'da ayrıca Güvenlik (parola değiştirme) bölümü düşünülüyor.
4. Diğer adaylar (sıra değişebilir): gelişmiş filtreler, istatistikler, referans katalog / eksik listesi.

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
  **Ancak 4.x derlemede lisans anahtarı arıyor; anahtarsız Release/publish derlemesi başarısız.**
  Kütüphane sadece `IImageProcessor` arkasında, değiştirmek bir dosya + DI kaydı (bkz. Açık konular 1).
- **Kaydetme davranışı:** Formda fotoğraf değişiklikleri "Kaydet"e basınca uygulanır, "Vazgeç" hepsini
  geri alır (kullanıcı kararı).
- **Hatalar:** API fotoğraf hatalarında `code` döner (`file_missing`, `file_too_large`, `invalid_image`,
  `quota_exceeded`, `conflict`); client bunları Türkçe mesaja çevirir.

## Açık konular

1. **ImageSharp lisans anahtarı (2026-09-27):** 4.x anahtarsız Release derlemede hata veriyor, publish
   yapılamaz. Kullanıcı Six Labors'a ücretsiz anahtar için yazdı, cevap bekleniyor.
   - Olumlu: anahtar derlemeye `SixLaborsLicenseKey` (ortam değişkeni/MSBuild property) veya
     `sixlabors.lic` dosyası ile verilir; anahtar repoya girmemeli.
   - Olumsuz: `SkiaSharpImageProcessor` yazılır (MIT, aktif bakımlı; native `libSkiaSharp.dll` içerir),
     ImageSharp paketi kaldırılır, hosting kontrol listesine "native DLL çalıştırılabiliyor mu?" eklenir.
     ImageSharp 3.1.12 (anahtarsız) önerilmiyor: Ekim 2025'ten beri güncelleme almıyor.
   - Debug derleme (lokal geliştirme) etkilenmiyor. **İlk publish'ten önce çözülmeli**; kütüphane
     değişikliği gerekirse main'den ayrı bir branch'te yapılır (ör. `chore/skiasharp`).
2. **Şirket politikası:** Kişisel projeyi şirket bilgisayarında geliştirme, GitHub'a push ve yapay zeka
   asistanı kullanımı yönetici/IT ile netleştirilecek. Cevaba kadar repo **sadece lokal**, push yok.
3. **Hosting seçilmedi.** Seçerken aşağıdaki "Hosting seçimi kontrol listesi" kullanılacak.
4. GitHub'a yayınlarken: **boş** repo, sonra `git remote add origin <url>` ve `git push -u origin main`.
5. **Production connection string:** `appsettings.Production.json` veya hosting paneli ortam değişkeni;
   parolalı connection string repoya girmeyecek.
6. **Yayında SPA fallback:** `MapFallbackToFile("index.html")`.
7. **Backend testleri yok.** Bir test projesi (xUnit + `WebApplicationFactory`) eklenmesi değerlendirilebilir.
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
11. **İstek sınırlama (rate limiting) yok:** Girişsiz uçlar (Keşfet, profil, paylaşılan koleksiyon,
    fotoğraflar) ve giriş denemeleri için hosting öncesi ASP.NET Core rate limiter değerlendirilmeli.
    Gizli link anahtarı 128 bit olduğu için tahminle bulunamaz; amaç yükü sınırlamak.
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

## Yayın öncesi yapılacaklar

İlk publish'ten önce tamamlanması gerekenler (ayrıntılar Açık konular'da):

- [ ] Hosting seçimi ("Hosting seçimi kontrol listesi").
- [ ] ImageSharp lisans anahtarı ya da SkiaSharp'a geçiş (Açık konular 1); `dotnet build -c Release`
      hatasız olmalı.
- [ ] Production connection string ve `PhotoStorage__RootPath` (site klasörü dışında) hosting panelinde.
- [ ] Angular derlemesinin `wwwroot`'tan sunulması ve SPA fallback (`MapFallbackToFile("index.html")`).
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
- Uygulama loglarına (stdout log, olay günlüğü) erişilebiliyor mu?
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
