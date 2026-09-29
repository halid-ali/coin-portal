# Proje yönü değerlendirmesi (2026-09-29)

GitHub'a yayından önce kullanıcının sorduğu beş konunun değerlendirmesi: klasör yapısı, container,
sosyal özellikler ve yönetim paneli, sürümleme ve yayın süreci, mobil uygulama.

**Bu doküman dondurulmuştur.** O günün kod tabanına ve dış bilgilerine (fiyatlar, sürümler, platform
destekleri) göre yazıldı ve güncellenmez; durum değişirse yeni bir değerlendirme yazılır. Güncel sıra
ve kararların durumu [PROJECT_STATUS.md](../PROJECT_STATUS.md) "Yol haritası" bölümündedir.

Yöntem: her konu repo okunarak ayrı ayrı analiz edildi, ardından her analiz bağımsız bir karşı görüşle
çürütülmeye çalışıldı (dış iddialar web'de yeniden doğrulandı), en sonda konular arası çelişkiler
çözüldü. Aşağıdaki öneriler bu düzeltmelerden sonraki son hâldir. Yollar yazıldığı günkü düzeni
(`src/CoinPortal.Api`, `src/client`) gösterir.

## Özet

| Konu | Karar önerisi | Ne zaman |
|---|---|---|
| Klasör yapısı | `src/api` + `src/web` + `tests/` + `docs/` | Şimdi, GitHub'dan önce |
| Container | Şimdi yok; tetikleyici beklenir | Hosting Linux/PaaS'a dönerse |
| Sosyal + yönetim paneli | Kendi domain modeli, yerleşik yapı taşları; önce temel | Hosting'den sonra, aşamalı |
| Sürümleme / CI / deploy | Etiket = sürüm, git-cliff, ubuntu CI, elle ilk deploy | Hazırlık şimdi, CI push'la |
| Mobil | PWA önce, mağaza için TWA, Capacitor/iOS gerekçeyle | Manifest şimdi, gerisi sonra |

İki çapraz karar:

- **Tek kimlik doğrulama şeması cookie + antiforgery kalır.** Web, PWA, TWA ve Capacitor'ın cookie
  yolu bununla çalışır. Sosyal uçlar düz `[Authorize]` + policy ile yazılır; bugün bearer/JWT, CORS
  ya da "bearer'da antiforgery atla" kodu eklenmez. Böylece sosyal özellikler mobil kararını beklemez.
- **GitHub yayını ImageSharp engelini çözen en ucuz adımdır.** Six Labors açık kaynak ve "source
  available" projelere ücretsiz anahtar veriyor. Sıra: LICENSE → publish → bekleyen başvuruyu repo
  adresiyle güncelle → anahtar → CI Release. Publish'i hosting hazırlığına bağlamak yanlış sıra olur.

"Şimdi" olan işlerin tamamı (klasör, format, publish hazırlığı, sürüm araçları, pasif CI) lokalde ve
push'suz yapılabilir, toplam yaklaşık iki iş günü. GitHub yayınının kapısı teknik değil, Açık konular
2'deki yayın izni.

## 1. Klasör yapısı

### Öneri

```
coin-web-portal/
├── .config/dotnet-tools.json
├── .github/                 (sürüm/CI adımında)
├── docs/                    PROJECT_STATUS.md, reviews/
├── src/
│   ├── api/                 CoinPortal.Api.csproj (proje adı ve namespace'ler aynen)
│   └── web/                 Angular; *.spec.ts dosyaları kodun yanında kalır
├── tests/
│   ├── api/                 CoinPortal.Api.Tests.csproj (xUnit v3 + WebApplicationFactory)
│   └── e2e/                 Playwright
├── CoinPortal.slnx, global.json, nuget.config, Directory.Build.props (sürüm adımında)
└── .editorconfig, .gitignore, .gitattributes, CLAUDE.md, README.md, LICENSE, CHANGELOG.md
```

- Taşıma ucuz: Angular ve API yapılandırmaları klasör adına bağlı değil (`angular.json` `root: ""`,
  proxy sadece port, csproj sadece `DevData` / `App_Data`), fotoğraf yolu `ContentRootPath`'e göre
  çözülüyor, veritabanında mutlak yol yok. Klasör yolu geçen 7 dosyada 27 satır var: `CoinPortal.slnx`,
  `.gitignore`, `.vscode/settings.json`, `DevDataSeeder.cs` (yorum + hata mesajı), `CLAUDE.md`,
  `README.md`, `PROJECT_STATUS.md`. Ayrıca client'ta yol gibi yazılmış dört yorum
  (`auth.models.ts`, `settings.service.ts`: "Mirrors CoinPortal.Api/Contracts/…").
- İki commit: önce saf `git mv` (184 dosya rename olarak görünmeli), sonra referans düzeltmeleri. İçerik
  değişikliği taşıma commit'ine karışırsa `git log --follow` bazı dosyalarda rename'i kaybeder.
- Aynı turda: `.gitignore`'a `src/api/wwwroot/` (şablonda `#wwwroot/` yorumlu duruyor) ve
  `sixlabors.lic`; `dotnet-tools.json` → `.config/` (.NET geleneği); `src/client/.vscode/` şablonunun
  temizlenmesi (`launch.json` Karma'nın 9876 portuna işaret ediyor, proje Vitest kullanıyor).
- İsteğe bağlı: Angular proje adı `client` → `web` (`angular.json`'da 3 string). Değişirse derleme
  çıktısı `dist/web/browser` olur; wwwroot kopyalama ve workflow'lar bu karardan sonra yazılmalı.

### Elenenler

- **`backend/` + `frontend/`:** çalışır ama .NET'in `src/` + `tests/` geleneği bozulur, `tests/`
  kökte yalnız kalır; "frontend" mobil gelince belirsizleşir.
- **`apps/` + `packages/` (monorepo):** bugün `packages/` boş kalır ve JS monorepo aracı yok. Gerekirse
  sonra tek `git mv` ile geçilir.
- **`src/CoinPortal.Web` (.NET tarzı):** kabul edilebilir ikinci seçenek; npm dünyasında yadırganır.
- **Olduğu gibi bırakmak:** asıl şikâyet (tutarsız adlar) çözülmez; publish sonrası taşıma linkleri kırar.
- **Angular `*.spec.ts` dosyalarını `tests/`'e taşımak:** Angular stil rehberi açıkça "unit test kodun
  yanında" der; `tsconfig.spec.json` `src/**/*.spec.ts` ile keşfediyor, testler göreli import ve
  `core/i18n/testing.ts` yardımcısını kullanıyor. `tests/` derlemenin parçası olmayan testler içindir.
- **`Directory.Packages.props` / kök `.editorconfig` taşıma branch'inde:** iki .NET projesi için
  merkezi paket yönetimi fazla tören. Kök `.editorconfig` `insert_final_newline` getirir; eski C#
  dosyalarında dosya sonu satır sonu olmadığı için her kaydediş ilgisiz diff üretir. Ayrı bir
  normalizasyon commit'inde yapılır.

### Tuzaklar

- Windows, bir sürecin çalışma dizini olan klasörü yeniden adlandırmaz. API ve `ng serve` durdurulmalı
  **ve** tüm terminaller (VS Code entegre terminalleri dahil) repo köküne çıkmalı.
- Mutlak yol içeren önbellekler taşımadan sonra silinir: `bin/`, `obj/`, `.angular/`, `dist/`,
  `node_modules/.vite`, `node_modules/.vitest`.
- Kontrol: `git grep -n -E 'src/client|src/CoinPortal\.Api'` boş dönmeli; Claude Code hafızasındaki
  çalıştırma notları da güncellenmeli (repo dışında, `git grep` görmez).
- Test projesinde `WebApplicationFactory`'nin son çare content root araması `*.sln` ve
  `<çözüm>/CoinPortal.Api` bekler; `.slnx` + `src/api` ile bulamaz. Factory'de açık `UseContentRoot`
  verilmeli. `Program.cs`'e `public partial class Program { }` gerekir.
- `xunit3` şablonu SDK'da yerleşik değil (`dotnet new install xunit.v3.templates`); csproj elle de
  yazılabilir (`xunit.v3`, `xunit.runner.visualstudio`, `Microsoft.NET.Test.Sdk`,
  `Microsoft.AspNetCore.Mvc.Testing`, `OutputType=Exe`).
- E2E testleri seed kullanıcılarıyla dev veritabanında koşarsa kullanıcının deneme verisini sıfırlar.
  Ayrı veritabanı (`CoinPortal_E2E`) ve geçici fotoğraf kökü ortam değişkeniyle verilir.
- Playwright lokalde `channel: 'msedge'` ile kurulu Edge'i kullanır. `npx playwright install msedge`
  sistemdeki Edge'in üzerine yazar; çalıştırılmamalı.

## 2. Container

### Öneri

Şimdi container'a geçilmez; karar "ertelendi, tetikleyici bekliyor" olarak kaydedilir.

- Hedef paylaşımlı Windows hosting (IIS in-process). Orada container çalışmaz; container'la üretime
  yaklaşılmaz, uzaklaşılır.
- Tek geliştirici, LocalDB + iki terminal akışı çalışıyor. Container'ın ilk gerçek faydası CI'da:
  GitHub Actions'ta SQL Server service container'ıyla backend testleri. Bunun için Dockerfile ya da
  lokal Docker gerekmez.
- Geliştirme makinesinde container runtime kurulumu kısıtlı. Masaüstü runtime'lar (Docker Desktop,
  Rancher Desktop, Podman Desktop) yönetici yetkisi ister; Docker Desktop ayrıca 250+ çalışanlı veya
  10 M$+ gelirli şirketlerde ücretli abonelik ister. Kurulum yolu açılırsa en hafifi mevcut WSL2 Ubuntu
  içinde Desktop'sız Docker Engine.
- Container imajı Release derlemesidir; ImageSharp anahtarı olmadan üretilemez.

Tetikleyiciler: hosting Linux/PaaS'a dönerse; sosyal özellikler ölçülebilir bir worker/backplane
ihtiyacı doğurursa; CI parity için lokal test DB istenirse (LocalDB varsayılan kalır).

İmaj gerekirse Dockerfile yerine .NET SDK'nın `dotnet publish /t:PublishContainer` hedefi kullanılır;
`ContainerArchiveOutputPath` ile daemon olmadan da OCI arşivi üretir. Ön koşullar: wwwroot sunumu +
SPA fallback, `.gitignore`'da wwwroot, ImageSharp kararı.

### Elenenler

- **Sadece dev DB container'da (compose):** backend testleri ve CI gelince anlamlı; bugün LocalDB'nin
  yerine daha ağır bir şey koyar. Test projesi bağlantı dizesini ortam değişkeninden okursa compose hiç
  gerekmeyebilir. Test edilmemiş compose repoya girmez.
- **API'yi geliştirmede container'a almak:** hot reload ve proxy akışı bozulur, `/mnt/c` bind mount'u
  yavaş, WSL'de ikinci .NET/Node kurulumu gerekir.
- **Windows container'ları:** IIS'e benzer görünür ama yönetici + Docker Desktop ister, paylaşımlı
  hostingde karşılığı yok.
- **Dev container / Codespaces:** publish sonrası isteğe bağlı, sadece temiz ortam denemesi için
  (Free hesapta ayda 120 core-saat).
- **Üretimde container (VPS):** sunucu bakımı geliştiriciye geçer; "kendi sunucum yok" tercihine ters.
  Bu yol düşünülürse Azure App Service gibi PaaS da tabloya girmeli.
- **Azure SQL Edge:** 30 Eylül 2025'te emekli edildi.

### Tuzaklar ve bulgular

- **Collation:** kod veritabanı collation'ına dayanıyor (`AppDbContext` unique index ve `CoinListing`
  arama, ikisi de "varsayılan collation büyük/küçük harf duyarsız" varsayımıyla). LocalDB en-US
  kurulumda `SQL_Latin1_General_CP1_CI_AS`; Türk hostinglerde `Turkish_CI_AS` yaygın ve I/ı, İ/i
  eşleşmesini değiştirir. Hosting kontrol listesine girmeli; test için container kullanılırsa
  `MSSQL_COLLATION` hostingin collation'ıyla verilir.
- **DataProtection anahtarları:** hostingde (profil yüklenmeyen app pool) ve container'da varsayılan
  anahtar yeri kalıcı olmayabilir; her yeniden başlatmada oturum ve antiforgery token'ları düşer.
  `PersistKeysToFileSystem` (yol config'den) + Windows'ta `ProtectKeysWithDpapi()` yayın öncesi
  listesine girer; şifrelenmeden yazılan anahtar düz XML kalır.
- **Forwarded headers:** doğrudan IIS'te gerekmez. `CookieSecurePolicy.Always` Secure bayrağını
  isteğin şemasına bakmadan koyar ve `UseHttpsRedirection` https portu bilinmeyince yönlendirme yapmaz;
  yani proxy arkasında cookie düşmez. Önüne CDN/proxy konursa `UseForwardedHeaders` + `KnownProxies`
  gerekir (rate limiter IP'yi doğru görsün diye); her proxy'ye güvenen ortam değişkeni kullanılmaz.
- SkiaSharp'a geçilirse Linux'ta `NativeAssets.Linux.NoDependencies` paketinin font yöneticisi boştur;
  dinamik yazılı watermark planıyla çelişir. Windows hostingde önemsiz.

## 3. Sosyal özellikler ve yönetim paneli

### "Hazır kütüphane vardır" beklentisi

Kısmen doğru. .NET'te yorum + beğeni + takip + bildirim veren bir paket yok ve olmaması normal: bu
tablolar uygulamanın kendi domain'idir (yorum neye bağlanır, koleksiyon Private olunca ne olur gibi
kararlar ürüne aittir). Olan şey yapı taşları: Identity rolleri ve `[Authorize(Roles)]`, yerleşik rate
limiter (paket gerekmez), `IEmailSender` + token provider'lar, .NET 10'un yerleşik SSE'si
(`TypedResults.ServerSentEvents`), SignalR, Serilog, OpenTelemetry. Serilog ve OpenTelemetry
Apache-2.0, MailKit MIT; hiçbirinde lisans anahtarı derdi yok.

### Öneri: sıra ve kapsam

0. **Temel (hosting'e çıkışı bloklar, GitHub'ı değil):** GDPR bugün zaten geçerli (ad, soyad, doğum
   tarihi, e-posta tutuluyor). Gizlilik + iletişim sayfası (4 dil), hesap silme
   (`DELETE api/settings/account`, fotoğraf dosyaları `IPhotoStorage` ile) + veri dışa aktarma, rate
   limiter (`public` ve `auth` politikaları), Serilog dosya logu site klasörü dışında, isteğe bağlı
   Cloudflare Turnstile kayıt formunda.
1. **Admin rolü ve arayüzsüz panel:** migration'da literal `Admin` rolü; ilk admin hosting DB
   panelinden tek INSERT ya da `Admin:BootstrapUserName` config'iyle (komut satırı anahtarı IIS'te
   çalışmaz). `me` yanıtında roller, `adminGuard`, `NAV_ITEMS`'ta rol bayrağı. `api/admin/users`
   (kilitleme: `LockoutEnd` + `UpdateSecurityStampAsync`), `api/admin/stats`, `AuditLog` tablosu.
   Angular `/admin` alanı (lazy, Ayarlar'ın alt rota deseni) şikayet kuyruğuyla birlikte gelir.
2. **Koleksiyoncuya özgü, serbest metinsiz özellikler:** `Coin.Quantity > 1` üzerinden "fazlalarım /
   takas listesi", referans katalogla "eksiklerim / istek listesi" ve ikisinin eşleşmesi. Moderasyon
   yükü yok, Public görünürlükle uyumlu, koleksiyoncuya beğeniden çok değer verir. Ardından takip
   (`Follows`, Id ile). Takipten önce profil koleksiyondan bağımsız var olmalı: bugün Public koleksiyonu
   olmayan kullanıcının profili 404. Feed = Keşfet + takip filtresi, yeni tablo gerekmez.
3. **Bildirim:** `Notifications` tablosu, header'da zil; kanal sırası polling → SSE → SignalR (hosting
   WebSocket'i doğrulanınca). Web Push mobil konusunda.
4. **Yorum en son ve bölünmez paket:** `Comments` (soft delete, yalnız Public içerik, koleksiyon
   sahibine yorumları kapatma), `Reports`, `Blocks`, moderasyon kuyruğu, Akismet + Turnstile, e-posta
   doğrulama (yazma yetkisi `VerifiedUser` policy). E-posta doğrulama kendi alan adı + SPF/DKIM ister.

Her aşama kendi `feat/` branch'i, migration'ı, minor sürümü ve erişim testleriyle.

### Elenenler

- **Stream (getstream.io):** ücretsiz kullanım "Maker" koşullarına bağlı (≤5 kişi, <10 k$/ay gelir,
  <100 k$ yatırım); Feeds'in ilk ücretli planı yıllık faturada 499 $/ay; AB veri bölgesi yalnız
  Enterprise'da. Veri üçüncü tarafta, yönetim paneli göremez, görünürlük kuralı orada yok.
- **Cusdis:** Temmuz 2026'da arşivlendi.
- **Remark42 / Comentario:** Windows binary'si var ama ayrı uzun ömürlü süreç ister; paylaşımlı
  hostingde çalıştırılamaz. Remark42'nin son sürümü Eylül 2024.
- **Disqus:** ücretsiz planda reklam ve izleme; ikinci kimlik; yorumlar bizim DB'de değil.
- **Firebase / Supabase:** ikinci veritabanı, ikinci kimlik, `CanView` kuralı ikinci kez yazılır.
- **Ayrı admin SPA / Razor Pages admin:** ikinci build veya ikinci UI teknolojisi; tek geliştirici için
  gereksiz.
- **`MapIdentityApi`:** register sözleşmesi projenin kayıt formuna uymuyor (ad, soyad, doğum tarihi,
  dil, ilk koleksiyon yok). Bearer modu (`AddBearerToken`) ileride native mobil gerekirse not edildi.
- **Feed/bildirimle başlamak, SignalR'ı ilk gün eklemek:** en pahalı ve en az değerli kısım.

### Veri modeli tuzakları

- **SQL Server çoklu cascade yolu (hata 1785):** `Comments` (CoinId→Coins→Users ve AuthorId→Users),
  `Follows`/`Blocks` (Users'a iki FK), `Notifications` (UserId, ActorId) migration'da patlar. Proje bu
  yüzden Coin→Collection'ı Restrict yapmıştı. Users'a giden ikinci FK NoAction olur; hesap silme ucu
  bu kayıtları tek transaction'da elle temizler ya da anonimleştirir.
- **Polimorfik hedef (TargetType + TargetId) yerine** ayrı nullable FK sütunları + "tam biri dolu" check
  constraint (mevcut `CK_*` deseni). Aksi hâlde silinen coin/koleksiyon yetim kayıt bırakır.
- **Coin taşınabilir:** beğeni/yorum bağlı bir coin Private koleksiyona taşınabilir; sayaçlar ve
  bildirim linkleri her zaman koleksiyon görünürlüğüyle join edilir.
- **Kilit ve rol gecikmesi:** SecurityStampValidator varsayılan 30 dakikada bir doğrular; admin kilidi
  ve yeni rol `UpdateSecurityStampAsync` çağrılmazsa 30 dakikaya kadar etkisiz kalır.
- **404 / 403 kuralı genişler:** görünmeyen kaynak → 404 (mevcut kural); görünen ama yetkisiz işlem
  (başkasının yorumunu silmek) → 403. CLAUDE.md'ye yazılmalı.
- **Kullanıcı adıyla adreslenen uçlar:** takip/engel tabloları Id tutar; kullanıcı adı sadece URL'de
  (profil düzenlemede ad değişebilir).
- **Rate limiter:** in-memory, app pool geri dönüşümünde sıfırlanır; CDN arkasında `KnownProxies`
  olmadan herkes tek kovaya düşer; anahtar sayısı sınırlanmalı.

### İşletme maliyeti

Asıl maliyet kod değil: moderasyon, e-posta teslimi (hosting SMTP'si genelde spam'e düşer; Brevo
300/gün + logo, Resend 3.000/ay + günde 100, Postmark 100/ay), hukuki metinler. Operatör Almanya'daysa
Impressum ve DSA yükümlülükleri kontrol edilmeli (hobi siteleri için kapsam tartışmalı, doğrulanmadı).

### Açık kararlar

Yorum neye bağlanır (öneri: önce coin); kim yazabilir (öneri: doğrulanmış e-posta); koleksiyon
sahibinin yetkileri; Public'ten çıkınca yorumlar gizlenir mi silinir mi (öneri: gizlenir); tek
"beğen" mi emoji mi; takip tek yönlü mü; profilde bio/avatar; şikayet nedenleri ve içerik kuralları
metni; bildirim kanalı; admin paneli dili; e-posta sağlayıcısı; ilk sosyal adım olarak takas/istek
listesi.

## 4. Sürümleme, changelog, CI ve deploy

### Öneri

- **Sürüm:** tek ürün, tek SemVer; git etiketi (`v0.x.y`) tek doğruluk kaynağı. Kökte
  `Directory.Build.props` yalnızca sürüm özelliklerini taşır: MinVer (etiketten türetir,
  `MinVerTagPrefix=v`) ya da düz `<Version>` + deploy'da `-p:Version=$(git describe --tags)`. `+sha`
  ekini MinVer değil .NET SDK'nın gömülü Source Link'i ekler. `package.json` 0.0.0 kalır (paket değil).
  `/api/health` `version` döner (deploy doğrulaması); footer sürümü `ng build --define APP_VERSION=…`
  ile bundle'a gömülür. İkisi farklıysa deploy eksiktir.
- **Changelog:** commit'ler neredeyse tamamen Conventional Commits. git-cliff (`npx git-cliff`) ile
  Keep a Changelog biçiminde, geriye dönük ilk sürüm `v0.1.0`; `v1.0.0` ilk gerçek yayında.
  `cliff.toml`'da `[bump] breaking_always_bump_major = false` (varsayılan true, 0.x'te `feat!:` 1.0.0'a
  zıplatır). Merge ve `docs: record` commit'leri `skip` yerine şablonda gösterilmeyen bir gruba
  konur: git-cliff #816 açık hatası, etiket atlanan bir commit'e düşünce `--bumped-version`'ı 0.1.0'a
  döndürür. Bump kararı elle de verilebilir.
- **Merge mesajı:** `--no-ff` kalır, mesaj git varsayılanına döner (`Merge branch 'feat/x'`). Mevcut
  `feat: merge x` biçimi changelog araçlarında mükerrer satır üretir (release-please'e geçişi de
  zorlaştırır).
- **CI (GitHub Actions, ubuntu):** `push main` + `pull_request`, action'lar `@v5`. Job `api`:
  `fetch-depth: 0` (MinVer), `setup-dotnet` `global-json-file`, `dotnet build -c Debug`,
  `dotnet ef migrations has-pending-model-changes` (sahte `ConnectionStrings__DefaultConnection` ile),
  test projesi gelince `dotnet test`. Job `client`: `npm ci`, `prettier --check` (CLAUDE.md'deki komutla
  aynı glob), `ng build --configuration production`, `ng test --watch=false`. Workflow'lar push'tan
  önce yazılır, push'a kadar pasif; README'de "CI henüz pasif" notu. Dependabot: nuget, npm,
  github-actions; gruplu.
- **Release:** ImageSharp kararından sonra. `pull_request` Debug'da kalır (fork'ta secret yok);
  tag `v*` → `ng build` → `dotnet publish -c Release` (RID'siz; IIS framework-dependent) → idempotent
  `migrate.sql` (`dotnet ef migrations script --idempotent`) → GitHub Release. Anahtar
  `SIXLABORS_LICENSE_KEY` secret'ı.
- **Deploy:** ilk yayın elle, `scripts/deploy.ps1` + Web Deploy publish profile
  (`SkipExtraFilesOnServer`, `EnableMSDeployAppOffline`, `App_Data` hariç); migration `migrate.sql`
  ile; `GET /api/health` sürüm kontrolü. `deploy.yml` (`workflow_dispatch`, windows runner, msdeploy)
  ancak hosting msdeploy veriyorsa ve bilgilerin GitHub secret olması kabul edilirse. Hosting sadece
  FTP ya da Plesk Git/zip veriyorsa ona göre.
- **Public repoda:** secret scanning + push protection, Dependabot alerts, ruleset (main'e force-push
  yasak, CI status check zorunlu).

### Elenenler

- **semantic-release:** her push'ta sürüm (hobi projede gürültü), Node eklenti zinciri, squash bekler.
- **release-please (şimdilik):** push ve Actions olmadan çalışmaz; squash-merge önerir. GitHub'a
  çıkınca ikinci adım olabilir, etiket ve CHANGELOG biçimi uyumlu.
- **commit-and-tag-version:** aktif bakımlı ama kök Node bağımlılığı ve `Directory.Build.props` için
  özel updater ister.
- **Nerdbank.GitVersioning:** patch numarası commit sayısı olur, changelog üretmez.
- **Elle CHANGELOG:** temiz conventional commit disiplinini boşa harcar.
- **husky / commitlint / lint-staged:** commit'ler zaten onaylı ve tutarlı; kök Node bağımlılığı ekler.
- **NuGet lock dosyası (`--locked-mode`):** `-r win-x64` publish'le NU1004 verir, Dependabot PR'larında
  bilinen kırılmalar var; tek projeli uygulamada restore zaten kısa.
- **`TreatWarningsAsErrors`:** ImageSharp'ın Debug'daki lisans uyarısı derlemeyi kırar.
- **`Database.Migrate()` açılışta:** hosting'in DB erişim cevabı gelmeden varsayılan yapılmaz.

### Önce yapılması gereken temizlik

- `prettier --check` bugün 6 ts dosyasında (`auth.guards.ts`, `auth.interceptor.ts`,
  `confirm-dialog.service.ts`, `validators.ts`, `validators.spec.ts`, `main.ts`) ve 7 html şablonunda
  başarısız. CI'dan önce bir kerelik format commit'i şart; html kararı ne olursa olsun CLAUDE.md'deki
  komut ile CI glob'u aynı kalmalı.
- `core.ignorecase=true`: Linux CI'da import yolu büyük/küçük harf hataları ilk kez görülebilir.
- `package.json` `allowScripts` sürüme sabit; npm 12'ye geçilince Dependabot bump'larında güncellenmeli.

### Maliyet (doğrulama günü)

Public repoda GitHub-hosted standart runner'lar ücretsiz ve sınırsız. Private Free planda ayda 2000
dakika, Windows 2x, macOS 10x sayılır. Ruleset / branch protection Free planda sadece public repoda.

## 5. Mobil

### Öneri

- **PWA, iki adımda.** 1a (hemen, yarım gün): `public/manifest.webmanifest` (standalone, theme color,
  192/512 + maskable ikonlar, screenshots) + `index.html` meta (`<title>` bugün "Client",
  `theme-color`, `apple-touch-icon`). Chrome 108+/112+ service worker olmadan da kurulum sunar.
  1b (hosting HTTPS'e girince, 1 gün): `ng add @angular/pwa`, ngsw-config'de uygulama kabuğu + lazy
  i18n chunk'ları, fotoğraf önbelleği **yok** (özel fotoğraflar çıkıştan sonra da önbellekte kalırdı),
  `SwUpdate` "yeni sürüm" çubuğu, varsayılan `registerWhenStable`. API: statik dosyalar fallback'ten
  önce, `index.html` / `ngsw.json` / `ngsw-worker.js` için `no-cache` (`OnPrepareResponse`), hash'li
  dosyalar `immutable`.
- **Web Push:** bildirim modelinden sonra (`PushSubscriptions`, VAPID, `Lib.Net.Http.WebPush` ya da
  `Lib.AspNetCore.WebPush`, Ayarlar > Bildirimler). iOS'ta yalnızca ana ekrana eklenmiş web
  uygulamasında (16.4+).
- **Play Store: önce TWA** (Bubblewrap / PWABuilder). PWA'yı gerçek origin'le Chrome'da açar; backend
  ve auth değişmez, cookie + antiforgery çalışır. `/.well-known/assetlinks.json` API'den fallback
  dışında sunulur.
- **Capacitor:** yalnızca native eklenti gerekince. Önce cookie'yi koruyan yol bir günlük prototiple
  denenir (`server.hostname` = site alan adı, `androidScheme: 'https'`, CapacitorHttp/CapacitorCookies).
  Bearer + CORS + antiforgery atlama yalnızca o başarısızsa. Ek hazırlık: `shareLink()` bugün
  `window.location.origin` kullanıyor (Capacitor'da `capacitor://localhost` üretir), minimum sürüm
  kapısı (`api/meta`). Proje klasörü `src/mobile`.
- **iOS:** ayrı bütçe ve karar. Windows'tan derlenemez: GitHub Actions macOS (public repoda ücretsiz)
  ya da Codemagic. App Store 4.2 (minimum işlevsellik, "sarılmış web sitesi") için native değer (push,
  kamera, paylaşım, çevrimdışı) hazır olmadan başvurulmaz.

### Mobilden bağımsız, bugün düzeltilebilecekler

- `validatePhotoFile` orijinal dosyaya 10 MB ve `file.type` kontrolü uyguluyor; 48–50 MP telefon
  JPEG'i kırpma açılmadan reddedilir. Kırpma çıktısı zaten en fazla 1600 px JPEG (kalite 92) ve sunucu
  sınırı ona uygulanıyor. Orijinal dosya boyut kontrolü kaldırılmalı, tür kontrolü cropper'ın
  `loadImageFailed`'ine bırakılmalı. Android'de HEIC seçilirse (Chrome canvas'a dekode edemez)
  anlaşılır hata metni. iOS güvenli: `accept` listesinde HEIC yokken seçim anında JPEG'e çevirir;
  `accept`'e HEIC eklenmemeli.
- Login'de "beni hatırla" varsayılan kapalı, kayıt sonrası oturum kalıcı değil. Ana ekran uygulaması
  kapatılıp açılınca giriş düşer; standalone modda kalıcı cookie varsayılanı ya da seçeneğin öne
  çıkarılması.
- Hesap silme ve gizlilik URL'si hem mağazaların şartı (Apple 5.1.1(v) uygulama içi silme; Google Play
  tarayıcıdan erişilen silme sayfası) hem GDPR gereği; sosyal konudaki temel aşamayla birlikte.

### Elenenler

- **Web istemcisini JWT/localStorage'a çevirmek:** aynı origin için cookie doğru ve daha güvenli.
- **Ionic:** UI kiti Tailwind token tasarım sistemiyle çakışır; pratikte ikinci arayüz.
- **.NET MAUI (XAML / Blazor Hybrid):** Angular arayüzü ikinci kez yazılır; iOS yine Mac ister.
- **Flutter / React Native / NativeScript:** mevcut Angular yatırımı sıfırlanır; backend değişiklikleri
  yine gerekir.
- **Ionic Appflow:** Şubat 2025'ten beri yeni müşteri almıyor, EOL 31.12.2027.
- **API taban adresi token'ını şimdiden eklemek:** Capacitor kararına kadar YAGNI.

### Maliyet ve süreç (doğrulama günü)

Google Play kaydı 25 $ tek sefer; 13.11.2023 sonrası açılan kişisel hesaplar üretime geçmeden 12 test
kullanıcısıyla 14 gün kesintisiz kapalı test yapar. Apple Developer Program 99 $/yıl. Capacitor 8
(Aralık 2025): iOS'ta SPM varsayılan. iOS 26 ana ekrana eklenen her siteyi web uygulaması olarak açar.

## Birleşik yol haritası

1. **Yayın izni** (Açık konular 2), diğer adımlarla paralel. 7. adımı bloklar.
2. **`chore/folder-layout`:** klasör taşıması (bölüm 1). API ve `ng serve` durdurulur.
3. **`chore/format`:** 6 ts dosyası Prettier, C# dosya sonu satır sonları, kök `.editorconfig`; html
   şablonları için karar.
4. **`chore/publish-prep`:** LICENSE, İngilizce README ("Repository layout", "Docker gerekmez", "CI
   pasif", iç dokümanların Türkçe olduğu notu), dokümanlarda ortama özel notların nötrleştirilmesi,
   `index.html` başlığı ve meta.
5. **`chore/release-tooling`:** `Directory.Build.props` (sürüm), health + footer sürümü, `cliff.toml`,
   CHANGELOG, `v0.1.0` etiketi; CLAUDE.md'ye merge mesajı, sürüm kuralı ve "tek auth şeması cookie".
6. **`chore/ci`:** pasif `ci.yml`, `dependabot.yml`, sırsız `appsettings.Production.json`.
7. **GitHub publish:** boş repo, sadece `main` ve etiket push edilir (`git push --all` değil); secret
   scanning, ruleset; Six Labors başvurusu repo adresiyle güncellenir.
8. **`feat/api-tests`, `feat/e2e-tests`:** `tests/api`, `tests/e2e` (geliştirme 7'den önce başlayabilir).
9. **`feat/hosting-foundation`:** rate limiter, Serilog, gizlilik + iletişim, hesap silme + dışa
   aktarma, DataProtection, wwwroot + SPA fallback + cache başlıkları, fotoğraf 10 MB düzeltmesi, beni
   hatırla, PWA 1a, isteğe bağlı Turnstile.
10. **ImageSharp kararı → CI Release + `release.yml`.** Publish'ten ~3 hafta sonra cevap yoksa
    `chore/skiasharp`.
11. **Hosting seçimi → `deploy.ps1` → `v1.0.0` → PWA 1b → sonra `deploy.yml`.**
12. **Admin rolü + `api/admin/*`** (arayüzsüz).
13. **Sosyal A:** takas / istek listesi / eşleşme, profilin koleksiyondan bağımsızlaşması, takip, feed.
14. **Bildirim + Web Push.**
15. **Yorum + şikayet + engelleme + moderasyon paneli + e-posta doğrulama** (alan adı + SPF/DKIM).
16. **Mağaza:** TWA → gerekirse Capacitor (cookie yolu önce) → iOS ayrı bütçe.
17. **Koşullu:** container/PaaS yeniden değerlendirme, yalnızca tetikleyiciyle.

GitHub yayınını **beklemeyenler**: testler, CI'ın aktifleşmesi, service worker, rate limiter, hesap
silme, gizlilik sayfası, DataProtection, wwwroot, ImageSharp, hosting. Bunlar hosting'e çıkışı
bloklar; mevcut kod bugünkü hâliyle yayınlanabilir.

## Hosting kontrol listesine eklenecek sorular

- MSSQL collation'ı ne? (bölüm 2)
- WebSocket / uzun bağlantı (SSE, SignalR) destekleniyor mu, sınırı ne?
- Plesk mi; Git deploy ya da zip import var mı; msdeploy uzaktan erişimi açık mı?
- DB paneline SQL çalıştırılabiliyor mu? (idempotent migration betiği, ilk admin ataması)
- Sitenin önüne CDN/proxy konacak mı? (`KnownProxies`)
- SkiaSharp'a geçilirse native DLL çalıştırılabiliyor mu?

"Yayın öncesi yapılacaklar"a eklenecekler: gizlilik + iletişim sayfası, hesap silme + dışa aktarma,
rate limiter, DataProtection anahtar yolu, `.gitignore`'da wwwroot ve `sixlabors.lic`.

## Kullanıcıdan beklenen kararlar

- Klasör adları (`api` / `web` önerilen) ve Angular proje adının `web` olması.
- Html şablonlarının Prettier'dan geçirilmesi.
- LICENSE türü (MIT önerilen; AGPL alternatif).
- Repo public mi private mi; CLAUDE.md ve PROJECT_STATUS public kalsın mı (öneri: evet, ortama özel
  notlar nötrleştirilerek).
- MinVer mi düz `<Version>` mı; merge mesajının git varsayılanına dönmesi.
- Mağaza gerçekten hedef mi, yoksa "telefona yüklenebilir" yeterli mi.
- Sosyal katmanda ilk adım olarak takas / istek listesi.
