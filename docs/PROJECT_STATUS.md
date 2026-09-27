# Coin Web Portal - Proje Durumu ve Kararlar

Son güncelleme: 2026-09-27 (birden fazla koleksiyon tamamlandı, `feat/collections`; sıradaki adım
paylaşım. ImageSharp lisans kararı ilk publish'ten önce verilecek)

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
     (dikdörtgen çerçeve), Kaydet'te yüklenir; yoksa son coin fotoğrafı "Otomatik" olarak kullanılır.
     API: `Collection.CoverImageId`/`CoverSizeBytes` (migration `AddCollectionCover`),
     `CollectionCoversController` (`PUT`/`DELETE`/`GET api/collections/{id}/cover?v=`), en fazla 1200×675
     WebP, büyütme yok, en az 320 px genişlik; kotaya dahil (`PhotoQuota`); koleksiyon silinince dosya
     da silinir. Koleksiyon sayfası başlığında küçük kapak. 21 kontrollük API testi, arayüz testi.
   - **Navbar** (kullanıcı isteği): yapışkan, bulanık arka planlı üst çubuk; ikonlu menü öğeleri (aktif
     sayfa amber hap), sağda baş harf avatarı + kullanıcı menüsü (ad, e-posta, Çıkış; Esc ve dışarı
     tıklama kapatır), mobilde tam genişlik menü.
   - Izgaradaki açıklamasız mavi nokta (hatıra göstergesi) fotoğrafın köşesinde "Hatıra" etiketi oldu.

## Sıradaki adım: Paylaşım (2. aşama, `feat/sharing`)

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
- **2. aşama – `feat/sharing`:** Koleksiyon başına görünürlük: Özel (varsayılan) / Sadece linkle (gizli,
  tahmin edilemeyen `/s/…` linki, yenilenebilir, Keşfet'te görünmez) / Herkese açık. Profil sayfası
  `/u/{kullanıcıadı}` (sadece kullanıcı adı görünür; ad, e-posta, doğum tarihi asla). Herkese açık
  koleksiyonlar giriş yapmadan da görülebilir, salt okunur. Keşfet: herkese açık koleksiyonlardaki tüm
  coin'ler, kullanıcı filtresiyle (zorunlu gereksinimdeki "kullanıcı filtresi"). Fotoğraf erişimi
  görünürlüğe göre; aşama sonunda güvenlik gözden geçirmesi. Watermark bu aşamayla konuşulur
  (Açık konular 8).

Diğer adaylar (sıra değişebilir): gelişmiş filtreler, istatistikler, referans katalog / eksik listesi.

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
9. İleride: e-posta doğrulama ve şifre sıfırlama, kayıt formunda kullanıcı adı/e-posta müsaitlik kontrolü,
   i18n (TR/DE/EN), Register'ın da `applyServerErrors` kullanması, mobilde katlanabilir filtre paneli.
10. **Euro dışı, tedavülden kalkmış ve antika coin'ler (ileride, 2026-09-27'de kullanıcı istedi):**
    Birden fazla koleksiyon bunun için temel. Gerekecekler: koleksiyona bir "tür" alanı (Euro / diğer);
    nominalin genelleşmesi (şu an Euro değerleri enum'u, `CK_Coins_Denomination`), ülkenin genelleşmesi
    (şu an 25 Euro ihraççısı, `Countries` tablosu; tarihî ülkeler de gerekebilir), yılın genelleşmesi
    (şu an 1999 ve sonrası, `CK_Coins_Year`; antikalarda tahmini yıl/dönem), para birimi. Euro'ya özgü
    kurallar (ulusal/ortak yüz, 2 € hatıra) sadece Euro türünde geçerli olmalı.

## Yayın öncesi yapılacaklar

İlk publish'ten önce tamamlanması gerekenler (ayrıntılar Açık konular'da):

- [ ] Hosting seçimi ("Hosting seçimi kontrol listesi").
- [ ] ImageSharp lisans anahtarı ya da SkiaSharp'a geçiş (Açık konular 1); `dotnet build -c Release`
      hatasız olmalı.
- [ ] Production connection string ve `PhotoStorage__RootPath` (site klasörü dışında) hosting panelinde.
- [ ] Angular derlemesinin `wwwroot`'tan sunulması ve SPA fallback (`MapFallbackToFile("index.html")`).
- [ ] Publish ayarında "hedefteki fazla dosyaları sil" kapalı (fotoğraflar `App_Data`'daysa).

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
fotoğraf boyut/tür/kota sınırları, gizlilik politikası ve iletişim sayfası, istatistikler, TR/DE/EN dil
desteği, karanlık mod, PWA.
