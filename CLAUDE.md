# CLAUDE.md

CoinVitrine (https://coinvitrine.com): kullanıcıların kendi madeni para koleksiyonlarını (Euro ve diğer
coin'ler) yönettiği web uygulaması. Tek repo: ASP.NET Core Web API (.NET 10) + Angular 21 SPA + SQL Server.
Eski adı Coin Portal (2026-10-03'e kadar). **Sadece görünen ad değişti:** arayüz, sayfa başlığı
(`APP_NAME`, `core/i18n/translated-title-strategy.ts`), manifest, metinler, README, dışa aktarma
ZIP'inin adı. İç adlar bilerek `CoinPortal`/`coinportal` kaldı: namespace ve proje adları,
cookie'ler (`coinportal.auth`, `coinportal.af`), localStorage anahtarları, DataProtection uygulama
adı, log dosyaları, veritabanı, paket ve yayın paketi adları, GitHub reposu. Bunları değiştirmek
oturumları ve kayıtlı tercihleri sıfırlar; yeni kodda da aynı iç adlar kullanılır.

**Her oturumun başında [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) dosyasını oku.** Orada güncel durum,
tamamlanan özellikler, sıradaki adım, açık konular ve alınmış kararların gerekçeleri var. Bu dosya
(CLAUDE.md) ise değişmeyen kuralları ve komutları tutar.

## Çalışma kuralları

- Kullanıcıyla iletişim **Türkçe**. Koddaki yorumlar, commit mesajları, branch adları **İngilizce**.
- Arayüz dört dilde: İngilizce (varsayılan), Türkçe, Almanca, Bulgarca. Metinler
  `src/web/src/i18n/<dil>.json` içinde; kaynak dil Türkçe. Yeni bir metin dört dosyaya birden eklenir
  (test anahtar/parametre eşliğini kontrol eder). Çeviri kuralları "Client kuralları"nda.
- Kullanıcıya verilen terminal komutları **Git Bash** sözdiziminde (`/c/repos/...`).
- Büyük bir değişiklikten önce kısa bir plan sun, kullanıcı onaylayınca uygula. Karar kullanıcıya aitse
  (UX, kapsam, kütüphane seçimi) sor; teknik varsayılanı belli olan konularda sorma, seçip söyle.
- Kodu değiştirdikten sonra doğrula: backend için `dotnet build` ve `dotnet test`, client için `ng build`,
  `ng test` ve `npx prettier --check "src/**/*.{ts,html,css}"` (CI bununla kırılır).
  Doğrulanamayan bir şey varsa (ör. tarayıcıda görsel kontrol) bunu açıkça söyle.
- Bir özellik ya da anlamlı bir adım bitince [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) güncellenir
  (tamamlananlar, yeni kararlar, açık konular, sıradaki adım, "Son güncelleme" satırı). O iş yüzünden
  eskiyen satırlar da taranır: Yol haritası, Aksiyon planı, Açık konular, Yayın öncesi yapılacaklar, kapsam
  listesi ve buradaki "Mimari" listeleri (rotalar, klasörler, politikalar, hata kodları).
  Kalıcı bir kural veya tuzak öğrenildiyse bu dosyaya eklenir.

## Çalışan uygulamalar

Kullanıcı API'yi (`dotnet run --launch-profile http`, 5080) ve client'ı (`ng serve`, 4200) kendi
terminallerinde sürekli çalışır halde tutuyor; e-posta denemelerinde ayrıca smtp4dev'i (5050, "Komutlar").

- Bunları durdurmak gerekirse (ör. `bin/` kilidi, migration, API'nin yeni kodla yeniden başlaması)
  **önce kullanıcıya sor**, sadece onay verirse durdur.
- Kullanıcı "durdurma" derse işlemlere dokunma; derlemeyi başka klasöre al
  (`dotnet build src/api -o <scratchpad>/apibuild`), gerekirse oradan başka portta çalıştır
  (`--urls http://localhost:5090`, content root `src/api`). İş bitince bu test işlemlerini kapat.
- **Geliştirme bitince API ve client en güncel kodla çalışır durumda olmalı.** `ng serve` değişiklikleri
  kendisi alır; API almaz. Backend değiştiyse ve API durdurulduysa yeniden başlat (ya da kullanıcıdan
  kendi terminalinde başlatmasını iste) ve `GET /api/health` ile doğrula.

## Git akışı

- **main'e doğrudan commit yok.** Her iş `feat/…`, `fix/…` veya `chore/…` branch'inde yapılır, main'e
  `git merge --no-ff --no-edit <branch>` ile alınır; merge mesajı git'in varsayılanıdır
  (`Merge branch 'feat/x'`, 2026-09-29'dan beri; eski `feat: merge x` biçimi changelog'da tekrar üretir).
- Conventional Commits (`feat(api): …`, `feat(client): …`, `chore: …`), İngilizce, küçük ve anlamlı commit'ler.
  Bir GitHub issue'sunu kapatan commit'in gövdesine `Closes #N` yazılır (`main` push edilince issue kapanır);
  PROJECT_STATUS "Aksiyon planı"ndaki kutusu aynı branch'te işaretlenir.
- Commit ve merge **kullanıcı onayıyla** yapılır. Commit öncesinde gelen düzeltme istekleri önce uygulanır,
  commit son haliyle atılır (sonradan "fix" commit'i yığmak yerine).
- **Push kullanıcı onayıyla.** Repo kullanıcının kişisel GitHub hesabında, public (karar 2026-09-29).
  Sadece `main` ve etiketler push edilir (`git push origin main`, `git push origin vX.Y.Z`); feature
  branch'leri lokal kalır. Force-push yok.
- CI: `.github/workflows/ci.yml` (ubuntu; action'lar commit SHA'sına sabit, yorumda sürüm; SQL Server
  imajı bir CU etiketine, Dependabot izlemez, elle güncellenir). API: build, migration'sız model değişikliği
  kontrolü, `tests/api` bir SQL Server 2022 servis container'ına karşı (sonuçlar TRX artefaktı), `main`'de
  ayrıca yayın paketi (`dotnet publish`, içinde client var mı). Web: `npm ci`, Prettier, `ng build`,
  `ng test`; araçlar `npm exec --no --` ile (projenin kendi araçları; `npx` eksik paketi indirir). API `main`
  push'unda Release derlenir (ImageSharp anahtarı secret `SIXLABORS_LICENSE_KEY`), pull request'lerde
  Debug (Dependabot ve fork'lar secret görmez). Dependabot haftalık, gruplu; npm ve NuGet'te major sürüm
  önermez (onlar planlı iş, Angular için `ng update`). `ci.yml` `workflow_call` ile `release.yml`'den de
  çağrılır (`ref` girdisi etiketin commit'i; çağrıldığında `github.workflow` "Release" olur, deneme
  paketi atlanır, concurrency grubu adı ayrı tutar). E2E: ayrı iş (`tests/e2e`, Playwright'ın Chromium'u,
  kendi SQL Server container'ı); etiket yayınında da koşar, kırık bir akış yayına geçemez; hata olursa
  rapor artefaktı `e2e-report`. E2E işinin sonunda **ZAP baseline (pasif) taraması**: aynı site Production
  modunda HTTPS'te (`https://coinportal.test:5443`, `dev-certs` sertifikası; `localhost` HSTS almaz),
  girişsiz, Ajax spider'la; imaj tarihli etiket + digest'e sabit, elle güncellenir. Kurallar
  `.zap/rules.tsv`: kabul edilen bulgular (IGNORE gerekçesiyle, WARN bilinen bir eksik: şu an sadece CSP);
  **listede olmayan her bulgu işi kırar** (`.zap/check.mjs`), yani yayını da engeller: yeni bir bulgu ya
  düzeltilir ya da kullanıcıyla karar verilip gerekçesiyle listeye girer. Rapor artefaktı `zap-report`,
  özeti koşunun Summary'sinde. ZAP lokalde çalışmaz (docker yok), sadece CI'da; `check.mjs` lokalde bir
  rapora karşı denenebilir. Canlı siteye tarama yapılmaz. **Aktif tarama** (saldırı da dener, en çok ~1
  saat): GitHub'da Actions > CI > Run workflow, `main`, "Active ZAP scan" işaretli (`zap_active`;
  `zap-full-scan.py`, kural başına 5 dk, toplam 60 dk sınırı, E2E işi 120 dk). Ara sıra elle; push ve
  yayın koşularında hiç çalışmaz. Aynı `rules.tsv` ve `check.mjs`: aktif kuralların yeni bulguları işi kırar,
  karara bağlanır.
- Git kimliği repo seviyesinde tanımlı; global ayarlara dokunma.

### Sürüm ve yayın

- SemVer; **git etiketi (`vX.Y.Z`, annotated) tek doğruluk kaynağı.** API sürümünü MinVer
  (`Directory.Build.props`) etiketten türetir, `GET /api/health` `version` döner (etiketsiz commit'lerde
  `X.Y.Z-preview.0.N`). Client sürümü derlemede gömülür: `ng build --define "APP_VERSION='X.Y.Z'"`
  (`core/app-version.ts`, footer'da görünür; verilmezse görünmez). `package.json` sürümü 0.0.0 kalır.
- CHANGELOG.md git-cliff ile commit'lerden üretilir (`cliff.toml`, Keep a Changelog): `feat` → Added,
  `fix` → Fixed, `refactor`/`perf` → Changed; diğerleri ve merge commit'leri gizli. Elle yazılmaz.
- Yayın akışı (kullanıcı onayıyla; git-cliff sürümü sabit, yükseltmesi bilinçli): main'de
  `npx git-cliff@2.14.2 --bumped-version` önerisine bakılır (1.0.0'a
  kadar breaking → minor, feat → minor, fix → patch; karar kullanıcıyla) → `chore/release-vX.Y.Z`
  branch'inde `npx git-cliff@2.14.2 --tag vX.Y.Z -o CHANGELOG.md`, README'deki sabit "tests" rozeti son
  sayılarla (API + client + e2e toplamı; diğer rozetler canlı) + commit `chore(release): vX.Y.Z` → merge →
  merge commit'ine `git tag -a vX.Y.Z -m "vX.Y.Z"`. `v1.0.0` ilk gerçek (hosting) yayını.
- Canlı site MonsterASP.NET'te (https://coinvitrine.com; sağlayıcının adresi `coinportal.runasp.net`
  ve `www.` oraya yönlenir).
- **Etiket push'u yayın pipeline'ını başlatır** (`.github/workflows/release.yml`):
  1. **Checks:** `ci.yml` etiketin commit'inde (biçim, build, migration kontrolü, API ve client testleri).
  2. **Package:** `coinportal-vX.Y.Z.zip` (`site/` = API + client, idempotent `migrate.sql`, `LICENSE`,
     `THIRD-PARTY-NOTICES.md`) ve `.sha256`; sürümü ve client'ı kontrol eder, etiketin GitHub Release'ine
     ekler (Release taslaklar dahil listeden aranır, yoksa taslak açılır; paketi zaten olan Release'e
     dokunulmaz, yeniden kurulumda koşu kendi artefaktını kurar). Özete canlı sürümden (`/api/health` → commit) bu yana **yeni migration'ları**
     yazar; varsa "onaydan önce panelden veritabanı yedeği al" uyarısı.
  3. **Deploy:** GitHub ortamı `production` (onaylayıcı kullanıcı; sadece `main` ve `v*` etiketleri, elle başlatma `main`'den koşar; secret'lar
     `WEBDEPLOY_SERVER`, `WEBDEPLOY_SITE`, `WEBDEPLOY_USERNAME`, `WEBDEPLOY_PASSWORD`).
     **Onay** (Approve) bekler; sonra Windows runner'da Web Deploy (`msdeploy`): `AppOffline` (dosyalar
     değişirken bakım sayfası), `DoNotDeleteRule` (fazla dosya silinmez), **sunucudaki `web.config`
     atlanır**. Migration'ları uygulama açılışta kendisi uygular (`Database:MigrateOnStartup`).
  4. **Kontrol:** `/api/health` 3 dakika içinde yeni sürümü göstermezse iş başarısız.
  Kurulumdan önce sunucuda elle bir hazırlık gereken sürümde (yeni ortam değişkeni vb.) hazırlık onaydan
  önce yapılır. `workflow_dispatch` (etiket + `deploy`) bir etiketi yeniden paketler ve isterse kurar
  (yeniden kurulum, eski sürüme dönüş; veritabanı geri alınmaz). Elle kurulum yedek yol: PROJECT_STATUS
  "Yayın (deploy) adımları". Sonra Release'in notları yazılıp yayınlanır (kullanıcı onayıyla): kısa giriş,
  öne çıkanlar ve etiketteki CHANGELOG.md'ye link; "latest", pre-release değil (`.notes/scripts/create-release.js`).
  **Yayın bu adımla biter:** pipeline Release'i taslak açar; README'deki release rozeti ve repo sayfasındaki
  "Latest" en son *yayınlanmış* Release'i canlı okur (rozet elle güncellenmez). Betik sonunda
  `releases/latest` yeni etiketi göstermeli ve taslak Release kalmamalı (betik kontrol eder, değilse hata
  kodu verir; `v1.5.0` taslak kaldığı için ikisi de bir gün `v1.4.0`'da kaldı).
- GitHub rulesets: `main`'de silme ve force-push, `v*` etiketlerinde silme, güncelleme ve force-push yasak.
  **Push edilmiş bir etiket düzeltilemez**; yanlışsa yeni bir patch sürümü atılır. Etiketi push etmeden
  önce doğru commit'te olduğunu kontrol et.

## Komutlar

Repo kökünden (`/c/repos/private/coin-web-portal`):

```bash
dotnet tool restore                                   # local tools: dotnet-ef, smtp4dev (fresh clone)
dotnet build                                          # backend build
dotnet test                                           # API tests (tests/api), own LocalDB database per run
dotnet test --project tests/api --filter-class "*CoinsTests"   # one test class (xUnit v3 filters)
dotnet ef migrations add <Name> --project src/api --output-dir Data/Migrations
dotnet ef database update --project src/api

# API (http://localhost:5080, Swagger: /swagger), content root must be the project folder
cd src/api && dotnet run --launch-profile http
cd src/api && dotnet run --launch-profile http -- --seed-dev-data   # dev data, then exits
dotnet publish src/api -c Release -o <dir>            # whole site: API + Angular build in wwwroot
dotnet publish src/api -c Release -o <dir> -p:SkipWebClient=true   # API only

# Local mail server for the dev API's e-mails (inbox http://localhost:5050, SMTP localhost:2525)
dotnet smtp4dev --urls=http://localhost:5050 --smtpport=2525 --imapport= --pop3port=

# Client (http://localhost:4200, /api proxied to 5080)
cd src/web && npm install && ng serve
cd src/web && ng build
cd src/web && ng test --watch=false               # Vitest + jsdom
cd src/web && npx prettier --check "src/**/*.{ts,html,css}"

# End-to-end (tests/e2e): builds client + API, runs them on 5091 with database CoinPortal_E2E
cd tests/e2e && npm install && npx playwright test
cd tests/e2e && npx playwright test tests/sharing.spec.ts   # one file
cd tests/e2e && E2E_SKIP_BUILD=1 npx playwright test       # reuse the last build
cd tests/e2e && npx playwright show-report                 # last report (axe results attached)

# Changelog and version (repo root)
npx git-cliff@2.14.2 --bumped-version                 # suggested next version
npx git-cliff@2.14.2 --tag vX.Y.Z -o CHANGELOG.md     # regenerate for a release
```

Seed kullanıcıları: `ayse.yilmaz`, `jonas.weber`, `elif.kaya`, `marco.bianchi`, `sophie.martin`
(e-postalar `@example.com`), parola hepsi için `Coinportal1`. Koleksiyonlar `DevData/dev-seed.json`'da
(kullanıcı → koleksiyon → coin; kullanıcı kararı 2026-10-09): her kullanıcının birden çok koleksiyonu var,
aralarında yalnız Euro, yalnız diğer (Euro dışı) coin, karışık ve yayın sınırının altında kalanlar; herkese
açık, linkle ve gizli olanlar. Koleksiyonun `photographed` alanı (`all`, `none` ya da ilk n coin) hangi
coin'lerin fotoğraflı olacağını söyler; herkese açık koleksiyonda `all` olmalı (seed aksi halde durur).
Fotoğraflar yer tutucu çizimlerinden: `DevData/SeedPhotos/*.jpg` (Euro: değer ikonu; diğer coin: ön yüz
rengindeki ¤ coin, arka yüz değeri), `node make-seed-photos.mjs` (`DevData`'da, tests/e2e'nin Playwright'ı
ile) üretir; çizimler ya da fotoğraflı coin'ler değişince yeniden çalıştırılır.
**Seed, bu kullanıcıların koleksiyon, coin ve fotoğraflarını
sıfırlar**; kullanıcı onlarla deneme yapmış olabilir (fotoğraf yüklemiş vb.), çalıştırmadan önce sor.
API çalışırken `dotnet run --no-build --launch-profile http -- --seed-dev-data` kullanılabilir.

## Mimari

```
src/api/                ASP.NET Core API (proje CoinPortal.Api). Controllers/ (+ Admin/), Contracts/{Admin,
                        Auth,Coins,Collections,Countries,Common,Public,Settings}/, Data/ (entities,
                        AppDbContext, Migrations/), DevData/ (dev only), Photos/ (storage, image
                        processing, orphan sweep), Authorization/ (roller, policy'ler, admin senkronu), Querying/,
                        Validation/, Localization/, Accounts/ (hesap silme, veri dışa aktarma),
                        Publishing/ (herkese açık koleksiyon kuralı),
                        Hosting/ (Serilog, DataProtection, rate limiter,
                        client'ın wwwroot'tan sunulması), App_Data/{photos,logs,keys} (gitignored)
src/web/                Angular client (proje adı `web`, derleme çıktısı dist/web/browser)
src/web/src/app/        core/{admin,auth,coins,collections,public,http,i18n,legal,settings,theme}/, shared/,
                        layout/{header,footer}/ + page-width.service, pages/ (+ admin/)
src/web/src/i18n/       en.json, tr.json, de.json, bg.json (çeviriler); admin/<dil>.json (panelin scope'u)
tests/api/              API testleri (CoinPortal.Api.Tests: xUnit v3 + WebApplicationFactory), Infrastructure/
tests/e2e/              Playwright (server/, support/, tests/). Angular unit testleri kodun yanında kalır.
docs/                   PROJECT_STATUS.md (yaşayan durum), reviews/ (tarihli değerlendirmeler)
.config/                dotnet-tools.json (dotnet-ef local tool)
```

Repo kökündeki `.notes/` klasörü sadece lokaldir (`.git/info/exclude`), commit'lenmez.

- Veri: kullanıcı → koleksiyonlar (`Collections`) → coin'ler → fotoğraflar (`CoinPhotos`). Coin'de
  `OwnerId` da tutulur (koleksiyonun sahibiyle aynı olmalı; sahiplik kontrolleri ve fotoğraf yolu için).
- **Coin türü** (`Coin.Kind`, kullanıcı kararları 2026-10-09, yol haritası 18): `Euro` (8 değerli `Denomination`,
  25 Euro ülkesinden biri, 1999+) ya da `Other` (arayüzde "Dünya coin'i", düğmede "Dünya"; kullanıcı kararı
  2026-10-09, önce "Diğer coin"di; iç ad `Other` kaldı) (`FaceValue` decimal(18,4) > 0, en çok 4 ondalık + serbest
  `Currency`, en çok 30; 253 ülkenin hiçbiri, yıl 1+). Bir türün alanları dolu, öbürününkiler boş:
  `CoinUpsertRequest.Validate` + veritabanında `CK_Coins_Value` / `CK_Coins_Year`; öbür türün gönderilen
  alanları yok sayılır. **Türsüz istek Euro sayılır** (`ResolvedKind`; eski client'ı açık sekmeler) ve client
  Euro coin'i türsüz gönderir (`toRequest`), `EuroCoinTests` bunu sabitler. Fotoğraf yüzleri veritabanında yine
  `National` / `Common`; diğer coin'de etiketleri "Ön yüz / Arka yüz" (`sideLabelKey`).
- **Ülkeler** (`Countries`, `CountrySeed`): 249 ISO 3166-1 kodu + 4 tarihî ülke (SU, DD, YU, CS) ve
  `IsEuroIssuer` (25); `GET api/countries` `euroIssuer` ile döner. Euro coin'in ülkesi Euro ülkesi olmalı
  (`ValidateCountryAsync`). **Tarayıcı (`Intl.DisplayNames`) tarihî kodları bugünkü ülkelere çevirir**
  (SU → Rusya): adları client çevirilerinde `country.former.<kod>` (`FORMER_COUNTRY_CODES`). Yeni bir tarihî
  ülke de iki yere birden girer.
- Rotalar: `/` (ana sayfa: girişsiz `HomeWelcome` tanıtım, girişli `HomeDashboard` pano; `pages/home/`),
  `/collections` (Koleksiyonlarım), `/collections/:collectionId` (liste/ızgara),
  `/coins/new?collection=<id>`, `/coins/:id/edit`, `/settings/<bölüm>` (Ayarlar; `profile`, `appearance`, `security`, `account`).
  Eski `/collection…` adresleri yönlendirilir.
  Admin: `/admin/<bölüm>` (`overview`, `users`, `users/:id`, `collections`, `audit`, `settings`; `adminGuard`).
  Girişsiz: `/forgot-password` (girişliyken ana sayfaya), `/reset-password?token=` (e-postadaki link; girişliyken de
  açılır), `/privacy`, `/terms`, `/contact` (yasal sayfalar), `/explore` (Keşfet), `/u/:userName` (profil), `/u/:userName/:collectionId` (herkese açık
  koleksiyon), `/s/:token` (sadece linkle). Bilinmeyen adres `NotFound` (`'**'`, adres korunur,
  `noindex`). Koleksiyon sayfası tek bileşen, route data `mode`
  (`owner` | `public` | `shared` | `explore`); `owner` dışı modlar salt okunur.
- Görünürlük koleksiyon başına: `Private` (varsayılan) / `Unlisted` (128 bit `ShareToken`, sadece
  Unlisted iken var; başka görünürlüğe geçince silinir; `Collection.SetVisibility`) / `Public`.
- **Doğrulanmamış hesap** (kullanıcı kararları 2026-10-06; kural tek yerde `Accounts/UnverifiedAccounts`,
  her istekte veritabanından): e-postası doğrulanmamış kullanıcı (1) bir koleksiyonu yeni bir görünürlüğe
  (Unlisted ya da Public) alamaz ve (2) kayıtta gelen koleksiyonun dışında koleksiyon açamaz, ikisi de 403
  `email_not_confirmed` (`CollectionsController` Create/Update/Publish); (3) hesabında en fazla
  `SiteSettings.UnverifiedMaxCoins` (admin ayarı, migration 20 ile başlatır, 0–10.000) coin olabilir,
  coin eklemede 403 `unverified_coin_limit` + `maxCoins` (`CoinsController`, iki ekleme ucu). Sınır
  `me`/giriş/kayıt yanıtında `unverifiedMaxCoins` (doğrulanınca null). **Olan kalır:** paylaşılmış
  koleksiyon, fazla koleksiyon ve sınırın üstündeki coin'ler (doğrulamadan önceki hesaplar: canlıdaki
  mevcut kullanıcılar doğrulanmamış başladı, kullanıcı kararı); düzenleme, silme, ad değiştirme, link
  yenileme serbest, sadece yeni paylaşım ve ekleme engellenir. Client: üstte `layout/email-banner`
  (sınırları söyler, tekrar gönder), formda kapalı seçenekler (`emailBlocked`), koleksiyon sayfasında
  yayın butonu yerine not. "Yeni koleksiyon" (Koleksiyonlarım, ana sayfa) ve sınırdayken "Coin ekle"
  (koleksiyon sayfası hesabın toplamını `api/coins/summary`'den alır, ana sayfa) **yerinde kalır, gri**
  (`btn-unavailable`, `aria-disabled`; link olan "Coin ekle" gri bir `<button>` olur). Ayrı bir not ya da
  kutu yok (kullanıcı kararı 2026-10-07: bant zaten söylüyor); ekran okuyucu için butonun
  `aria-describedby`'ı banttaki maddeye gider (`EMAIL_LIMIT_IDS`). Coin
  formuna doğrudan gelinirse API'nin hatası gösterilir (`errors.unverifiedCoinLimit`). Panelde durum
  `Unverified` (gri; kilit ağır basar) ve isim yanında zarf + saat ikonu (`pages/admin/unverified-mark`,
  durumdan bağımsız, kilitli + doğrulanmamış ayırt edilir).
- **Doğrulanmamış hesabın ömrü** (kullanıcı kararları 2026-10-07): `SiteSettings.UnverifiedLifetimeDays`
  (admin ayarı, migration 30 ile başlatır, 0–365; 0 = kapalı) gün sonra hesap içindekilerle silinir. Süre
  kayıttan, ama `UnverifiedLifetimeSinceUtc`'den (migration'ın çalıştığı an; 0'dan açılınca o an) önceden
  değil: mevcut hesaplar yayın gününden sayar. Tarih tek yerde `Accounts/UnverifiedLifetime.DueUtc` (`me`
  `unverifiedDeletionDueUtc`, admin detayı, silme işi). `Accounts/UnverifiedAccountCleanup`
  (`UnverifiedCleanupService`, iki dakika sonra ve `AccountCleanup:IntervalHours`'te bir, varsayılan 6;
  testlerde ve e2e'de 0) 7 gün ve 1 gün önce hatırlatma e-postası **dener** (`EmailTexts.DeletionReminder`,
  yeni doğrulama linkiyle; gönderilemeyen sonraki çalışmada, zamanı geçmediyse tekrar denenir), süre
  dolunca `AccountDeletion` ile siler (Warning log). **Söz verilmez:** silme e-postanın ulaşmasını
  beklemez; tek güvence hiçbir hesabın ilk hatırlatma denemesinden 1 gün geçmeden silinmemesi (kısaltılan
  süre önce uyarır). Admin'ler ve admin'in kilitlediği hesaplar silinmez (kilitli spam hesabı adresi
  tutmaya devam eder; admin toplu siler). Son çalışma bellekte, panelde Genel bakış'ta. Metinler (bant,
  şartlar `terms.ending.p2`, gizlilik `privacy.retention`) teslimat vaat etmez.
- **Bir seferlik doğrulama isteği** (kullanıcı kararı 2026-10-07; `Accounts/VerificationRequests`): admin Genel
  bakış'tan başlatır (`POST api/admin/verification-requests`, not ile; denetim kaydına hesap sayısıyla
  `VerificationEmailsRequested`), arka planda `Email:BulkDelaySeconds`'de (5; testlerde 0) bir e-posta
  gönderir. Doğrulanmamış, kilitli olmayan, henüz almamış hesaplara (`ApplicationUser.VerificationRequestSentAtUtc`):
  her hesap bir kez alır, tekrar başlatmak sadece kaçanlara gider; çalışırken 409 `already_running`. Durum
  bellekte, panel çalışırken iki saniyede bir sorar. **Linkler:** hatırlatma ve bu istek 7 gün
  (`EmailVerificationTokens.LongLifetime`), kayıt ve tekrar gönder 24 saat.
- **Admin'in elle doğrulaması:** kullanıcı detayında "E-postayı doğrulanmış işaretle" (`POST
  api/admin/users/{id}/confirm-email`, not ile; zaten doğrulanmışsa 204 ve kayıt yok), denetim kaydında
  `EmailConfirmed`. E-postası ulaşmayan ama adresi kendisine ait olan kullanıcı için.
- **Toplu silme** (admin): kullanıcı listesinde sayfadaki kullanıcılar seçilir (admin'lerin kutusu yok),
  "Seçilenleri sil" sayıyı yazarak onaylanır; `POST api/admin/users/bulk-delete` (en fazla 100 Id, not),
  her kullanıcı tek tek silmedeki gibi `AccountDeletion` + kendi denetim kaydı; admin'ler atlanır ve
  sayılır, GUID olmayan ya da bulunmayan Id sayılır (`AdminDeleteUsersResponse`). Listeye `emailConfirmed`
  filtresi (Durum ile birlikte: kilitli + doğrulanmamış).
- **Herkese açık koleksiyon kuralı** (`Publishing/`, kararlar PROJECT_STATUS'ta): Public olmak için bütün
  coin'ler fotoğraflı ve en az `SiteSettings.MinPublicCoins` (admin ayarı, varsayılan 10) fotoğraflı coin.
  **"Fotoğraflı coin" tek yerde tanımlı:** `PublicationRules.IsPhotographed` (Euro: ulusal yüz fotoğrafı,
  diğer coin: iki yüz; `HasPhotos(kind, sides)`; türü değiştiren güncelleme de bu kontrolden geçer);
  sorgular, filtre (`photographed=`), kontroller ondan geçer, kuralı başka yerde yeniden yazma. Public'e
  geçişte 400 `public_requirements` (+ sayılar). **Karar API'de:** koleksiyon yanıtındaki `canBePublic`
  (`PublicationStatus`); client sayıları gösterir, kuralı yeniden hesaplamaz. Koleksiyon sayfasındaki buton
  `POST api/collections/{id}/publish` kullanır (sadece görünürlük; ad/açıklama gitmez). Public koleksiyonu bozacak her işlem `PublicationGuard.
  BrokenByAsync` ile kontrol edilir: onaysız 409 `would_unpublish` (+ `collections`), `?unpublish=true` ile
  işlem yapılır ve koleksiyon aynı kayıtta Unlisted olur (`PublicationGuard.Unpublish`, Information log). **Coin'in fotoğraflarını, koleksiyonunu ya da
  varlığını değiştiren yeni bir uç da bu kontrolü yapar ve testiyle gelir.** Sayı kontrolü sadece sayıyı
  azaltan işlemde (eşik yükselince yayındakiler hemen inmez). Yeni coin fotoğraflarıyla tek istekte
  (`POST api/coins/with-photos` multipart: `coin` JSON + `national` / `common`). Kilit yok: aynı kullanıcının eşzamanlı
  iki isteği sayıyı aşabilir (kota gibi bilinçli); aynı anda Public'e geçiş ve fotoğrafsız coin ekleme de
  fotoğrafsız coin'li bir Public koleksiyon bırakabilir (PROJECT_STATUS Açık konular 22).

- Auth: ASP.NET Core Identity + HttpOnly cookie `coinportal.auth` (JWT yok, SPA ile API aynı origin).
  Oturum 14 gün, kullandıkça uzar; login'de "Beni hatırla" varsayılan işaretli, kayıt kalıcı oturum açar
  (işaretsiz login tarayıcı kapanınca biter). Login hesabın varlığını ve kilidini ele vermez: bilinmeyen
  kullanıcı, yanlış parola ve kilitli hesapta yanlış parola aynı 401 (bilinmeyen kullanıcıda da parola
  hash'lenir, süre farkı olmasın); 423 sadece doğru parolayla döner. **Çıkış her yerden çıkıştır**
  (kullanıcı kararı 2026-10-06): güvenlik damgası yenilenir, cookie'nin kopyaları ve kullanıcının diğer
  cihazlardaki oturumları da en geç cookie doğrulama aralığında (1 dk) biter. Sadece cookie'yi silmek
  kopyasını 14 gün geçerli bırakırdı. Kayıtta alınmış e-posta `DuplicateEmail` döner (e-postanın kayıtlı
  olduğu anlaşılır; bilinçli, e-posta doğrulamasıyla çözülür, PROJECT_STATUS Açık konular).
  **Tek kimlik doğrulama şeması cookie + antiforgery kalır** (web, PWA, TWA; karar 2026-09-29): bearer/JWT
  şeması, CORS ya da "bearer'da antiforgery atla" kodu eklenmez; yeni uçlar düz `[Authorize]` + policy.
  Native mobil gerekirse önce cookie'yi koruyan yol denenir (`docs/reviews/2026-09-29-project-direction.md`).
- CSRF: antiforgery, header `X-XSRF-TOKEN`; client `GET /api/auth/antiforgery` ile okunabilir
  `XSRF-TOKEN` cookie'si alır (açılışta ve her login/register/logout sonrası, token kullanıcıya bağlı).
  Token yenileme yan istektir, başarısızlığı girişi/çıkışı bozmaz; antiforgery reddi (yazma isteğine
  `errors`'suz ve `code`'suz 400) `authInterceptor`'da token yenilenip **bir kez** tekrar denenir. Bu
  yüzden API'de gövdesiz/kodsuz bir 400 yeni bir anlamda kullanılmaz (`CodedProblem` ya da
  `ValidationProblem`).
- Yayın hedefi: tek site, Windows hosting. `dotnet publish` Angular'ı da derleyip paketin `wwwroot`'una
  koyar (`.csproj` `PublishWebClient`); API onu `Hosting/SpaHosting` ile sunar: client adreslerine
  `index.html` (fallback), `/api/…` altında bilinmeyen adres 404, hash'li dosyalar `immutable`, diğerleri
  `no-cache`. Lokalde `wwwroot` yok, client'ı `ng serve` sunar. Genel fallback son parçası dosya adına
  benzeyen (noktalı) adresleri atlar, eksik bir `.js` 404 kalsın diye; `/u/…` (noktalı kullanıcı adları)
  kendi fallback'ini alır. **Son parçasında nokta olabilen yeni bir client rotası** da `SpaHosting`'e
  eklenir ve `HostingTests`'teki listeye girer. `/.well-known/change-password` (parola yöneticilerinin standart
  adresi) `/settings/security`'ye yönlenir; Güvenlik bölümü taşınırsa o da değişir. `/.well-known/` altındaki diğer
  adresler 404 (uygulamanın sayfası değil): tarayıcılar uydurma bir adresle bunu kontrol etmeden change-password'e güvenmez.
- Güvenlik başlıkları `Hosting/SecurityHeaders`: her yanıtta `nosniff`, `X-Frame-Options: DENY` +
  CSP `frame-ancestors 'none'`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`,
  site izolasyonu: `Cross-Origin-Opener-Policy: same-origin`, `-Resource-Policy: same-origin`,
  `-Embedder-Policy: require-corp` (2026-10-06, ZAP). **Site başka origin'den hiçbir şey yüklemiyor;
  dışarıdan bir kaynak (font, betik, görsel, iframe) eklenirse COEP onu engeller**: önce COEP'i
  (`credentialless` ya da kaldırmak) ve gizlilik politikasını birlikte düşün. Development dışında HSTS (`Hsts:MaxAgeDays`, varsayılan 30, localhost hariç); `/api` altında kendi
  `Cache-Control`'ü olmayan yanıtlar `no-store` (görseller `private, immutable` kalır). Tam CSP yok
  (PROJECT_STATUS Açık konular 17).
- **Tek adres** `Hosting/CanonicalHost`: `CanonicalHost:Host` doluysa (sunucuda `coinvitrine.com`,
  `web.config`'te `CanonicalHost__Host`) başka bir host adına gelen her istek 308 ile
  `https://<host>`'a gider, yol ve sorgu korunur (HTTP'den de tek adımda); Let's Encrypt'in
  `/.well-known/acme-challenge` istekleri hariç. Boşsa (varsayılan, Development, testler) kapalı;
  geçersiz bir değer açılışı durdurur.
- **Yönetici paneli = moderasyon ve işletim paneli** (tüm verilerin yönetimi değil; kararlar
  PROJECT_STATUS "Yönetici paneli: kararlar"). Sadece `Admin` rolü. Rol **sadece ayardan** verilir:
  `Admin:UserIds` (kullanıcı adı değil Id: boşta kalan bir adı herkes kaydedebilir), açılışta
  `Authorization/AdminRoleSync` rolü oluşturur, listedekilere verir, diğerlerinden alır; panelden rol
  verilmez. Hosting'de `Admin__UserIds__0=<id>`. Cookie dakikada bir doğrulanır
  (`SecurityStampValidatorOptions`), rol ve security stamp değişiklikleri en geç bu sürede oturuma yansır.
  **Admin gizli içerik görmez:** kullanıcılar için sayılar ve kota, içerik olarak sadece Public/Unlisted;
  `CollectionAccess`'e admin istisnası eklenmez.
- **Moderasyon:** admin kilidi (`ApplicationUser.LockedAtUtc` + Identity `LockoutEnd` en büyük değer +
  yeni security stamp) girişi engeller, açık oturumu düşürür ve kullanıcının paylaşılan koleksiyonlarını
  kilit sürdükçe gizler (veri değişmez). 5 hatalı girişin geçici kilidi sadece `LockoutEnd`'dir, içeriği
  etkilemez. Admin'ler panelden kilitlenemez (403 `cannot_lock_admin`). Koleksiyon gizleme
  (`Collection.ModerationLockedAtUtc`): Private yapar, linki siler, kilit kalkana kadar sahip görünürlüğü
  değiştiremez, coin'lerini başka koleksiyona taşıyamaz ve koleksiyonu coin'lerini taşıyarak silemez (403
  `moderation_locked`; coin'leriyle birlikte silebilir); kilit kalkınca Private kalır. Her admin işlemi
  `AuditLog`'a (FK'sız, ad anlık görüntüsüyle) aynı `SaveChanges` içinde yazılır. **İçerik moderasyonu herkese
  uygulanır, hesap işlemleri admin olmayanlara:** admin'in koleksiyonu gizlenebilir (panelde sahibinin
  yanında "Admin" rozeti, `ownerIsAdmin`), admin hesabı kilitlenemez. Admin kendi koleksiyonunun
  kilidini kaldırabilir; denetim kaydında görünür (admin'e güvenilir, ayarda olması bunun ifadesi).
  Site geneli ayarlar `SiteSettings` tablosunda (tek satır, satırı migration ekler, `HasData` değil: bir
  model değişikliği admin'in değerini ezerdi), admin `api/admin/settings` ile değiştirir; değişiklik
  `SettingChanged` olarak `Setting` / `OldValue` / `NewValue` ile denetim kaydına yazılır (değişen her
  ayar ayrı kayıt, aynı not). Ayarlar: `MinPublicCoins`, `UnverifiedMaxCoins`, `UnverifiedLifetimeDays`,
  `UserQuotaMegabytes`;
  yeni ayar `settings.names`
  çevirisine de girer (denetim listesi).
  Admin bir kullanıcıyı silebilir (adı yazarak onay, `DELETE api/admin/users/{id}`); admin'ler silinemez ve
  kendi hesaplarını Ayarlar'dan silemez (`admin_account`; paneldeki silmede `cannot_delete_admin`), önce
  ayardan çıkarılırlar.

## Backend kuralları

- Tüm controller'lar `api/[controller]` altında. İstisnalar: bir kaynağın alt kaynakları iç içe route
  kullanır (`api/coins/{coinId}/photos`); admin uçları `api/admin/<kaynak>` (`Controllers/Admin/`,
  `Contracts/Admin/`; **her admin controller `AdminControllerBase`'den türer**, Admin policy'si ve
  `Audit(...)` oradan gelir; admin olmayan 403, girişsiz 401). İstek/yanıt tipleri `Contracts/`
  altında, entity'ler dışarı açılmaz. Sayfalı genel listeler `Querying/Paging.ToPagedAsync` (sıralı
  sorgu + sayfadan sonra projeksiyon); EF'in üzerinde filtreleyip sıralayabilmesi için ara projeksiyon
  record constructor değil member-init sınıf olur (bkz. `AdminUsersController.UserRow`). Coin listeleri
  `CoinListing.ToPagedAsync`: ilişkili satırdan (sahip, koleksiyon) alan gereken liste `Include` yerine
  `Expression` projeksiyonu verir (`ExploreCoinResponse.Projection`), kullanıcı satırının tamamı okunmaz.
- **Görsel kütüphanesi sadece `IImageProcessor` arkasında** (`Photos/`, sözleşme arayüzün XML
  yorumunda). Kütüphane değişirse yeni bir uygulama yazılır ve `Program.cs`'teki kayıt değişir; başka
  dosya kütüphaneye referans vermez. Coin fotoğrafı (`ProcessAsync`, kare) ve koleksiyon kapağı
  (`ProcessCoverAsync`, 16:9) aynı sözleşmede. Dosyalar sadece `IPhotoStorage` üzerinden okunur/yazılır
  (`{ownerId}/{imageId}/{dosya}.webp`). Kota `PhotoQuota` ile, fotoğraf + kapak birlikte; sınır site ayarı
  `SiteSettings.UserQuotaMegabytes` (admin, 50–2000 MB, migration 300 ile başlattı; düşürmek bir şey silmez,
  üstündeki kullanıcı yer açana kadar yükleyemez), kullanıcı kullanımını Ayarlar > Hesap'ta görür
  (`GET api/settings/storage`); **yaklaşık**:
  kontrolle kayıt arasında kilit yok, aynı anda yapılan yüklemeler kotayı birkaç görsel (her biri en fazla
  ~0,5 MB) aşabilir (bilinçli; kesinlik kilit ister).
- **Fotoğraf alanı uyarıları** (`Photos/StorageWarnings`, kullanıcı kararları 2026-10-10): kullanım kotanın %75'ini
  ve %90'ını geçince e-posta (`EmailTexts.StorageWarning`, Ayarlar > Hesap'a düğme). Her uyarı bir kez
  (`ApplicationUser.StorageWarningLevel`, migration `AddStorageWarningLevel`; sadece e-posta gidince yazılır, giden
  e-posta hatası bir sonraki kontrolde yeniden dener), ancak kullanım eşiğin 5 puan altına inince (%70 / %85)
  unutulur. Sadece doğrulanmış ve admin'in kilitlemediği hesaplara. Kontroller arka planda, tek tek: fotoğraf ya da
  kapak **ekleyen ve silen her uç** `StorageWarnings.Enqueue(sahip)` çağırır (yeni bir görsel ucu da), kota
  değişince (`AdminSettingsController`) `CheckAfterQuotaChange` ilgili herkese `Email:BulkDelaySeconds` aralıkla
  bakar (düşürmek uyarır, artırmak sıfırlar). Eşikler Ayarlar'daki çubuğun renkleriyle aynı (client
  `account-settings.ts` `FILLING` / `NEARLY_FULL`); biri değişirse öbürü de. Testlerde `StorageWarnings.CheckAsync`
  doğrudan çağrılır (`StorageWarningTests`).
- **E-posta sadece `IMailSender` arkasında** (`Email/`, MailKit; görsel kütüphanesi kuralının aynısı):
  `Email:Smtp:Host` doluysa `SmtpMailSender`, boşsa `PickupFolderMailSender` (`Email:PickupPath`'e
  `.eml`; e2e, `Email__Smtp__Host` boş verilerek). Lokalde (`appsettings.Development.json`) e-postalar
  **smtp4dev**'e gider (`localhost:2525`, şifresiz; gelen kutusu http://localhost:5050, komut "Komutlar"da;
  kapalıysa e-posta gönderilemez: kayıt olur, Error log, tekrar gönder 503). Canlıda SMTP ayarları ve parola sunucudaki `web.config`'te
  (`Email__Smtp__Host`, `__Port`, `__UserName`, `__Password`, `Email__SiteUrl`), repoya girmez; SMTP
  yoksa Development dışında açılışta Warning. **Linkler `Email:SiteUrl`'den kurulur, isteğin `Host`'undan
  asla** (sahte Host başlığı linki saldırganın sitesine çevirirdi); loopback ise Development dışında
  Warning. E-posta metinleri **API'de** (`Email/EmailTexts`, dört dil, kaynak Türkçe; "arayüz metni API'de
  üretilmez" kuralının bilinçli istisnası) ve kullanıcının diline göre. Her e-posta iki parçalı
  (`multipart/alternative`): düz metin + aynı kelimelerle HTML (`EmailHtml`: tablolar, satır içi stil, hex
  renkler; dışarıdan görsel ya da kaynak yok; **her metin `EmailHtml.Encode`'dan geçer**, ad kullanıcının).
  **Doğrulama linki**
  `/verify-email?token=`: `EmailVerificationTokens` (Data Protection, kullanıcı Id + e-posta, 24 saat;
  Identity'nin token'ı değil, o güvenlik damgasına bağlı ve çıkış damgayı yeniler). `POST
  api/auth/verify-email` girişsiz (`Auth` hız sınırı, geçersizse 400 `invalid_token`), `POST
  api/auth/verify-email/resend` girişli (`Email` politikası, kullanıcı başına 10 dk'da 3; gönderilemezse
  503 `email_not_sent`). Kayıtta gönderim hatası kaydı bozmaz (Error log). `token=` log maskesinde.
  **Parola sıfırlama** (`Email/PasswordReset.cs`, kullanıcı kararları 2026-10-07): link `/reset-password?token=`,
  kendi token'ı (kullanıcı Id + e-posta + security stamp, 1 saat): parola değişince ya da çıkış yapılınca biter,
  admin'in kilitlediği hesapta hiç çalışmaz. `POST api/auth/forgot-password` **her durumda 204** (bilinmeyen hesap,
  admin kilidi, hesap başına `RateLimiting:Email` sınırı sadece e-postanın gidip gitmediğini değiştirir); süre
  farkı olmasın diye istek kuyruğa girer, e-postayı `PasswordResetSender` arka planda gönderir (testlerde
  `factory.Mail.WaitForAsync`, `LatestResetToken`). Bu uca hesaba göre farklı bir cevap ya da senkron gönderim
  eklenmez. `reset-password/check` kullanıcı adını döner, `reset-password` parolayı koyar, e-postayı doğrulanmış
  sayar ve 5 hatalı girişin geçici kilidini kaldırır (oturumlar yeni damgayla biter); geçersiz link 400
  `invalid_token`. Token istek gövdesinde gider, adreste değil. **Parola değiştirme** (Ayarlar > Güvenlik, `POST
  api/auth/change-password`): yanlış mevcut parola 400 `PasswordMismatch`, diğer oturumlar biter, bu oturum
  `RefreshSignInAsync` ile sürer. Parola nasıl değişirse değişsin (Ayarlar, sıfırlama linki; yeni bir yol da)
  `PasswordChangedNotice` "parolan değişti" e-postasını gönderir (kullanıcı kararı 2026-10-07).
- Fotoğraflar statik sunulmaz; API sürümlü URL (`?v=<photoId>`) + `immutable` önbellekle sunar
  (`v`'siz istek `private, no-cache`, `ImageUploadExtensions.ImageCacheControl`).
  Yüklemede önce dosya yazılır, sonra satır; kayıt **hangi sebeple olursa olsun** başarısızsa yeni dosya
  silinir. 409 `conflict` sadece gerçek eşzamanlılıkta (`IsConcurrentChange`: concurrency hatası ya da
  unique ihlali; kapakta koşullu `ExecuteUpdate` 0 satır), diğer veritabanı hataları 500.
  Coin veya fotoğraf silinince dosyalar DB kaydından sonra silinir. Dosya silme hata fırlatmaz: kısa
  aralıklarla yeniden dener, kalan klasörü Error seviyesinde (yoluyla) loglar; okuma silmeyi engellemez
  (`FileShare.Delete`).
- **Yetim süpürme** (`Photos/PhotoSweeper`, `PhotoSweepService`): açılıştan bir dakika sonra ve
  `PhotoStorage:SweepIntervalHours`'te bir (24; 0 = kapalı; testlerde kapalı, testler doğrudan çağırır)
  `.tmp` artıklarını ve veritabanında kaydı olmayan, `MinAge`'den (1 saat; yükleme dosyayı satırdan önce
  yazar) eski görsel klasörlerini siler, her birini Warning ile loglar; kaydı olup dosyası olmayanları
  sayar (silmez). Görsellerin yarısından fazlası (ve 10'dan çoğu) kayıtsızsa hiçbir şey silmez, Error
  loglar (yanlış veritabanı ya da klasör ayarı). Son sonuç bellekte, admin paneli Genel bakış > Disk'te.
  **Yeni bir görsel türü eklenirse süpürmenin bilinen görseller sorgusuna da girer**, yoksa dosyaları
  bir saat sonra silinir.
- **Kim neyi görebilir tek yerde:** `Querying/CollectionAccess` — `CanView` (sahip, herkese açık, ya da
  Unlisted + doğru `s=` anahtarı; sahibi admin kilitliyse sadece sahip), `IsPublic` ve `IsShared`
  (PublicController). Fotoğraf ve kapak GET'leri `CanView` kullanır (`[AllowAnonymous]`).
  Girişsiz okuma uçları `PublicController` (`api/public/...`) altında; yanıtlarda kullanıcı adı dışında
  kişisel veri olmaz, görünmeyen her şey 404. Coin listesi filtre/sıralama/sayfalama `CoinListing`
  ile paylaşılır. Arama kelime kelime: her kelime başlıkta ya da açıklamada geçmeli, sıra önemsiz
  ("almanya 2006" → "2 € · Almanya · 2006"; en fazla `MaxSearchTerms` kelime). Keşfet'te `pageSize=0`
  (tümü) yasak (girişsiz, tüm veriyi tarar). Tür filtresi `kind`, diğer coin'lerde `currency` (büyük/küçük
  harf duyarsız); nominal sıralamasında iki yönde de önce Euro'lar (sent), sonra diğerleri para birimi +
  değer. `countryOrder` bütün ülkeleri alır (sınır 1000 karakter). **Özet (facets):** bir listenin tür
  sayıları, diğer coin'lerinin para birimleri (en çok 200) ve seçilen türün ülkeleri (`CoinListing.FacetsAsync`):
  `api/coins/facets` (`collectionId` yoksa bütün coin'ler: formun para birimi önerileri),
  `api/public/collections/{id}/facets`, `shared/{token}/facets`, `coins/facets?owner=`; erişim kuralları
  listelerinkiyle aynı.
- **Arayüz metni API'de üretilmez**, çeviri client'ta. İstemcinin kendi mesajını göstermesi gereken
  hatalarda ProblemDetails'e makine kodu eklenir (`this.CodedProblem(code, title)`, ör.
  `invalid_image`, `last_collection`). Alan hatalarında ise
  ModelState anahtarı kod olur (ör. `DuplicateName`), client `applyServerErrors`'ın codeMap /
  messageKeys parametreleriyle alana eşler ve çevirir (`MessageKey`: anahtar ya da anahtar + parametre).
  **API'nin İngilizce mesajı hiç gösterilmez:** messageKeys'te olmayan alan hatası `validation.invalid`,
  alana bağlanmayan `errors.invalidRequest` olur; yeni bir sunucu hatası kullanıcıya bir şey anlatmalıysa
  formun messageKeys'ine eklenir. Client kuralı API'yle aynı günü kullanır: yaş ve en büyük coin yılı UTC
  tarihinden (`ageOn`, `maxCoinYear`). API'nin kullanıcı adına ürettiği içerik
  (ilk koleksiyonun adı, `Collection.DefaultNameFor(lang)`) kullanıcının diline göre yazılır.
- Dil listesi iki yerde, birlikte değişir: `Localization/SupportedLanguages` ve client
  `core/i18n/languages.ts`. Kullanıcının dili `ApplicationUser.PreferredLanguage` (null = seçmedi),
  `me` yanıtında `language`, değişiklik `PUT api/settings`, kayıtta `RegisterRequest.Language`.
  **Yeni dil eklerken kontrol edilecekler:** yeni `i18n/<dil>.json` ve `i18n/admin/<dil>.json`
  dosyalarında tüm anahtarlar (test eşliği kontrol eder), admin tablolarının sütun genişlikleri
  (`admin-users.html`, `admin-collections.html`, `admin-audit.ts`; ölçülen metinler yorumlarda),
  `Collection.DefaultNameFor`, `Email/EmailTexts`, dil seçicideki bayrak (`shared/flag`) ve
  coin tablosunun sütun genişlikleri: yeni dildeki sütun başlıkları ve **Euro ülkelerinin adları** mevcut en
  uzundan (şu an "Нидерландия") uzunsa `collection.html` `<colgroup>` genişlikleri headless ölçümle büyütülür
  (ölçüm yöntemi colgroup'un üstündeki yorumda). Diğer coin'lerin ülkeleri ("Amerika Birleşik Devletleri")
  ve değerleri sütuna sığmayabilir: kesilir, tam hali hücrenin `title`'ında ve kartlarda; tarihî ülke adları
  (`country.former.*`) yeni dile de çevrilir.
- Kullanıcının yazdığı adların tekillik kontrolü kodda Türkçe + kültürden bağımsız büyük/küçük harf
  duyarsız yapılır (veritabanı collation'ı İ/i'yi eşlemez); unique index yedek korumadır.
- **Gizli değer tutan sütun binary collation alır** (`UseCollation("Latin1_General_BIN2")`, bkz.
  `Collection.ShareToken`): veritabanının varsayılan collation'ı büyük/küçük harf duyarsız, yoksa
  `AbC…` anahtarı `abc…` ile de eşleşir (paylaşım linkinde 2026-10-06'ya kadar böyleydi).
- Kullanıcıya ait kaynaklarda sahiplik filtresi sorgunun içinde; başkasına ait kayıt → **404** (403 değil).
  Görünen ama yasak işlem → **403** (ör. kendi kilitli koleksiyonunu yayınlamak, `moderation_locked`).
- **Rate limit:** girişsiz (`[AllowAnonymous]`) okuma uçları ve kimlik uçları bir politika alır:
  `[EnableRateLimiting(RateLimitPolicies.Public | Photos | Auth)]` (`Hosting/AppRateLimiting`; IP
  başına, sınırlar `RateLimiting` ayarından, girişli kullanıcı `Public`/`Photos`'a takılmaz; veri dışa
  aktarması `Export` ile kullanıcı başına). Aşım 429 +
  `Retry-After` + kod `rate_limited`; uyarı logu istemci ve politika başına dakikada bir. Ayrıca genel
  limiter: girişli kullanıcının her yazma isteği (GET dışı) kullanıcı başına `Writes` (dakikada 120).
  Hesap başına satır sınırı `UserLimits` (50 koleksiyon, 10.000 coin; aşımda 400 `collection_limit` /
  `coin_limit`), görsel çözme `PhotoStorage:MaxSourceDimension` (4000 px) ve aynı anda
  `MaxConcurrentDecodes` (2) ile sınırlı.
- **Loglar** (Serilog, `Hosting/AppLogging`): seviyeler `Serilog` ayar bölümünde (`Logging` bölümü
  yok), dosyalar `Logs:Path`'e. İstek logu adresi sorgusuyla yazar; paylaşım anahtarı, arama terimleri
  (`search=`) ve Keşfet filtresi (`owner=`) maskelenir (`MaskLoggedAddress`). URL'e yeni bir gizli değer
  (token, anahtar) ya da kişisel veri girerse maskeye eklenir. **İstemcinin kapattığı istek** (yerine yenisi
  gelen liste, kapanan sekme) 499 ile biter ve Information satırı olur, hata değil (`EndAbortedRequestAsync`):
  iptal edilen iş `OperationCanceledException` ya da sorgu sürerken `SqlException` ("Operation cancelled by
  user") fırlatır, istisna sadece Debug'da. İstemci beklerken oluşan her hata Error kalır.
  Dosyalar `Logs:RetainedDays` gün tutulur. Loga parola,
  cookie, token ya da istek gövdesi yazılmaz.
- **Hesap silme ve dışa aktarma tek yerde:** `Accounts/AccountDeletion` (kullanıcının kendi silmesi,
  admin'in tekli ve toplu silmesi, doğrulanmamış hesabın otomatik silinmesi) ve `Accounts/AccountExport` (ZIP). **Kullanıcıya ait yeni bir veri (tablo, dosya)
  eklenince ikisi de güncellenir:** kullanıcı satırından cascade ile silinmeli (olmuyorsa
  `AccountDeletion` transaction'ında elle) ve dışa aktarmada yer almalı; testleri `AccountTests`'te.
  Yeni bir görsel dosyası ayrıca `PhotoSweeper`'a girer. Dışa aktarmada dosyası bulunamayan görsel
  atlanır, loglanır ve `account.json` `missingImages`'te listelenir.
  Denetim kaydı gibi FK'sız ad anlık görüntüleri silmede boşaltılır.
- Site klasörü dışında tutulacak yollar ayardan: `PhotoStorage:RootPath`, `Logs:Path`,
  `DataProtection:KeysPath` (anahtarlar Windows'ta DPAPI ile şifreli, `DataProtection:Dpapi`); hepsinin
  varsayılanı `App_Data/` altında. **Production ayarları repoya girmez:** connection string ve yollar
  hosting panelinin ortam değişkenlerinden ya da sunucuda elle oluşturulan dosyadan;
  `appsettings.Production.json` `.gitignore`'da. Lokal Production denemesinde ortam değişkeni kullanılır.
- Doğrulama hataları `ValidationProblem(ModelState)` ile 400 ProblemDetails olarak döner. Sözleşmeye
  uymayan JSON gövdesinin mesajı geneldir (`AllowInputFormatterExceptionMessages = false`; serileştiricinin
  mesajı iç tip adlarını ve konumu verir), anahtar (`$.visibility`) kalır.
- **Kullanıcının yazdığı her metin alanı `[NoControlCharacters]` alır** (`Validation/`; ad, başlık, darphane
  işareti, kayıttaki ad/soyad/e-posta; açıklama ve admin notu `AllowLineBreaks = true`, satır sonu ve sekme
  serbest). Yeni bir metin alanı da alır; testleri `AbuseTests`'te.
- Enum'lar JSON'da string (`JsonStringEnumConverter(allowIntegerValues: false)`).
- Tüm `DateTime` değerleri UTC (`UtcDateTimeConverter`, alan adları `…Utc`).
- `UseHttpsRedirection()` sadece Development dışında.
- **EF geçici hata yeniden denemesi açık** (`EnableRetryOnFailure`): elle açılan her transaction
  `db.Database.CreateExecutionStrategy().ExecuteAsync(...)` içinde yazılır (yoksa EF hata fırlatır) ve
  tekrar edilebilir olmalı: deneme ilk satırda `db.ChangeTracker.Clear()` ile temiz başlar (bkz.
  `AccountDeletion`, `AuthController.Register`, `CollectionsController.Delete`).
- Migration'ı uygulamadan önce oluşan `Up()` gözden geçirilir; Identity tablolarında beklenmeyen
  `AlterColumn` olmamalı. Mevcut veriye zorunlu yabancı anahtar eklenirken EF `defaultValue: 0`
  üretir ve FK'yı bozar: elle nullable ekle → `Sql()` ile doldur → `AlterColumn` NOT NULL
  (bkz. `AddCollections`). Migration'larda uygulama sabitleri değil literal değerler kullanılır.
  **Canlıda migration'ları uygulama açılışta uygular** (`Hosting/StartupMigration`,
  `Database:MigrateOnStartup`, varsayılan kapalı, sunucuda açık): her migration eski veriyle tek başına
  çalışmalı ve kısa sürmeli (açılış bekler); başarısız bir migration uygulamayı açılışta durdurur.
- **API testleri** (`tests/api`): API bellekte (`WebApplicationFactory`, ortam `Testing`, istemci
  `https://localhost`, yani production cookie kuralları) gerçek SQL Server'a karşı çalışır; SQLite
  kullanılmaz (collation, `CHARINDEX`, filtreli index'ler). Koşu başına `CoinPortal_Tests_<zaman>_<id>`
  veritabanı migration'larla kurulur, sonunda silinir (sunucu: LocalDB, CI'da `COINPORTAL_TEST_SQL`).
  Testler seed kullanmaz, kendi kullanıcılarını açar (`factory.SignUpAsync()`; e-postası doğrulanmış,
  `confirmEmail: false` ile doğrulanmamış); gönderilen e-postalar `factory.Mail`'de (`FakeMailSender`:
  `To(adres)`, `LatestVerificationToken`, `FailWhen`); `ApiClient` SPA gibi
  cookie ve antiforgery token'ı taşır. **Yeni bir uç ya da erişim kuralı testleriyle gelir** (başkasının
  kaynağı 404, girişsiz 401, görünürlük). Test projesi görsel kütüphanesine referans vermez (`TestImages`
  PNG'yi elle üretir). xUnit v3 4.x Microsoft Testing Platform ister (`global.json` → `test.runner`).
  Admin testleri `[Collection(AdminCollection.Name)]` içinde (sırayla çalışır: `SyncAdminsAsync` diğer
  admin'lerin rolünü alır); admin kullanıcı `factory.SignUpAdminAsync()`. Testlerde yayın eşiği 2
  (`CoinPortalFactory.MinPublicCoins`, factory migration'dan sonra yazar): Public koleksiyon
  `user.PublishAsync(c)` / `CreatePublicCollectionAsync()` ile kurulur (eşiğe kadar fotoğraflı coin ekler),
  Public koleksiyona coin `CreatePhotographedCoinAsync` ile eklenir. **Site ayarını değiştiren testler**
  `[Collection(SiteSettingsCollection.Name)]` içinde (`DisableParallelization`: hiçbir testle aynı anda
  koşmaz) ve değeri `finally`'de geri koyar. Açılış kodu veritabanına
  eriştiği için factory migration'ı host başlamadan uygular. Testlerde cookie her istekte doğrulanır
  (`ValidationInterval` sıfır; kilit ve rol hemen yansır), bu yüzden girişli yanıtlar cookie yeniler ve
  `no-cache` olur: önbellek başlığını girişsiz istemciyle test et. API'nin açmadığı alanlar için
  `factory.WithDbAsync(...)`. Ana test host'unda rate limit'ler çok yüksek ve log dosyası yok; başka
  ayar ya da `wwwroot` gereken testler ikinci bir host açar (`factory.WithSettings(ayarlar, webRoot)`,
  bkz. `HostingTests`). İkinci host'un açılışı admin senkronunu çalıştırır, o yüzden bu testler de
  `[Collection(AdminCollection.Name)]` içinde. Test sunucusu ham istek adresini (`RawTarget`) vermez:
  istek logu orada sorgu dizesini yazmaz (Kestrel ve IIS'te yazar), sorgudaki değerlerin log maskesi
  uçtan uca test edilemez.
  **Yapısal kurallar `ApiConventionsTests`'te** (uygulamanın tüm controller action'ları üzerinden): route
  `api/` ile başlar, `api/admin` uçları `AdminControllerBase`'den gelir, girişsiz erişilebilen her uç bir rate
  limit politikası taşır, hiçbir uç antiforgery'yi atlamaz; yeni bir yapısal kural oraya eklenir.
  **Yetki matrisi `AuthorizationMatrixTests`'te:** her uç bir satır (method + route şablonu + erişim kuralı:
  `Anyone`, `SignedIn`, `Owner`, `Visible`, `Admin`); kural girişsiz ziyaretçinin, başka kullanıcının ve
  admin'in ne alacağını belirler, sahibin isteği en son gider (adres gerçek mi). **Yeni bir uç tabloya
  satırıyla girer**, yoksa `EveryEndpoint_IsInTheMatrix` kırılır (adresi değişen ya da silinen uç da).
  Ayrıntılar (hata kodları, görünürlük durumları, gövdedeki Id'ler) özelliğin kendi testlerinde kalır.
  **İstemci sadece `CoinPortalFactory.CreateHttpClient` / `CreateAnonymousClientAsync` ile açılır**
  (kilitli): factory istemcileri thread-safe olmayan bir listede tutar, paralel `CreateClient` listeye null
  bırakır ve kapanışta bütün koşu "cleanup failure" ile düşer. Paylaşılan durum paralel testlerle
  değişir: site geneli sayılarda alt sınır ya da (admin koleksiyonunda) önce/sonra farkı, singleton
  sonuçlarda (`PhotoSweeper.LastResult`) "bu ya da daha yenisi" kontrol edilir; sıralama testleri
  zamanları `WithDbAsync` ile ayrık ayarlar. Yardımcılar: `TestUser.UploadPhotoAsync` / `UploadCoverAsync`,
  `client.ExpectStatusAsync(url, durum)`, `GetIfNoneMatchAsync`, `TestImages` (PNG, EXIF'li PNG, GIF,
  lossless JPEG başlığı, `ReadWebp` boyut ve bölüm adları). 400'lerde durumdan başka ModelState anahtarı da
  kontrol edilir (`ReadValidationKeysAsync`): client hataları bu anahtarlarla alana eşler.

## Client kuralları

- Angular 20+ adlandırma (`login.ts`, class `Login`), standalone, zoneless, durum signal'larla,
  `inject()`. Sayfalar `loadComponent` ile lazy.
- Formlar `NonNullableFormBuilder` ile Reactive Forms. Sunucu hataları `applyServerErrors(form, err)`
  ile forma uygulanır (400 anahtarları kontrol adlarıyla büyük/küçük harf duyarsız eşleşir; kodlu
  problem her durumda önce `messageKeys`'te aranır, ör. 403 `moderation_locked`). Yükleme hatalarında
  sadece 404 "bulunamadı" der; diğerleri `httpErrorKey(err)` (ağ, 403, 423, 429, beklenmeyen), signal
  çeviri anahtarını tutar.
- **Sayı alanları** (`type="number"`; kullanıcı kararları 2026-10-10): tarayıcının yukarı/aşağı okları yok
  (`styles.css`, bütün sayı alanları; yıllar ve ayarlar yazılır, ↑ / ↓ yine çalışır). Seçili bir sayı alanının
  üzerinde fare tekerleği değeri değiştirmez, sayfayı kaydırır (`shared/number-wheel`, `App`'te tek dinleyici;
  Chromium değeri değiştirip sayfayı durduruyordu). Coin formunun Adet'i iki uçta − / + düğmeleriyle: Tab sırasında
  değil, odağı almaz, sınırda `aria-disabled` (`stepQuantity`). e2e'de `getByLabel('Quantity', { exact: true })`
  (düğmelerin adı da alanın adını taşır).
- **Form erişilebilirliği:** her alan `appField` (`shared/field-a11y.ts`; `aria-invalid`, `aria-required`,
  `aria-describedby`), hata metni `id="<alanId>-error"`, ipucu `id="<alanId>-hint"`; formControlName'siz
  alan kontrolü verir (`[appField]="form.controls.x"`). Geçersiz gönderimde ve sunucunun alan hatalarından
  sonra `injectFocusFirstInvalid()` ile ilk hatalı alana odak.
  **Yer tutucu (placeholder)** (kullanıcı kararı 2026-10-10): yazılan alanlarda yok, örnek ve aralık alttaki
  ipucunda (yazınca kaybolmaz, ekran okuyucu `aria-describedby`'dan okur); boş seçim listesinde `common.choose`
  ("Seç…"), serbest metinli öneri listesinde `common.typeOrChoose` ("Yaz ya da seç…"; önerisi yokken düz metin
  kutusudur, `Combobox` yer tutucuyu ve oku kendisi gizler); arama kutularında var (`coinList.searchPlaceholder`). Hata kutuları `role="alert"`, yükleme
  metinleri `role="status"`, yeniden yüklenen liste `[attr.aria-busy]`. Sayfa iskeletinde "İçeriğe atla"
  linki; yol değişince (sorgu değil) sayfa başa kayar ve odak `main`'e geçer (`app.ts`).
  **Her parola alanı** `<app-password-field>` içinde (`shared/password-field`; kullanıcı kararı 2026-10-07): göz
  ikonlu göster/gizle butonu (`aria-pressed`) ve fiziksel klavyede "Caps Lock açık" notu; input içeride kalır,
  `formControlName`/`appField`/`id` onda. Edge'in kendi göz ikonu `styles.css`'te gizli. e2e'de `getByLabel('Password')`
  butonun adına da uyar: `{ exact: true }`.
- Liste sayfalarında **URL tek doğruluk kaynağı**: filtre/sıralama/sayfa query param'larda,
  `withComponentInputBinding()` ile input'lara bağlı, varsayılanlar URL'e yazılmaz; yükleme
  `toObservable(query)` + `switchMap`. Query param input'ları `input(undefined, { transform:
  firstQueryParam })` (tekrarlanan param dizi gelir), arama kutusu `syncSearchWithUrl`
  (`shared/url-search.ts`; URL'deki değerle karşılaştırır, `maxlength` `SEARCH_MAX_LENGTH`), son
  sayfanın ötesindeki boş sayfa `replaceUrl` ile son sayfaya gider.
- **Yükleme iskeleti** (kullanıcı kararları 2026-10-10): yüklenen içeriğin yerinde gri şekiller (`.skeleton`:
  çubuk, daire, kutu; `motion-safe` nabız), **sadece yükleme `SKELETON_DELAY_MS` (300 ms) sürerse**
  (`delayedLoading(loading)`, `shared/skeleton.ts`): hızlı cevap içeriği şekiller görünmeden değiştirir, o arada
  eski içerik soluklaşmadan kalır. Şekiller `aria-hidden`, bölge `aria-busy`, ilk yüklemede `sr-only`
  `role="status"` "Yükleniyor". Satır sayısı ekrandaki kadar (sayfa zıplamaz). Koleksiyon sayfasında tablo
  başlığı, sayfa düğmeleri ve görünüm seçimi yerinde kalır. Filtre özeti (facets) sadece liste, koleksiyoncu ya da
  tür değişince istenir; yeniden yüklenirken eskisi tutulur (tür düğmeleri kalır), değişecek filtre kilitlenir
  (`facetsReloading`: tür → Ülke; koleksiyoncu → Nominal, Ülke ve düğmelerdeki sayılar). Kilitli `Combobox`
  soluk görünür. Diğer sayfalarda da aynı kural (Koleksiyonlarım, profil, ana sayfa panosu, koleksiyon başlığı, coin
  düzenleme formu, Ayarlar › Hesap): **sabit metin (başlık, etiket, ikon) yerinde kalır, sadece yüklenen veri şekle
  döner**; koleksiyon kartının şekli `shared/collection-card/collection-card-skeleton`, sayfa yolunda yüklenen ad
  `Crumb.loading` (çubuk, link değil: adsız link olmasın). Yönetim panelinde de (Genel bakış, listeler, kullanıcı
  detayı, Genel ayarlar): listeler coin listesiyle aynı desende (`showSkeleton`, `skeletonRows`, ilk yüklemede tablo
  başlığı gerçek), kullanıcıya göre değişen rozet ve düğmeler şekil, ayarlarda not ve Kaydet değerler gelene kadar
  yok. Yeni bir yüklenen bölüm de böyle gelir. **Açılış kabuğu** (`index.html`, Angular başlayana kadar; eski
  logolu açılış ekranının yerine): header gerçeğiyle aynı düzende (logo ve ad gerçek, menü ve düğmeler şekil) ve
  hemen görünür, sayfa şekilleri 400 ms sonra belirir (`.app-shell-page`). Auth cookie'si HttpOnly olduğu için
  girişli mi `localStorage` `coinportal.signedIn` işaretinden okunur (`AuthService.SIGNED_IN_KEY`, kullanıcı
  her değiştiğinde `setUser` yazar ya da siler; sadece şekil seçimi için bir ipucu, gizlilik politikasında).
  İlk betik `<html>`'e `data-shell-signed-in` / `data-shell-home` koyar: header'ın girişli ya da girişsiz hâli
  (`.app-shell-in` / `-out`), ana sayfada tanıtım sayfası ya da pano, başka her adreste genel şekiller
  (`-home` / `-generic`). Kabuk app.html, header, `HomeWelcome` ve `HomeDashboard`'ın sınıflarıyla yazılı:
  onların düzeni (menüye yeni öğe dahil) değişince kabuk da değişir. Yeni bir sayfa genel şekilleri kendiliğinden alır.
  **Sunucudan gelen her fotoğraf** (`<img>`: coin fotoğrafı, kapak) `appImageSkeleton` alır (`shared/image-skeleton.ts`,
  `[src]`'yi o alır): fotoğraf inene ya da hata verene kadar yerinde şekil, gecikmesiz (beklerken gösterilecek eski
  bir şey yok); tarayıcıda zaten olan fotoğrafta şekil görünmez. Elemanın kendi köşesi ve zemini şeklinkine baskın.
- Sıralama sunucuda (`sort` + `dir`, varsayılanlar URL'e yazılmaz). Tablo başlıkları
  `th[appSortHeader]` (`shared/sort-header`) ile sıralanır: artan → azalan → varsayılan (admin
  listelerinde `[clearable]="false"` ile yön çevrilir, her sütun kendi `firstDirection`'ıyla başlar;
  `core/admin/admin-list.ts`). Coin listelerinde aynı seçenekler her görünümde ve ekran boyunda "Sırala"
  kutusunda da (yazısız combobox, solda sıralama ikonu) (kullanıcı kararı 2026-10-10: standart filtre paneli; mobilde tablo yok): ikisi de sırayı URL'den
  okur, kendiliğinden eş kalır. Filtre kartının ilk satırında solda tür düğmeleri, sağda "Filtreleri temizle" +
  "Sırala" (temizle `lg` altında sadece huni + çarpı ikonu, `aria-label` + `title`; böylece ~700 px'ten itibaren
  tek satır, sığmazsa ikili alt satırda, solda); telefonda (kullanıcı kararı 2026-10-10) "Filtrele" sadece huni
  ikonu (seçili filtre sayısı köşesinde, buton boyu sabit; adı `sr-only` + `title`), yanında Sırala kutusu
  tablo başlığının kısa sütun adı ve okuyla ("Yıl ↓", `display` şablonu `sortShort`; liste tam adlarla,
  ekran okuyucuya tam ad), panelin sonunda temizle.
  Kart yüksekliği ve satır kullanılırken oynamaz: temizlenecek filtre yokken buton kalır, `aria-disabled`;
  Sırala en uzun sıralama adı kadar geniş (`fitOptions` + `fitTo`: kutuda hiç görünmeyen
  "Sıralamayı kaldır" ölçüye girmez, o sadece bir sıralama seçiliyken listede), seçim satırı oynatmaz;
  varsayılan sırada "Sırala" yazar, soluk değil (`placeholderIsName`).
  Sıralanabilir sütunlar sadece Başlık, Nominal, Ülke, Yıl
  (`COIN_SORT_COLUMNS`, API `CoinSort`); diğer sütun başlıkları düz. Telefonda filtreler "Filtrele"
  butonunun arkasında katlanır (arama kutusu hariç).
- Ülke sıralaması dile bağlı: client ülkeleri aktif dildeki ada göre sıralayıp `countryOrder=DE,AD,AT,…`
  olarak gönderir, API bu sıraya göre dizer. Veritabanında çok dilli isim tutulmaz.
- **Tür düğmeleri ve filtreler** (koleksiyon sayfası ve Keşfet; kullanıcı kararları 2026-10-09; saf mantık
  `pages/collection/coin-filters.ts`): Tümü / Euro / Dünya düğmeleri sayılı (sayı düğmenin sağ alt köşesinde
  yuvarlak bir rozet, düğmenin genişliğine girmez; seçilinin rozeti tema renginde; kullanıcı kararı 2026-10-10)
  ve sadece listede iki tür de varsa; tek türlü listede sadece o tür, seçili görünümde ve düğme değil (`listKinds`;
  kullanıcı kararı 2026-10-10; son düğmenin rozeti çerçevenin köşesine biner, rozet payı düğmelerin arasında). Sayı
  sadece rozetlerde, sayfa başlığında değil (Keşfet). Adresteki tür listede yoksa tür ve o türün filtreleri adresten
  kalkar (`replaceUrl`). İlk özet gelene kadar satır yerinde kalır (gecikmeli şekil)
  (URL `kind`; tür değişince nominal, para birimi ve ülke filtresi sıfırlanır). Nominal filtresi seçilen türün
  değerlerini sunar: Euro'da 8 değer, Dünya'da para birimleri (`currency:` önekli seçenek), Tümü'nde iki tür
  varsa "Euro coin" / "Dünya coin'i" grupları. Ülke filtresi sadece listede (seçilen türde) olan ülkeler; özet
  gelene kadar bütün ülkeler. Coin formunda tür seçimi masaüstünde kartlar, telefonda düğmeler (tek radyo
  grubu); tür ve diğer coin alanları ana form grubunun dışında (`kindControl`, `otherForm`), değer "0,5" ya da
  "0.5" (`face-value.ts`). Bir coin'in değeri her yerde `coinValueLabel(coin, dil)` ile ("2 €", "25 kuruş").
- **Seçim listeleri yazılabilen kısa liste** (`shared/combobox`, kullanıcı kararları 2026-10-09): coin formundaki
  Koleksiyon, Nominal, Ülke (ve serbest metinle Para birimi), koleksiyon sayfası ve Keşfet'teki Koleksiyoncu,
  Nominal, Ülke, Hatıra, Fotoğraf filtreleri (kısa olanlar da: bütün seçimler aynı görünsün). Native `<select>`'in listesinin boyu
  sayfadan kısaltılamıyor (telefonda ekranı kaplar). ARIA combobox: odak kutuda kalır, liste
  ~8 satır kayar, yazınca süzülür: önce yazılanla başlayan, sonra bir kelimesi yazılanla başlayan, sonra içinde
  geçen (her grupta verilen sıra), büyük/küçük harf ve aksan duyarsız (`combobox-filter.ts`); eşleşen kısım
  kalın ve tema renginde (`text-brand-700`, linklerin rengi; her renkte, iki temada en az 4,5:1). Liste en uzun
  seçeneği kadar geniş (en az kutu, en çok 24rem ya da ekran; açıkken daralmaz), ekrandan taşacaksa kutunun sağına
  hizalanır; sığmayan ad liste içinde bölünür (`wrap-anywhere`: kullanıcı adı ve para biriminde boşluk olmayabilir).
  Grup başlıkları (`group`, altındakiler girintili), filtrelerde en üstte `allLabel` ("Tümü", değer `''`; kutu
  boşaltılınca o seçilir). Sadece listedeki bir seçenek seçilir; seçmeden çıkmak eskisini geri getirir (adı
  birebir yazılmışsa onu alır). Formda kontrolün kendisi (`formControlName`, `appField` gibi `aria-invalid` /
  `-required` / `-describedby`; id `inputId`), filtrede `[value]` + `(valueChange)`; formun dönüştürdüğü bir
  değerde (koleksiyonun sayı Id'si) bağlı + `[control]` (hata ve ipucu bağlantısı), `[disabled]` (kilitli
  koleksiyonun coin'i taşınamaz). Seçenek adları dile bağlıysa computed `LanguageService.current()`'ı okur.
  **Yazısız liste** (`searchable="false"`, kullanıcı kararı 2026-10-10): seçenekleri sabit ve kısa (10 ya da
  daha az) olan kutuda yazılacak bir şey yok: Hatıra parası, Fotoğraf filtresi, coin formunun Euro nominali,
  Sırala, Sayfa başına (`shared/pagination`), yönetim panelinin filtre ve sıralama kutuları. Kullanıcı verisinden
  gelen ya da uzayabilen listeler (Ülke, Koleksiyoncu, Koleksiyon, Para birimi, filtredeki Nominal, silme
  penceresinin "taşınacak koleksiyon"u) yazılabilir kalır. **Uygulamada native `<select>` yok** (2026-10-10);
  yeni bir seçim de `Combobox` olur. Kutu bir `<button
  role="combobox">` (native select gibi: tıklama, Enter / Boşluk / oklar açar, Home / End, Enter / Boşluk seçer,
  ilk harfler o harfle başlayan seçeneğe atlar, aynı harf sıradakine; liste görünümü aynı). Etiketsiz kutuda
  `ariaLabel`; `compact` 38 px (yanındaki butonlar); `comboboxIcon` (+ `#comboboxIcon`) soldaki ikon; testte
  görünen ad kutunun ilk `span`'ı (`fitOptions`'lı kutu bütün adları gizli taşır). `display` (TemplateRef)
  seçileni kutuda farklı gösterir (genişlik ölçüsü de onunla; tam adı `sr-only` ver). Panelde seçenek adları
  panelin geç yüklenen metinlerinden: `translateSignal` (kapsam anahtarı, `admin.` öneksiz) + `namedOptions`
  (`core/admin/admin-list.ts`); sıralama kutusu ters çevrilmiş sırada "Sırala" yazar (`sortOptionValue`).
  Pencere içinde de çalışır: açık listede Esc listeyi kapatır, pencereyi değil (keydown'ın varsayılanı engellenir).
  `freeText` (coin formunun Para birimi; `<datalist>` yerine, tarayıcının listesi temaya uymuyordu): değer
  yazılan metin, seçenekler öneri; kendiliğinden vurgu yok (Enter formu gönderir, metni değiştirmez), öneri
  okla ya da tıklayarak alınır, eşleşme yoksa liste gizlenir, öneri yoksa ok da yok (düz metin kutusu).
  e2e'de `support/combobox.ts` `chooseOption` (yazılan kutuda yazar, yazısızda tıklar; yazısız kutunun değeri
  `toHaveText` ile, `toHaveValue` değil); seçenekleri listbox'la sınırla (aynı anda açık başka bir listenin ya da
  dil seçicinin `option`'ları da `getByRole('option')`'a uyar).
- Tablolarda `table-fixed` + `<colgroup>` genişlikleri: sabit sütunlar `truncate` (tek satır), serbest
  metin sütunu (başlık) kalan alanı doldurur ve satır kaydırabilir. Tablo `lg` ve üstünde, altında kart
  listesi (admin panelinde `xl`: sayfa geniş, solda bölüm menüsü var).
  Başlıklar kısa sütun etiketleriyle (`coin.column.*`). Başlık dışındaki sütunlar sabit piksel
  genişliğinde, dört dilin en genişine göre ölçülmüş (dil değişince değişmez): başlık (+ sıralama
  ikonu) ya da içerik, hangisi genişse + 24 px dolgu + 4 px pay; Ülke en uzun ülke adına göre.
  Etiket, sütun ya da dil değişince dört dilde headless'ta yeniden ölçülür. Adet sütunu tabloda yok
  (kartlarda rozet), sahip için düzenle kalem ikonu.
- Koleksiyonun iki görünümü var: liste (masaüstünde tablo, altında kart) ve ızgara (2 / 3 / 5 sütun,
  600 px preview). Seçim URL'de (`view=grid`, varsayılan liste yazılmaz), sayfa ve filtreleri etkilemez.
  Sayfalama satırı: solda görünüm butonları (`<app-pagination>` içine projeksiyon), ortada sayfa
  butonları, sağda sayfa başına. Telefonda tek satır: listenin altındaki `placement="bottom"` sadece
  sayfa butonlarını gösterir, üstteki ilk/son butonlarını ve aralığı gizler.
- Detay/form sayfalarından listeye dönüşler (Vazgeç, kaydet/sil sonrası, sayfa yolundaki koleksiyon) koleksiyon
  sayfasının son adresiyle yapılır (`CollectionReturn` servisi, `returnTree()`); yoksa coin'in
  koleksiyonuna dönülür. Düz bir link koleksiyonu, görünümü ve filtreleri kaybettirir.
- **Sayfa yolu (breadcrumbs)** `shared/breadcrumbs` (kullanıcı kararı 2026-10-07): üst sayfalar yuvarlak buton
  linkler (Keşfet ve Koleksiyonlarım üst menünün ikonuyla, kullanıcı baş harf avatarıyla), bulunulan sayfa düz
  yazı ve **telefonda gösterilmez** (başlık söylüyor). Sadece dört sayfada: profil (Keşfet › @kullanıcı), herkese
  açık koleksiyon (Keşfet › @kullanıcı › ad), kendi koleksiyonu (Koleksiyonlarım › ad), coin formu
  (Koleksiyonlarım › koleksiyon › Coin ekle/düzenle). Sadece linkle paylaşılan koleksiyonda yok (profilde ve
  Keşfet'te görünmez), Ayarlar ve Yönetim'de yok (bölüm menüsü var). "Keşfet" son Keşfet adresine döner
  (`ExploreReturn`, `CollectionReturn` gibi bellekte); koleksiyon adımı `CollectionReturn`'ün adresini sadece
  aynı koleksiyonunsa kullanır.
- Koleksiyon silme: ad birebir yazılmadan silinemez (boş olsa da); dolu koleksiyonda varsayılan seçenek
  coin'leri taşımak. Tek koleksiyon silinemez (API `last_collection`). Coin'li bir koleksiyonu coin'leriyle
  silmek açık seçim ister (`deleteCoins=true`; taşıma hedefi de yoksa 409 `has_coins`): eski bir sayfa
  coin'leri kazara silemez.
- **Renkler tema duyarlı token'larla:** `shade` (nötr, slate yerine), `brand` (vurgu rengi, varsayılan
  amber), `danger` (red), `info` (sky), `success` (emerald), `primary` / `primary-hover` / `on-primary`
  (birincil butonun dolgusu ve yazısı); ör. `bg-shade-0` (kart), `text-shade-900`, `bg-brand-50`. Koyu tema
  (`<html class="dark">`, `ThemeService`) sadece `styles.css`'teki değişkenleri değiştirir; template'e
  `dark:` ve düz palet (`slate-*`, `amber-*`, `bg-white`) yazılmaz. İstisna: iki temada aynı görünmesi
  gerekenler (tehlike butonunun dolgusu, fotoğraf görüntüleyici, tema önizlemeleri, renk örnekleri, coin
  değer ikonu)
  ve `dark:` kullanan iki yer: baş harf avatarı (header, profil, sayfa yolu) ve bayrak çerçevesi (`shared/flag`).
  Logo (`shared/logo`) temaya göre değişir, kendi değişkenleriyle: `--logo-coin` / `--logo-sign` (açıkta
  koyu para + altın €, koyuda altın para + koyu €; kullanıcı kararı 2026-10-04), tema rengine bağlı değil.
  Tema tercihi dil gibi hesapta (`me` → `theme`, `PUT api/settings`), değişiklik `ThemePreference.change()`.
- **Vurgu rengi (tema rengi):** `brand` ve `primary` token'ları `--accent-*` değişkenlerinden gelir;
  her renk `styles.css`'te bir `:root[data-accent='…']` bloğu (amber varsayılan, attribute yok).
  Renk eklenirken birlikte değişenler: API `AccentColor` enum'u (+ check constraint, migration), client
  `ACCENT_COLORS` (`core/theme/accent.service.ts`), `index.html`'deki açılış betiği, `styles.css` bloğu,
  Ayarlar'daki renk örneği (`accent-settings.ts` `SWATCH`) ve `theme.accent.<değer>` çevirileri. Tercih temayla aynı
  modelde (`me` → `accent`, `AccentService`, `AccentPreference.change()`). Logo tema rengine uymaz.
  Yeni renkte kontrast ölçülür: odak halkası (`--color-focus`, açıkta `accent-700`, koyuda `accent-400`)
  zemine karşı en az 3:1, butonun yazısı (`accent-on-fill`) dolguya karşı en az 4,5:1.
- **Klavye odağı:** odak halkaları `ring-focus` token'ıyla (`brand-500` değil; açık temada bazı renklerde
  3:1'in altında). Meşgulken kontroller `disabled` olmaz (basılan buton odağı sayfanın başına düşürür):
  `[attr.aria-disabled]` + işleyicide erken dönüş (bkz. `Pagination.go`, admin işlemleri); işlem
  butonun yerini değiştiriyorsa odak bilinçli taşınır (`AdminUserDetail`). Açılır panellerde Esc odağı
  açan butona geri verir; yarım ARIA `menu` deseni yerine link paneli (`aria-expanded`).
  Form alanı kenarlığı bilerek `shade-300` kaldı (kullanıcı kararı, #35).
- **Ekran okuyucu ve hareket** (#31): tablolarda `<caption class="sr-only">` (sayfanın/bölümün adı).
  Kısaltılmış etiket görünür kısa metin `aria-hidden` + `sr-only` tam ad (`th[appSortHeader]` `[fullLabel]`,
  aynıysa tekrar okunmaz); `aria-sort` sadece sıralı sütunda. Dekoratif semboller (`+`, `→`, `‹`, `✓`, boş
  hücrenin `–`'i) çeviri metnine yazılmaz, şablonda `<span aria-hidden="true">`; boş hücreye `sr-only`
  `common.none`. "1 / 5" gibi sembollü metin `aria-hidden` + `sr-only` cümle (`pagination.pageOf`).
  `target="_blank"` linki `rel="noopener"` + `sr-only` `common.opensNewTab`. Bilgi sadece `title`'da kalmaz
  (dokunmatikte yok); `title` işaretçiyi alan elemana verilir (ızgaradaki kaplama butonu). Satır başına tekrar
  eden butonun erişilebilir adı satırı içerir (`Gizle: <ad>`). Hareket: geçişler `motion-safe:`, sayfa başına
  kaydırma `scrollToTop()` (`shared/motion.ts`, `prefers-reduced-motion`'da anında). **Kayan seçim** (kullanıcı
  kararları 2026-10-10): tek seçimli düğme grubunun seçili zemini düğmeden düğmeye kayar (`shared/sliding-selection`,
  `[appSlidingSelection]="değer"` + `highlightClass`, seçili öğe `aria-pressed` ya da `chosen` seçicisi;
  ~200 ms, ilk gösterimde ve boyut değişiminde kaymaz, hareketi azaltta hiç kaymaz): koleksiyon sayfası ve
  Keşfet'in tür düğmeleri, coin formunun telefondaki tür seçimi (kartlarda yok). Düğmeler `relative`, seçiliyken
  kendi zemini yok; seçili olmayanın üzerine gelince zemin değil sadece yazı rengi değişir (zemin kaymayı örtüyordu).
  **Rozet köşeleri** (kullanıcı kararı 2026-10-10): sağ üst köşe dikkat çeken rozetlerin (seçili filtre sayısı,
  ileride okunmamış mesaj ve bildirimler: dolgu renkli, belirip kaybolur), sağ alt köşe sakin sayı rozetlerinin
  (tür düğmelerinin coin sayıları: gri, seçilide tema renginin açık tonu, hep orada).
- **Kaydırma çubukları** (kullanıcı kararı 2026-10-10): sitenin her yerinde (sayfa, açılır listeler, pencereler)
  oksuz gri hap, oluk şeffaf, üzerine gelince koyulaşır (`styles.css`, `::-webkit-scrollbar`, `shade-300` /
  `shade-400`). Chromium bir elemanda `scrollbar-color` ya da `scrollbar-width` görürse `::-webkit-scrollbar`'ı
  yok sayar: bunlar sadece Firefox için (`@supports not selector(::-webkit-scrollbar)`), bir elemana yazılmaz.
  Headless tarayıcı çubukları çizmez: görüntüde `ignoreDefaultArgs: ['--hide-scrollbars']`.
- **Butonlarda el imleci** (kullanıcı kararı 2026-10-07): Tailwind 4 butonları ok imlecine çeker, buton
  görünümlü linkler el gösterir; `styles.css` base katmanındaki kural `button`, `[role=button]` ve
  `[role=option]`'a el imleci verir (devre dışı ve `aria-disabled` olanlar hariç, onlar `btn-*`'in
  `not-allowed`'ını alır). Yeni bir tıklanır öğe gerçek `<button>` ya da link olur.
- UI kütüphanesi yok. Ortak stiller `styles.css` içinde `@apply` class'ları: `card`, `form-label`,
  `form-input`, `form-error`, `form-hint`, `form-checkbox`, `alert-error`, `btn-primary`, `btn-secondary`,
  `btn-secondary-danger` (soran yıkıcı işlem: sil, kaldır, gizle, kilitle), `btn-unavailable` (hesabın henüz
  kullanamadığı buton, iki temada gri; meşgul butonun solukluğundan ayrı), `btn-danger` (kırmızı dolgu, sadece
  onay penceresinin butonu), `btn-icon`, `nav-link`, `link`, `dialog-panel` (modal `<dialog>` paneli + açılış
  animasyonu), `app-shell-page` (`index.html`'deki açılış kabuğunun sayfası, geç belirir),
  `page-container` (header/main/footer sütunu), `stat-icon` + `stat-icon-<renk>` (istatistik ikon
  dairesi: anlamına göre **sabit renk, tema renginden bağımsız**; zemin/ikon/çerçeve tek renkten
  `color-mix` ile, koyu tema ayarı da `styles.css`'te), `usage-bar` + `usage-bar-fill` (`-warn`, `-full`;
  bir sınırın doluluğu: sabit yeşil, dolarken turuncu, dolmak üzereyken ve doluyken kırmızı; tema renginden bağımsız), `skeleton`
  (yükleme iskeletinin şekli). Yeni ortak stil
  gerekirse buraya eklenir.
- Onaylar `ConfirmDialogService.confirm({...}): Promise<boolean>` ile (native `<dialog>`);
  `window.confirm` kullanılmaz. Gerekçe/not isteyen onay `confirmWithNote({..., note})`: kırpılmış
  metin ya da vazgeçilirse `null`. Geri alınamaz işlemde `typeToConfirm: { label, value }`: değer
  birebir yazılmadan onay butonu açılmaz. jsdom'da `showModal`/`close` yok: testlerde
  `stubModalDialogs()` (`shared/testing/dialogs.ts`), Esc için `pressEscape()`. Diğer pencereler (kırpma, görüntüleyici) `@if` ile eklenir,
  `afterNextRender` içinde `showModal()` açılır, `(closed)` ile kaldırılır.
- **Pencere kapanış kuralları:** tek çıkış noktası `(close)` → `onClose()`; sonuç orada hesaplanır (Esc
  butonlardan geçmez, kaydedilmiş bir şey varsa Esc'te de bildirilir). İstek sürerken Esc engellenir:
  `(cancel)="onCancel($event)"` + metotta `if (busy()) event.preventDefault()` (şablonda `busy() &&
  $event.preventDefault()` yazılmaz, bkz. Bilinen tuzaklar). Her pencerenin Esc davranışı `pressEscape`
  ile test edilir. Arka plan tıklaması sadece metin alanı olmayan
  pencereleri kapatır (onay, görüntüleyici) ve basış da arka planda başlamış olmalı (`pointerdown`).
  Kaydedilmemiş girdi: sayfada `HasUnsavedChanges` + rotada `canDeactivate: [unsavedChangesGuard]` +
  `beforeunload` (bkz. `CoinForm`), pencerede Esc `confirmDiscardChanges()` ile sorar; **Vazgeç
  sormaz** (kullanıcı kararı 2026-10-04; link `[state]="discardChanges"`). Kaydetme/silme sonrası
  çıkış da sormaz.
- Seçilen fotoğraf dosyasına boyut sınırı uygulanmaz (48–50 MP telefon fotoğrafları 10 MB'ı aşar);
  API'nin sınırları kırpılmış JPEG'e (en fazla 1600 px) uygulanır. Tür kararı cropper'da: sadece resim
  olmayan dosya önceden reddedilir, HEIC açılamazsa kırpma penceresi `crop.heicFailed` gösterir.
  `accept` JPG/PNG kalır (iOS HEIC'i bu yüzden JPEG'e çevirir).
- Coin formunda fotoğraf değişiklikleri (`PhotoSlot`, `PhotoChange`) **Kaydet'te** uygulanır. Yeni coin
  seçilen fotoğraflarıyla tek istekte kaydedilir (`createWithPhotos`; fotoğraf hatası olursa hiçbir şey
  oluşmaz, mesajı yüzün adıyla `coinWithPhotosErrorMessage`). Düzenlemede önce coin, sonra yüzler sırayla;
  fotoğraf hatasında coin kayıtlı kalır, adres düzenleme adresine çevrilir.
- **Herkese açık koleksiyonu bozabilecek her istek** (coin kaydet/taşı/sil, fotoğraf sil) `UnpublishConfirm.run(
  unpublish => istek)` ile yapılır (`shared/unpublish-confirm.ts`): 409 `would_unpublish` gelirse sorar, evet
  derse `unpublish=true` ile tekrarlar, hayırda `UNPUBLISH_DECLINED` döner (vazgeçmek hata değildir: coin
  formunda reddedilen fotoğraf silme geri alınır, nötr bilgi gösterilir). Koleksiyon silme penceresi bunu
  sormaz, uyarıyı seçimin altında gösterir (adı yazmak onu da onaylar). Kuralın client karşılığı
  `core/collections/publication.ts` (`publicationProgress`: sayılar + API'nin `canBePublic`'i, `canChoosePublic`);
  koleksiyon sayfasındaki uyarı ve formdaki "Herkese açık" seçeneği oradan. Linkle paylaşılan koleksiyonu
  butonla yayına almak önce sorar (paylaşım linki çalışmaz olur).
- Bekleyen görsel değişikliği tipi `ImageChange` (`shared/image-change.ts`); kapak da coin fotoğrafı gibi
  Kaydet'te uygulanır (`CoverPicker` + `CollectionFormDialog`). Kırpma penceresi (`PhotoCropDialog`)
  oran, daire/dikdörtgen, açıklama ve minimum genişliği input olarak alır.
- Logo `shared/logo` (`<app-logo>`, inline SVG: dolu daire + uçları yuvarlak çizgilerle €; header ve
  footer). Açılış kabuğunda (`index.html`) aynı çizimin kopyası var; ikisi birlikte değişir. Uygulama
  ikonları ve favicon ondan üretilir: `node scripts/make-icons.mjs` (`src/web`, headless Edge; çizim ve
  renkler betikte de yazılı) `public/icons/`, `public/favicon.ico` ve `public/favicon.svg` (tarayıcının
  açık/koyu moduna göre renk değiştirir) yazar; logo değişince betik güncellenip yeniden çalıştırılır.
  Manifest `public/manifest.webmanifest`. Tarayıcı çubuğu rengi (`theme-color`) header'ın yüzeyi:
  `ThemeService` `THEME_COLORS` ve `index.html`'deki açılış betiği birlikte değişir.
- **Gizlilik politikası** (`pages/legal/privacy.ts`, metin `privacy.*`) sitenin işlediği her kişisel
  veriyi, cookie'yi ve dış servisi anlatır: **yenisi eklenince (alan, cookie, localStorage anahtarı, log,
  üçüncü taraf betik/font) metin dört dilde güncellenir ve `PRIVACY_UPDATED`
  (`core/legal/operator.ts`) değişir.** İşletmeci adı ve e-posta aynı dosyada `OPERATOR`. **Kullanım
  şartları** (`pages/legal/terms.ts`, metin `terms.*`, tarih `TERMS_UPDATED`) moderasyonun dayandığı kurallar:
  moderasyon davranışı değişirse (yeni bir yaptırım, kural) metin dört dilde güncellenir. Kayıtta "politikayı
  okudum ve şartları kabul ediyorum" kutusu zorunlu (API `RegisterRequest.AcceptTerms`, `[MustBeTrue]`).
- Üst menü (navbar) öğeleri `layout/header/header.ts` içindeki `NAV_ITEMS` listesinde (`public: true`
  girişsiz de görünür); masaüstü ve mobil menü aynı listeyi kullanır.
- **Yan yana butonlar telefonda:** yazı kırılmaz (`whitespace-nowrap`), butonlar `flex-auto` ve kapsayıcı
  `flex-wrap`: sığmazlarsa (dar ekran, uzun dil) alt alta geçerler (ana sayfa). Dört dilde 360 px'te ölçülür.
- Paylaşılan (Unlisted) koleksiyonda fotoğraf URL'lerine anahtar eklenir: `photoUrl(…, shareToken)`,
  `coverUrl(…, shareToken)`, `CoinThumb`/`PhotoViewer` `[shareToken]` input'u.
- **Girişsiz sayfalar sahibe özel kodu indirmez:** koleksiyon sayfası salt okunur modlarda da kullanıldığı için
  sahibe özel pencereler `@if (!readOnly())` + `@defer (when …; prefetch on idle)` içinde (form penceresi
  kırpma kütüphanesini getirir). Yeni bir ağır, sahibe özel bileşen de böyle eklenir; `ng build` sonrası
  sayfa chunk'ının onu sadece `import()` ile aldığı kontrol edilir.
- Koleksiyon kartı `shared/collection-card`, görünürlük rozeti `shared/visibility-badge`. Kapak sadece
  yüklenen kapak (`coverImageId`); yoksa `CollectionPlaceholder` (`shared/collection-placeholder`).
- Bir SVG içinde `id` (mask, clipPath) kullanan bileşenler her kopyaya ayrı id verir (sayaçla, bkz.
  `flag`, `collection-placeholder`): `url(#…)` sayfadaki ilk eşleşen id'yi kullanır.
- Fotoğraf URL'leri `photoUrl(coinId, photo, size)` ile üretilir; listelerde `CoinThumb`, tam ekran
  `PhotoViewer` (yüz değiştirme: butonlar, ok tuşları döngülü, fare tekerleği döngüsüz ve hamle başına
  bir adım, `WheelGesture`). Fotoğrafı olmayan coin'in yerine değer ikonu `DenominationIcon`
  (`shared/denomination-icon`; dolu metal: bakır 1–5c, altın 10–50c, iki metalli 1 €/2 €, 20c 7 oyuklu):
  **coin iki temada aynı** (düz palet sınıfları, kullanıcı kararı 2026-10-06), sadece arkasındaki zemin
  temayla değişir (`tile` input'u → `denomination-tile` + `denomination-<metal>`, `styles.css`; çerçeve
  `denomination-tile-outlined`; ızgarada). Yuvarlak küçük resimde (`CoinThumb`) zemin yok, `tight` ile coin
  daireyi fotoğraf gibi doldurur (iç içe iki daire olmasın, kullanıcı kararı). Görüntüleyiciye `[denomination]` verilirse eksik ortak yüz bu ikonla
  gösterilir (ortak yüz her ülkede aynı, değeri gösterir). Noktalı halkanın deseni çevreye oturtulur (tam
  sayıda nokta), yoksa başlangıçta iki nokta yan yana düşer. **Diğer (Euro dışı) coin'in yer tutucusu**
  `OtherCoinIcon` (`shared/other-coin-icon`): aynı biçim, yüzü her coin'de ¤, renk coin'e sabit (`otherCoinHue`,
  Id mod 8: sky, indigo, violet, fuchsia, rose, teal, emerald, lime; kullanıcı kararı 2026-10-09). Amber, sarı,
  turuncu ve gri eklenmez (Euro'nun altın, bakır, gümüşüyle karışır). Zemini `denomination-tile other-coin
  other-coin-<renk>`. Bir coin'in ikonu nominalinden seçilir: nominali varsa (Euro) değer ikonu, yoksa bu ikon;
  görüntüleyici diğer coin'de eksik arka yüzü göstermez, yüz adları `sideLabelKey(kind, side)` (`shared/coin-format`).
- Custom element'ler varsayılan inline; boşluklar için `host: { class: 'block' }`.
- Sayfa iskeleti `app.html`: header, `main`, footer; üçü de `page-container` (genişlik
  `--page-max-width`, kenarlar hizalı). Okuma genişliği 64rem; bir rota `data: { pageWidth: 'wide' }`
  ile 80rem ister (admin paneli): `layout/page-width.service.ts` `<html data-page-width="wide">` koyar,
  header/footer sayfa adı bilmez. Header ve footer `sm` ve üstünde yapışkan (üstte / altta), telefonda
  değil (ekranı kaplamasın).
- **Admin paneli (client):** `pages/admin/` (`admin.ts` `SECTIONS` + `admin.routes.ts`, Ayarlar deseni),
  listeler `AdminListBase`'ten (URL'deki arama/sayfa, gecikmeli arama, biçimlendirme), API
  `core/admin/admin.service.ts`, tarih/göreli zaman/bayt `core/admin/admin-format.ts` (dile göre `Intl`).
  Giriş noktası avatar menüsünde en üstte "Yönetim" + ayırıcı (mobil menüde de), `AuthService.isAdmin`.
  Satırdaki yıkıcı butonlar `btn-secondary-danger`, kırmızı dolgu onay penceresinde.
- Ülke isimleri client'ta `Intl.DisplayNames` ile ISO koddan, aktif dilde üretilir (`CountryService`;
  tarihî ülkeler çeviriden, `euroCountries` Euro coin'in listesi).
- **i18n (Transloco, `@jsverse/transloco`):**
  - Template'te `{{ 'anahtar' | transloco }}`, sayıya bağlı metinde `{{ 'anahtar' | plural: n }}`
    (anahtarın altında `one` / `other`, `Intl.PluralRules`), TS'te `translate()`. Anahtarlar alan/sayfa
    adıyla gruplu (`coinList.*`, `collectionForm.*`, ortaklar `common.*`, `errors.*`, `validation.*`).
  - `computed()` içinde çeviri yapılmaz (dil değişince yeniden hesaplanmaz): computed anahtar döner,
    template çevirir. Dile bağlı `Intl` işleri `LanguageService.current()` signal'ını okur. Şablonda satır
    başına çağrılan biçimlendiriciler `Intl` nesnesini `cachedIntl` (`core/i18n/intl-cache.ts`) ile alır
    (her değişiklik tespitinde yeni nesne kurulmaz).
  - Enum etiketleri modelde tutulmaz, anahtar değerden türetilir: `coin.denomination.<değer>`,
    `coin.side.<değer>.label`, `visibility.<değer>.label`, `coin.sort.<sütun>.asc`.
  - Dil sırası: hesaptaki dil > bu tarayıcıdaki son seçim (`localStorage` `coinportal.language`) >
    tarayıcı dili > İngilizce. Açılışta ve girişte `LanguageService.use()`; çeviri yüklenmeden dil
    değişmez. Dil seçici footer'da (herkes), telefonda girişsiz ziyaretçiye ayrıca header'da tema
    butonunun yanında ikon olarak (`iconOnly`; footer telefonda sayfanın sonunda kalıyor) ve Ayarlar >
    Görünüm'de; hepsi `LanguagePreference.change()`
    kullanır (girişliyse önce hesaba kaydeder). Seçici `shared/language-select` (bayraklı liste kutusu,
    klavyeyle kullanılır; native `<select>` resim gösteremez, emoji bayraklar Windows'ta harf çıkar),
    bayraklar `shared/flag` (inline SVG).
  - Dil dosyaları dinamik `import()` ile ayrı chunk (sadece aktif dil iner, adlar hash'li).
  - Admin paneli metinleri ayrı scope: `src/i18n/admin/<dil>.json`, anahtarlar `admin.*`, `/admin`
    rotasında `provideAdminTranslations()` ile sadece panel açılınca iner. Panelde yeni metin dört admin
    dosyasına eklenir (eşlik testi iki dosya kümesini de kontrol eder); panelin dışında görünen metinler
    (menüdeki "Yönetim", rozetler, giriş mesajı) ana dosyalarda.
  - Route `title`'ları çeviri anahtarıdır (`TranslatedTitleStrategy`: "<metin> · Coin Portal").
  - Testlerde `provideTestTransloco()` + `await useTestLanguage('tr')` (`core/i18n/testing.ts`). Admin
    bileşen testlerinde `provideAdminTranslations()` de verilir; scope kendi dinamik import'uyla yüklendiği
    için `whenStable` beklemez, metin `vi.waitFor` ile beklenir (bkz. `admin-users.spec.ts`).
  - Ayarlar sayfası: soldaki bölüm menüsü `pages/settings/settings.ts` `SECTIONS`, her bölüm
    `settings.routes.ts` içinde bir alt rota. Telefonda menü yana kayan sekme satırı; seçili sekme görünür alana
    kaydırılır (`revealIfActive`).
- **Client birim testleri** (Vitest + jsdom, kodun yanında `*.spec.ts`): çekirdek servisler (`core/`),
  paylaşılan bileşenler (`shared/`), her pencere (Esc ve meşgulken davranış) ve formların sunucu hata
  eşlemesi spec'iyle gelir. HTTP `HttpTestingController` ile (istek sırası `expectNone` ile de kontrol
  edilir); onay penceresi gereken sayfada `ConfirmDialogService` taklit edilir (bkz.
  `admin-user-detail.spec.ts`); bir işlemden sonraki yeniden yükleme birkaç adım sonra başladığı için istek
  `vi.waitFor(() => http.expectOne(...))` ile beklenir. Sayfa içindeki saf mantık (URL değerlerini okuma vb.)
  bileşenden ayrı bir dosyaya alınıp ayrıca test edilir (`collection-url.ts`, `coin-sort.ts` `parseSort`).
- Prettier: `printWidth: 100`, `singleQuote`.
- **E2E testleri** (`tests/e2e`, Playwright, #34): bütün site tarayıcıda. `server/start.mjs` client'ı ve
  API'yi `tests/e2e/.build`'e derler (çalışan dev API'nin `bin/` kilidine takılmaz), API'yi Development'ta
  5091'de, `CoinPortal_E2E` veritabanıyla (açılışta migration), client'ı `--webroot` ile sunar (tek origin,
  SPA fallback); rate limit'ler yüksek. Admin: betik önce API'yi 5191'de açıp `e2e-admin`'i kaydeder ya da
  girer, Id'sini `Admin__UserIds__0` ile verip 5091'de yeniden başlatır (Playwright 5091'i bekler, hazırlık
  ayrı portta olmalı). `E2E_ENVIRONMENT=Production` (ZAP için) admin hazırlığını atlar (orada giriş HTTPS
  ister), adresleri `E2E_URLS`'ten, sertifikayı `Kestrel__Certificates__Default__Path`/`Password`'den alır;
  sağlık kontrolü yönlendirmeyi (HTTP → HTTPS 307) "ayakta" sayar. Lokalde kurulu Edge (`channel: 'msedge'`, indirme yok), 4 worker (daha fazlası
  dizüstünde zaman aşımı yapar); CI'da Chromium. Arayüz İngilizce (`locale: 'en-US'`), seçiciler rol ve
  görünen adla. Testler kendi kullanıcılarını API'den açar (`support/users.ts` `TestUser`; e-postayı
  `.build/data/mail`'deki `.eml`'den okunan linkle doğrular, `signUp(false)` doğrulamaz; `support/mail.ts`: `verificationLink`, `resetLink`),
  girişli tarayıcı
  `user.browser(browser)`. Public koleksiyon `user.publish(c)` ile (e2e'de eşik varsayılan 10, yardımcı
  eksik fotoğraflı coin'leri ekler), Public koleksiyona coin `createPhotographedCoin` ile. Her sayfa `expectAccessible(page, ad)` (axe, WCAG 2.1 AA): **ciddi ve kritik
  bulgu testi kırar** (kullanıcı kararı 2026-10-04), azı raporda; tarama animasyonlar bitince yapılır
  (yarı saydam pencere yanlış kontrast verir). Mobil kart listesi ve masaüstü tablo ikisi de DOM'da:
  metin seçicilerinde `.filter({ visible: true })`. Yeni bir kritik akış ya da sayfa e2e testiyle ve
  `expectAccessible` ile gelir.

## Bilinen tuzaklar

- `AutoValidateAntiforgeryTokenAttribute` için `AddControllersWithViews()` gerekir; düz
  `AddControllers()` filtrenin servisini kaydetmez, her POST 500 verir.
- Swagger `UseRequestInterceptor` string'i JS string'e gömülüp `JSON.parse` ediliyor: **tek satır,
  ters eğik çizgisiz, çift tırnaksız** olmalı (backtick kullan), yoksa Swagger sayfası boş kalır.
- `.csproj` içindeki XML yorumlarında `--` kullanılamaz.
- `@for` ile oluşan `<option>`'larda seçili değer `[selected]` ile verilir; `<select [value]>` güvenilir değil.
- Şablondaki bir olay işleyicisi `false` döndürürse Angular olayın varsayılanını engeller: `(cancel)="x()
  && $event.preventDefault()"` x yanlışken `false` döner ve Esc pencereyi **hiç** kapatmaz (2026-10-04'e
  kadar kırpma, koleksiyon silme ve hesap silme pencerelerinde böyleydi). Koşullu engelleme metotta yapılır.
- Kullanıcının API'si çalışırken `bin/` kilitli olur ve `dotnet build` kopyalamada takılır. Bu
  durumda ne yapılacağı "Çalışan uygulamalar" bölümünde. `dotnet ef migrations add` / `database update`
  için API'yi durdurmak gerekmez: `BaseOutputPath=<scratchpad>/efbin/ dotnet ef …` başka klasöre derler
  (`--configuration` ile ayrı konfigürasyon işe yaramaz: Debug dışı her derleme ImageSharp lisansı ister).
  `dotnet test` de API projesini derler; API çalışırken `dotnet test -p:BaseOutputPath=<scratchpad>/testbin/`.
- **`ng serve` çalışırken `src/web`'de `npm ci` yapılmaz:** `npm ci` önce `node_modules`'u siler,
  `ng serve`'ün yüklediği yerel modül (`lightningcss…node`) kilitli olduğu için silme yarıda kalır (EPERM)
  ve `node_modules` yarım kalır (2026-10-04). Paket güncellemesinden önce `ng serve` kullanıcıya sorularak
  durdurulur, kurulumdan sonra yeniden başlatılır.
- Cookie doğrulaması (dakikada bir) cookie'yi yeniler; ASP.NET Core cookie yazan yanıtı `no-cache`
  yapar. Yani kullanıcı başına dakikada bir yanıt (çoğu zaman bir fotoğraf) önbelleğe alınmaz; bilinen,
  küçük bir bedel.
- API açılışta veritabanına yazar (admin rol senkronu): veritabanı erişilemezse ya da boşsa (hiç
  migration uygulanmamış) API başlamaz; sunucuda `Database:MigrateOnStartup` migration'ları önce uygular
  (elle kurulumda `migrate.sql` uygulamadan önce). Açılışta ayrıca
  `Hosting/StartupChecks`: fotoğraf, log ve anahtar klasörlerine deneme yazması ve DataProtection; yanlış bir
  yol ya da DPAPI sorunu uygulamayı başlatmaz (Critical log). Çözülen klasörler Information logda (`Photos:`,
  `Log files:`, `Data protection keys:`); yeni hosting'de ilk açılışta bu satırlara bakılır. Hosting
  ayarları (`RateLimiting`, `Logs`, `PhotoStorage`, `UserLimits`) açılışta doğrulanır.
- Dev veritabanına karşı ikinci bir API (5090, publish paketi, Production ortamı) çalıştırılırken
  `Admin__UserIds__0=<kendi Id'n>` verilir: `appsettings.Development.json` sadece Development'ta
  okunur, boş liste açılış senkronunda kullanıcının admin rolünü alır.
- Publish paketi Production ortamında düz HTTP'de denenince antiforgery 500 verir (cookie'ler
  `SecurePolicy.Always`, HTTPS ister). Fallback, önbellek başlıkları, loglar ve rate limit (429 sayımı
  500'leri de sayar) yine denetlenebilir; giriş gerektiren akışlar Development'ta ya da HTTPS'te denenir.
- Test koşusu yarıda kesilirse (Ctrl+C, debugger) LocalDB'de bir `CoinPortal_Tests_*` veritabanı ve
  `%TEMP%` altında aynı adlı fotoğraf klasörü kalabilir; elle silinir (adlar çakışmaz, testleri bozmaz).
- Biçim kuralları kökteki `.editorconfig`'te (LF, dosya sonu satır sonu, C# 4 boşluk, EF migration'ları
  BOM'lu). Client'ın tamamı, harici `.html` şablonları dahil, Prettier'dan geçmiş durumda (2026-09-29);
  `prettier --check` temiz kalmalı. Prettier bir `{{ … }}` ifadesini kendi satırına alınca metnin
  başına/sonuna boşluk ekler; blok ve flex öğelerde görünmez, satır içi öğelerde kontrol et.
- Python kurulu değil; betikler için Node veya Bash kullan. Bash `node -e "…"` içinde template literal
  (backtick) kaçışları bozuluyor; bu tür düzenlemeleri Edit aracıyla yap. Toplu metin değişikliği
  gerekirse betiği Write ile scratchpad'e yazıp `node` ile çalıştır (heredoc'lar da bozulabiliyor).
  Çift tırnaklı `node -e "…"` içindeki backtick'li her metin (yorumdaki `kod`, Angular şablonu) bash'te komut
  olarak çalışır ve **sessizce boş metne döner**; sonradan dosyada aranmadıkça fark edilmez (2026-10-09'da iki kez).
- Prettier'ın ayarı `src/web/.prettierrc`; `src/web` dışındaki bir dosyada (`tests/e2e`, `.zap`) ayarı
  bulamaz ve varsayılana (çift tırnak, 80 sütun) çevirir: `src/web`'den `prettier --config .prettierrc …`.
- **ImageSharp 4.x lisans anahtarı ister** (sadece derlemede, çalışma anında değil): anahtar yoksa
  Debug derleme uyarı verir, **Release (publish) derleme hata verir.** Lokalde `src/api/sixlabors.lic`
  (gitignore'da, repo kökünde değil: paket dosyayı `.csproj` klasöründen aşağı arar), CI'da ortam
  değişkeni `SixLaborsLicenseKey` (Linux'ta adı harfi harfine). Anahtar hiçbir dosyaya yazılmaz,
  sohbete yapıştırılmaz. Community lisansı 2027-12-26'da biter (PROJECT_STATUS "Açık konular").
- Scratchpad'deki .NET betikleri (`dotnet run x.cs`, `#:package`) repo'nun `nuget.config`'ini görmez;
  makinenin global NuGet ayarlarındaki özel bir feed 401 verebilir. Betik klasörüne repo'daki
  `nuget.config` kopyalanır.
- ngx-image-cropper `allowMoveImage`: sürükleme farkını piksel olarak ekler, transform'un varsayılan
  birimi ise yüzde; `translateUnit: 'px'` verilmezse fotoğraf fareden kat kat hızlı kayar. Konum
  `(transformChange)` ile saklanmazsa yakınlaştırma değişince geri zıplar.
- Angular'ın radyo `[value]` bağlaması DOM `value` özelliğine yazılmaz (directive input'u); testte
  radyoyu etiket metniyle bul. `loading="lazy"` görseller headless'ta ekran dışındaysa hiç yüklenmez,
  `img.decode()` bekler durur; adresi `fetch` ile kontrol et.
- Headless Edge testlerinde `DOM.setFileInputFiles` ile verilen dosyalar okunamıyor (NotFoundError).
  Dosyayı sayfada `File` olarak oluşturup `DataTransfer` ile input'a ver.
- Kaydırma çubuğu şeridini (`scrollbar-gutter: stable`) `innerWidth - documentElement.clientWidth` ile ölçme:
  Chromium kısa sayfada ayrılan boş şeridi bu farka katmaz, 0 der (2026-10-10'da yanlış bir bulguya yol açtı).
  Öğelerin gerçek genişliğine ve yerine bak (`body.getBoundingClientRect().width`, logonun `left`'i). Playwright'ın
  `setContent`'ine verilen doctype'sız deneme sayfası eski uyumluluk modunda (`BackCompat`) açılır ve farklı
  davranır: deneme sayfasına `<!doctype html>` yaz.
- Seed komutu `src/api` klasöründen çalıştırılmalı (content root, `DevData/dev-seed.json`).
- Proje klasörünü yeniden adlandırmak (`git mv`) Windows'ta "Permission denied" verebilir: API ve
  `ng serve`'den başka, çalışma dizini o klasörde olan PowerShell terminalleri ve VS Code'un C# dil
  sunucusu (`Microsoft.CodeAnalysis.LanguageServer.exe`) klasörü kilitler. Git Bash terminalleri
  kilitlemiyor. Taşımadan sonra `bin/`, `obj/`, `.angular/`, `dist/` silinir (mutlak yol önbellekleri).
- Git Bash komut satırı argümanlarındaki Türkçe karakterler Windows ANSI kod sayfasına çevrilir
  (`curl -d '{"name":"LİSTE"}'` API'ye "LISTE" olarak gider). Türkçe içerikli API testlerini Node
  betiğiyle (`fetch`) ya da `--data-binary @dosya.json` ile yap.
- `sqlcmd` ile filtreli index'i olan tablolarda (ör. `AspNetUsers`) DELETE/UPDATE için `-I`
  (QUOTED_IDENTIFIER) gerekir. Konsol Türkçe karakterleri bozuk gösterir, veri doğrudur.
- `sticky` bir eleman ebeveyninin dışına çıkamaz: bileşen host'u (`<app-header>`) içerikle aynı
  yükseklikteyse içteki elemana verilen `sticky` işe yaramaz; `sticky` host'a verilir (`host: { class }`).
- `ng serve`'ün `src/index.html` değişikliklerini almadığı bir kez görüldü (2026-09, eski başlık);
  2026-10-01'de manifest ve `theme-color` etiketleri yeniden başlatmadan geldi. Şüphede
  `curl -s localhost:4200/ | grep …` ile sunulan index.html kontrol edilir, gerekirse `ng serve`
  yeniden başlatılır.
- `<select class="w-auto">` en uzun seçeneğe göre genişler; uzun dillerde (Bulgarca) mobilde sayfayı
  yatay taşırır. Select'e ve flex/grid atalarına `min-w-0` ver; `flex-wrap` içindeyse `max-w-full` de.
- Kendi içinde kayan bir satır (`overflow-x-auto`, ör. bölüm sekmeleri) bir grid öğesinin içindeyse grid
  öğesine `min-w-0` verilir; yoksa satırın genişliği tüm sayfayı genişletir (admin paneli telefonda).
- Bir bileşene dışarıdan gölge/halka verilirken (ör. kartta rozete `shadow-sm`) gölge host'a düşer; içteki
  eleman yuvarlaksa host da yuvarlak olmalı (`VisibilityBadge` host'u `rounded-full`), yoksa açık temada
  köşelerde dikdörtgen gölge görünür.
- Satır sonları LF (`.gitattributes`). Makinenin global `.npmrc`'sinde özel bir feed tanımlı olabilir;
  paket kurulumunda sorun çıkarsa registry'nin public npm olduğunu kontrol et.
- `src/web/package.json` `allowScripts`, kurulum betiği çalıştırmasına izin verilen paketleri **sürümüyle**
  listeler. Bir bağımlılık yükseltmesi (Dependabot dahil) bu paketlerden birinin sürümünü değiştirirse liste
  de güncellenir; yükseltmeden sonra `npm ci` çıktısında atlanan ya da onay bekleyen betik uyarısına bakılır.
- **Canlı sitenin `web.config`'i sunucuda kalır:** veritabanı parolası, admin Id'si ve bütün ortam
  değişkenleri orada (MonsterASP'ta panel ortam değişkeni sunmuyor). Yayın paketindeki `web.config` onun
  üzerine yüklenmez; parola sohbete, repoya ya da `.notes/`'a yazılmaz, kullanıcı sunucuda kendisi girer.
- **Alan adı Cloudflare'de** (Registrar + DNS; Cloudflare'den alınan alan adının DNS'i başka yere
  taşınamaz, MonsterASP'ın nameserver seçeneği kullanılamaz): `@` A kaydı sunucunun IP'sine, `www`
  CNAME `siteXXXX.siteasp.net`'e, ikisi de **"DNS only"** (gri bulut). Proxy (turuncu) açılırsa bütün
  istekler Cloudflare IP'lerinden gelir: önce `UseForwardedHeaders` + Cloudflare aralıkları
  `KnownNetworks`'e girmeli (rate limit, loglar), yoksa herkes tek kovaya düşer. MonsterASP'ta her host
  adı (`coinvitrine.com`, `www.`) ayrı eklenir ve ayrı Let's Encrypt sertifikası alır; yeni sertifika
  sunucuya birkaç dakikada yerleşir (o arada o adla TLS bağlantısı kopar). E-posta (`contact@`) da
  MonsterASP'ta; MX, SPF, DKIM (`…._domainkey`, panel üretir) ve DMARC kayıtları Cloudflare'de elle
  tutulur: MonsterASP'ın DNS'i kullanılmadığı için panel bunları kendisi yayınlayamaz, "Manual DNS setup
  required" uyarısı normaldir. Şirket ağı dış DNS'e
  (`nslookup … 1.1.1.1`) izin vermiyor: kayıtlar DNS-over-HTTPS ile kontrol edilir
  (`curl -H 'accept: application/dns-json' 'https://cloudflare-dns.com/dns-query?name=…&type=A'`).
- MonsterASP'ın uygulama havuzu kullanıcı profili yüklemez: `DataProtection__Dpapi=LocalMachine`
  olmadan API açılışta DPAPI hatasıyla düşer (HTTP 500.30). Havuz x86, bellek 512 MB (aynı anda tek
  görsel çözülür). Dosya yöneticisinde ZIP açmak üzerine yazar ama fazla dosyayı silmez.
- Şirket ağı dışarı 1433 portunu kapatıyor: canlı veritabanına `sqlcmd`/SSMS ile bağlanılamaz, SQL
  script'leri panelin "Import SQL"i ile çalıştırılır. Panelden çalışan script'in başına
  `SET QUOTED_IDENTIFIER ON; SET ANSI_NULLS ON;` + `GO` eklenir (filtreli index'ler). Yeni açılan HTTPS
  sertifikası birkaç dakika hazır olmayabilir; şirket proxy'si o arada kendi hata sayfasını gösterir.
