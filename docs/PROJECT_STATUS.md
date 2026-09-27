# Coin Web Portal - Proje Durumu ve Kararlar

Son güncelleme: 2026-09-27 (Claude Code'a geçildi; akış testi olarak koleksiyon tablosuna sütun
sıralaması ve sabit sütun genişlikleri eklendi)

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
- **Fotoğraf (planlanan):** Kırpma istemcide ngx-image-cropper ile (1:1). Boyutlandırma sunucuda
  (ImageSharp gibi): thumbnail 150x150, preview 600x600, fullscreen en fazla 1600x1600. EXIF temizlenecek.
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

## Sıradaki adım: Fotoğraf yükleme (`feat/coin-photos`)

1. Backend: `Coin`'e görsel alanları (üç boyutun yolları veya tek görsel anahtarı) + migration. Yükleme
   endpoint'i (ör. `POST api/coins/{id}/photo`, multipart), sadece JPG/PNG, boyut sınırı, ImageSharp ile
   150/600/1600 px, EXIF temizleme, dosyalar `wwwroot` dışında saklanıp kontrollü sunulur, coin silinince
   dosyalar da silinir. Antiforgery multipart isteklerde de geçerli.
2. Client: ngx-image-cropper ile 1:1 kırpma, formda önizleme, listede thumbnail, tam ekran görüntüleme.
3. Karar verilecekler: dosya saklama yeri ve adlandırma (GUID), hostingde yazma izni, kota.

Sonraki adaylar (sıra değişebilir): liste/tablo/kart görünüm seçimi ve gelişmiş filtreler, görünürlük
ayarı ve paylaşılabilir profil sayfası (diğer kullanıcıların koleksiyonları, kullanıcı adına göre filtre).

## Açık konular

1. **Şirket politikası:** Kişisel projeyi şirket bilgisayarında geliştirme, GitHub'a push ve yapay zeka
   asistanı kullanımı yönetici/IT ile netleştirilecek. Cevaba kadar repo **sadece lokal**, push yok.
2. **Hosting seçilmedi.** Kriterler: .NET 10, MSSQL (veya MySQL/PostgreSQL), SSL + özel alan adı,
   FTP/Web Deploy, uygulama klasörüne yazabilme (fotoğraflar), yeterli disk.
3. GitHub'a yayınlarken: **boş** repo, sonra `git remote add origin <url>` ve `git push -u origin main`.
4. **Production connection string:** `appsettings.Production.json` veya hosting paneli ortam değişkeni;
   parolalı connection string repoya girmeyecek.
5. **Yayında SPA fallback:** `MapFallbackToFile("index.html")`.
6. **Backend testleri yok.** Bir test projesi (xUnit + `WebApplicationFactory`) eklenmesi değerlendirilebilir.
7. İleride: e-posta doğrulama ve şifre sıfırlama, kayıt formunda kullanıcı adı/e-posta müsaitlik kontrolü,
   i18n (TR/DE/EN), Register'ın da `applyServerErrors` kullanması, mobilde katlanabilir filtre paneli.

## Web uygulamasının kapsamı

Zorunlu gereksinimler: JPG/PNG yükleme, 1:1 kırpma ve üç boyut, kayıt formu (isim, soyisim, kullanıcı adı,
benzersiz e-posta, doğum tarihi, en az 18 yaş), Tailwind ile stil, yükleme formunda başlık ve açıklama,
liste/tablo/kart görünümü, filtreler (nominal, ülke, kullanıcı, yıl).

Önerilen ek özellikler: "Bende var mı?" hızlı kontrol, görünürlük ayarı (herkese açık / sadece linkle /
özel) ve paylaşılabilir profil sayfası, ülkeye göre eksik listesi için referans Euro coin kataloğu,
fotoğraf boyut/tür/kota sınırları, gizlilik politikası ve iletişim sayfası, istatistikler, TR/DE/EN dil
desteği, karanlık mod, PWA.
