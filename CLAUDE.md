# CLAUDE.md

Coin Portal: kullanıcıların kendi Euro madeni para koleksiyonlarını yönettiği web uygulaması.
Tek repo: ASP.NET Core Web API (.NET 10) + Angular 21 SPA + SQL Server.

**Her oturumun başında [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) dosyasını oku.** Orada güncel durum,
tamamlanan özellikler, sıradaki adım, açık konular ve alınmış kararların gerekçeleri var. Bu dosya
(CLAUDE.md) ise değişmeyen kuralları ve komutları tutar.

## Çalışma kuralları

- Kullanıcıyla iletişim **Türkçe**. Koddaki yorumlar, commit mesajları, branch adları **İngilizce**.
- Arayüz dört dilde: İngilizce (varsayılan), Türkçe, Almanca, Bulgarca. Metinler
  `src/client/src/i18n/<dil>.json` içinde; kaynak dil Türkçe. Yeni bir metin dört dosyaya birden eklenir
  (test anahtar/parametre eşliğini kontrol eder). Çeviri kuralları "Client kuralları"nda.
- Kullanıcıya verilen terminal komutları **Git Bash** sözdiziminde (`/c/repos/...`).
- Büyük bir değişiklikten önce kısa bir plan sun, kullanıcı onaylayınca uygula. Karar kullanıcıya aitse
  (UX, kapsam, kütüphane seçimi) sor; teknik varsayılanı belli olan konularda sorma, seçip söyle.
- Kodu değiştirdikten sonra doğrula: backend için `dotnet build`, client için `ng build` ve `ng test`.
  Doğrulanamayan bir şey varsa (ör. tarayıcıda görsel kontrol) bunu açıkça söyle.
- Bir özellik ya da anlamlı bir adım bitince [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) güncellenir
  (tamamlananlar, yeni kararlar, açık konular, sıradaki adım, "Son güncelleme" satırı).
  Kalıcı bir kural veya tuzak öğrenildiyse bu dosyaya eklenir.

## Çalışan uygulamalar

Kullanıcı API'yi (`dotnet run --launch-profile http`, 5080) ve client'ı (`ng serve`, 4200) kendi
terminallerinde sürekli çalışır halde tutuyor.

- Bunları durdurmak gerekirse (ör. `bin/` kilidi, migration, API'nin yeni kodla yeniden başlaması)
  **önce kullanıcıya sor**, sadece onay verirse durdur.
- Kullanıcı "durdurma" derse işlemlere dokunma; derlemeyi başka klasöre al
  (`dotnet build src/CoinPortal.Api -o <scratchpad>/apibuild`), gerekirse oradan başka portta çalıştır
  (`--urls http://localhost:5090`, content root `src/CoinPortal.Api`). İş bitince bu test işlemlerini kapat.
- **Geliştirme bitince API ve client en güncel kodla çalışır durumda olmalı.** `ng serve` değişiklikleri
  kendisi alır; API almaz. Backend değiştiyse ve API durdurulduysa yeniden başlat (ya da kullanıcıdan
  kendi terminalinde başlatmasını iste) ve `GET /api/health` ile doğrula.

## Git akışı

- **main'e doğrudan commit yok.** Her iş `feat/…`, `fix/…` veya `chore/…` branch'inde yapılır, main'e
  `git merge --no-ff` ile alınır.
- Conventional Commits (`feat(api): …`, `feat(client): …`, `chore: …`), İngilizce, küçük ve anlamlı commit'ler.
- Commit ve merge **kullanıcı onayıyla** yapılır. Commit öncesinde gelen düzeltme istekleri önce uygulanır,
  commit son haliyle atılır (sonradan "fix" commit'i yığmak yerine).
- **Push yok.** Şirket politikası netleşene kadar repo sadece lokal (bkz. PROJECT_STATUS "Açık konular").
- Git kimliği repo seviyesinde tanımlı; global ayarlara dokunma.

## Komutlar

Repo kökünden (`/c/repos/private/coin-web-portal`):

```bash
dotnet tool restore                                   # dotnet-ef local tool (fresh clone)
dotnet build                                          # backend build
dotnet ef migrations add <Name> --project src/CoinPortal.Api --output-dir Data/Migrations
dotnet ef database update --project src/CoinPortal.Api

# API (http://localhost:5080, Swagger: /swagger), content root must be the project folder
cd src/CoinPortal.Api && dotnet run --launch-profile http
cd src/CoinPortal.Api && dotnet run --launch-profile http -- --seed-dev-data   # dev data, then exits

# Client (http://localhost:4200, /api proxied to 5080)
cd src/client && npm install && ng serve
cd src/client && ng build
cd src/client && ng test --watch=false               # Vitest + jsdom
cd src/client && npx prettier --check "src/**/*.{ts,html,css}"
```

Seed kullanıcıları: `ayse.yilmaz`, `jonas.weber`, `elif.kaya`, `marco.bianchi`, `sophie.martin`
(e-postalar `@example.com`), parola hepsi için `Coinportal1`. Her birinde "Koleksiyonum" ve
"Hatıra paraları" koleksiyonları var; seed ayrıca ayse'nin "Koleksiyonum"unu ve elif'in "Hatıra
paraları"nı herkese açık, jonas'ın "Koleksiyonum"unu sadece linkle yapar. **Seed, bu kullanıcıların koleksiyon, coin ve fotoğraflarını
sıfırlar**; kullanıcı onlarla deneme yapmış olabilir (fotoğraf yüklemiş vb.), çalıştırmadan önce sor.
API çalışırken `dotnet run --no-build --launch-profile http -- --seed-dev-data` kullanılabilir.

## Mimari

```
src/CoinPortal.Api/     Controllers/, Contracts/{Auth,Coins,Collections,Countries,Common,Settings}/, Data/
                        (entities, AppDbContext, Migrations/), DevData/ (dev only), Photos/ (storage +
                        image processing), Querying/, Validation/, Localization/, App_Data/photos
                        (gitignored)
src/client/src/app/     core/{auth,coins,collections,public,http,i18n,settings}/, shared/, layout/header/,
                        pages/
src/client/src/i18n/    en.json, tr.json, de.json, bg.json (çeviriler)
```

- Veri: kullanıcı → koleksiyonlar (`Collections`) → coin'ler → fotoğraflar (`CoinPhotos`). Coin'de
  `OwnerId` da tutulur (koleksiyonun sahibiyle aynı olmalı; sahiplik kontrolleri ve fotoğraf yolu için).
- Rotalar: `/collections` (Koleksiyonlarım), `/collections/:collectionId` (liste/ızgara),
  `/coins/new?collection=<id>`, `/coins/:id/edit`, `/settings/<bölüm>` (Ayarlar; `profile`, `appearance`).
  Eski `/collection…` adresleri yönlendirilir.
  Girişsiz: `/explore` (Keşfet), `/u/:userName` (profil), `/u/:userName/:collectionId` (herkese açık
  koleksiyon), `/s/:token` (sadece linkle). Koleksiyon sayfası tek bileşen, route data `mode`
  (`owner` | `public` | `shared` | `explore`); `owner` dışı modlar salt okunur.
- Görünürlük koleksiyon başına: `Private` (varsayılan) / `Unlisted` (128 bit `ShareToken`, sadece
  Unlisted iken var; başka görünürlüğe geçince silinir) / `Public`.

- Auth: ASP.NET Core Identity + HttpOnly cookie `coinportal.auth` (JWT yok, SPA ile API aynı origin).
- CSRF: antiforgery, header `X-XSRF-TOKEN`; client `GET /api/auth/antiforgery` ile okunabilir
  `XSRF-TOKEN` cookie'si alır (açılışta ve her login/register/logout sonrası, token kullanıcıya bağlı).
- Yayın hedefi: Angular derlemesi API'nin `wwwroot`'undan sunulacak, tek site, Windows hosting.

## Backend kuralları

- Tüm controller'lar `api/[controller]` altında. İstisna: bir kaynağın alt kaynakları iç içe route
  kullanır (`api/coins/{coinId}/photos`). İstek/yanıt tipleri `Contracts/` altında, entity'ler dışarı açılmaz.
- **Görsel kütüphanesi sadece `IImageProcessor` arkasında** (`Photos/`, sözleşme arayüzün XML
  yorumunda). Kütüphane değişirse yeni bir uygulama yazılır ve `Program.cs`'teki kayıt değişir; başka
  dosya kütüphaneye referans vermez. Coin fotoğrafı (`ProcessAsync`, kare) ve koleksiyon kapağı
  (`ProcessCoverAsync`, 16:9) aynı sözleşmede. Dosyalar sadece `IPhotoStorage` üzerinden okunur/yazılır
  (`{ownerId}/{imageId}/{dosya}.webp`). Kota `PhotoQuota` ile, fotoğraf + kapak birlikte.
- Fotoğraflar statik sunulmaz; API sürümlü URL (`?v=<photoId>`) + `immutable` önbellekle sunar.
  Coin veya fotoğraf silinince dosyalar DB kaydından sonra silinir.
- **Kim neyi görebilir tek yerde:** `Querying/CollectionAccess.CanView` (sahip, herkese açık, ya da
  Unlisted + doğru `s=` anahtarı). Fotoğraf ve kapak GET'leri bunu kullanır (`[AllowAnonymous]`).
  Girişsiz okuma uçları `PublicController` (`api/public/...`) altında; yanıtlarda kullanıcı adı dışında
  kişisel veri olmaz, görünmeyen her şey 404. Coin listesi filtre/sıralama/sayfalama `CoinListing`
  ile paylaşılır. Keşfet'te `pageSize=0` (tümü) yasak (girişsiz, tüm veriyi tarar).
- **Arayüz metni API'de üretilmez**, çeviri client'ta. İstemcinin kendi mesajını göstermesi gereken
  hatalarda ProblemDetails'e makine kodu eklenir (`this.CodedProblem(code, title)`, ör.
  `invalid_image`, `last_collection`). Alan hatalarında ise
  ModelState anahtarı kod olur (ör. `DuplicateName`), client `applyServerErrors`'ın codeMap /
  messageKeys parametreleriyle alana eşler ve çevirir. API'nin kullanıcı adına ürettiği içerik
  (ilk koleksiyonun adı, `Collection.DefaultNameFor(lang)`) kullanıcının diline göre yazılır.
- Dil listesi iki yerde, birlikte değişir: `Localization/SupportedLanguages` ve client
  `core/i18n/languages.ts`. Kullanıcının dili `ApplicationUser.PreferredLanguage` (null = seçmedi),
  `me` yanıtında `language`, değişiklik `PUT api/settings`, kayıtta `RegisterRequest.Language`.
  **Yeni dil eklerken kontrol edilecekler:** yeni `i18n/<dil>.json` dosyasında tüm anahtarlar
  (test eşliği kontrol eder), `Collection.DefaultNameFor`, dil seçicideki bayrak (`shared/flag`) ve
  coin tablosunun sütun genişlikleri: yeni dildeki sütun başlıkları ve **ülke adları** mevcut en uzundan
  (şu an "Нидерландия") uzunsa `collection.html` `<colgroup>` genişlikleri headless ölçümle büyütülür
  (ölçüm yöntemi colgroup'un üstündeki yorumda).
- Kullanıcının yazdığı adların tekillik kontrolü kodda Türkçe + kültürden bağımsız büyük/küçük harf
  duyarsız yapılır (veritabanı collation'ı İ/i'yi eşlemez); unique index yedek korumadır.
- Kullanıcıya ait kaynaklarda sahiplik filtresi sorgunun içinde; başkasına ait kayıt → **404** (403 değil).
- Doğrulama hataları `ValidationProblem(ModelState)` ile 400 ProblemDetails olarak döner.
- Enum'lar JSON'da string (`JsonStringEnumConverter(allowIntegerValues: false)`).
- Tüm `DateTime` değerleri UTC (`UtcDateTimeConverter`, alan adları `…Utc`).
- `UseHttpsRedirection()` sadece Development dışında.
- Migration'ı uygulamadan önce oluşan `Up()` gözden geçirilir; Identity tablolarında beklenmeyen
  `AlterColumn` olmamalı. Mevcut veriye zorunlu yabancı anahtar eklenirken EF `defaultValue: 0`
  üretir ve FK'yı bozar: elle nullable ekle → `Sql()` ile doldur → `AlterColumn` NOT NULL
  (bkz. `AddCollections`). Migration'larda uygulama sabitleri değil literal değerler kullanılır.

## Client kuralları

- Angular 20+ adlandırma (`login.ts`, class `Login`), standalone, zoneless, durum signal'larla,
  `inject()`. Sayfalar `loadComponent` ile lazy.
- Formlar `NonNullableFormBuilder` ile Reactive Forms. Sunucu hataları `applyServerErrors(form, err)`
  ile forma uygulanır (400 anahtarları kontrol adlarıyla büyük/küçük harf duyarsız eşleşir).
- Liste sayfalarında **URL tek doğruluk kaynağı**: filtre/sıralama/sayfa query param'larda,
  `withComponentInputBinding()` ile input'lara bağlı, varsayılanlar URL'e yazılmaz; yükleme
  `toObservable(query)` + `switchMap`.
- Sıralama sunucuda (`sort` + `dir`, varsayılanlar URL'e yazılmaz). Tablo başlıkları
  `th[appSortHeader]` (`shared/sort-header`) ile sıralanır: artan → azalan → varsayılan. Mobilde tablo
  yok, aynı seçenekler "Sırala" select'inde. Sıralanabilir sütunlar sadece Başlık, Nominal, Ülke, Yıl
  (`COIN_SORT_COLUMNS`, API `CoinSort`); diğer sütun başlıkları düz. Telefonda filtreler "Filtrele"
  butonunun arkasında katlanır (arama kutusu hariç).
- Ülke sıralaması dile bağlı: client ülkeleri aktif dildeki ada göre sıralayıp `countryOrder=DE,AD,AT,…`
  olarak gönderir, API bu sıraya göre dizer. Veritabanında çok dilli isim tutulmaz.
- Tablolarda `table-fixed` + `<colgroup>` genişlikleri: sabit sütunlar `truncate` (tek satır), serbest
  metin sütunu (başlık) kalan alanı doldurur ve satır kaydırabilir. Tablo `lg` ve üstünde, altında kart listesi.
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
- Detay/form sayfalarından listeye dönüşler (geri linki, Vazgeç, kaydet/sil sonrası) koleksiyon
  sayfasının son adresiyle yapılır (`CollectionReturn` servisi, `returnTree()`); yoksa coin'in
  koleksiyonuna dönülür. Düz bir link koleksiyonu, görünümü ve filtreleri kaybettirir.
- Koleksiyon silme: ad birebir yazılmadan silinemez (boş olsa da); dolu koleksiyonda varsayılan seçenek
  coin'leri taşımak. Tek koleksiyon silinemez (API `last_collection`).
- **Renkler tema duyarlı token'larla:** `shade` (nötr, slate yerine), `brand` (vurgu rengi, varsayılan
  amber), `danger` (red), `info` (sky), `success` (emerald), `primary` / `primary-hover` / `on-primary`
  (birincil butonun dolgusu ve yazısı); ör. `bg-shade-0` (kart), `text-shade-900`, `bg-brand-50`. Koyu tema
  (`<html class="dark">`, `ThemeService`) sadece `styles.css`'teki değişkenleri değiştirir; template'e
  `dark:` ve düz palet (`slate-*`, `amber-*`, `bg-white`) yazılmaz. İstisna: iki temada aynı görünmesi
  gerekenler (tehlike butonunun dolgusu, logo, fotoğraf görüntüleyici, tema önizlemeleri, renk örnekleri).
  Tema tercihi dil gibi hesapta (`me` → `theme`, `PUT api/settings`), değişiklik `ThemePreference.change()`.
- **Vurgu rengi (tema rengi):** `brand` ve `primary` token'ları `--accent-*` değişkenlerinden gelir;
  her renk `styles.css`'te bir `:root[data-accent='…']` bloğu (amber varsayılan, attribute yok).
  Renk eklenirken birlikte değişenler: API `AccentColor` enum'u (+ check constraint, migration), client
  `ACCENT_COLORS` (`core/theme/accent.service.ts`), `index.html`'deki açılış betiği, `styles.css` bloğu,
  Ayarlar'daki renk örneği (`accent-settings.ts` `SWATCH`) ve `theme.accent.<değer>` çevirileri. Tercih temayla aynı
  modelde (`me` → `accent`, `AccentService`, `AccentPreference.change()`). Logo her zaman altın kalır.
- UI kütüphanesi yok. Ortak stiller `styles.css` içinde `@apply` class'ları: `card`, `form-label`,
  `form-input`, `form-error`, `form-hint`, `alert-error`, `btn-primary`, `btn-secondary`, `btn-danger`,
  `btn-icon`, `nav-link`, `link`, `dialog-panel` (modal `<dialog>` paneli + açılış animasyonu).
  Yeni ortak stil gerekirse buraya eklenir.
- Onaylar `ConfirmDialogService.confirm({...}): Promise<boolean>` ile (native `<dialog>`);
  `window.confirm` kullanılmaz. Diğer pencereler (kırpma, görüntüleyici) `@if` ile eklenir,
  `afterNextRender` içinde `showModal()` açılır, `(closed)` ile kaldırılır.
- Coin formunda fotoğraf değişiklikleri (`PhotoSlot`, `PhotoChange`) **Kaydet'te** uygulanır: önce coin,
  sonra yüzler sırayla. Fotoğraf hatasında coin kayıtlı kalır, adres düzenleme adresine çevrilir.
- Bekleyen görsel değişikliği tipi `ImageChange` (`shared/image-change.ts`); kapak da coin fotoğrafı gibi
  Kaydet'te uygulanır (`CoverPicker` + `CollectionFormDialog`). Kırpma penceresi (`PhotoCropDialog`)
  oran, daire/dikdörtgen, açıklama ve minimum genişliği input olarak alır.
- Üst menü (navbar) öğeleri `layout/header/header.ts` içindeki `NAV_ITEMS` listesinde (`public: true`
  girişsiz de görünür); masaüstü ve mobil menü aynı listeyi kullanır.
- Paylaşılan (Unlisted) koleksiyonda fotoğraf URL'lerine anahtar eklenir: `photoUrl(…, shareToken)`,
  `coverUrl(…, shareToken)`, `CoinThumb`/`PhotoViewer` `[shareToken]` input'u.
- Koleksiyon kartı `shared/collection-card`, görünürlük rozeti `shared/visibility-badge`. Kapak sadece
  yüklenen kapak (`coverImageId`); yoksa `CollectionPlaceholder` (`shared/collection-placeholder`).
- Bir SVG içinde `id` (mask, clipPath) kullanan bileşenler her kopyaya ayrı id verir (sayaçla, bkz.
  `flag`, `collection-placeholder`): `url(#…)` sayfadaki ilk eşleşen id'yi kullanır.
- Fotoğraf URL'leri `photoUrl(coinId, photo, size)` ile üretilir; listelerde `CoinThumb`, tam ekran
  `PhotoViewer` (yüz değiştirme: butonlar, ok tuşları döngülü, fare tekerleği döngüsüz ve hamle başına
  bir adım, `WheelGesture`). Fotoğrafı olmayan coin'in yerine `CoinPlaceholder` (`shared/coin-placeholder`).
- Custom element'ler varsayılan inline; boşluklar için `host: { class: 'block' }`.
- Sayfa iskeleti `app.html`: header, `main` (`max-w-5xl px-4`), footer. Header ve footer `sm` ve üstünde
  yapışkan (üstte / altta), telefonda değil (ekranı kaplamasın). İçerikleri de `max-w-5xl px-4`, kenarlar
  hizalı.
- Ülke isimleri client'ta `Intl.DisplayNames` ile ISO koddan, aktif dilde üretilir (`CountryService`).
- **i18n (Transloco, `@jsverse/transloco`):**
  - Template'te `{{ 'anahtar' | transloco }}`, sayıya bağlı metinde `{{ 'anahtar' | plural: n }}`
    (anahtarın altında `one` / `other`, `Intl.PluralRules`), TS'te `translate()`. Anahtarlar alan/sayfa
    adıyla gruplu (`coinList.*`, `collectionForm.*`, ortaklar `common.*`, `errors.*`, `validation.*`).
  - `computed()` içinde çeviri yapılmaz (dil değişince yeniden hesaplanmaz): computed anahtar döner,
    template çevirir. Dile bağlı `Intl` işleri `LanguageService.current()` signal'ını okur.
  - Enum etiketleri modelde tutulmaz, anahtar değerden türetilir: `coin.denomination.<değer>`,
    `coin.side.<değer>.label`, `visibility.<değer>.label`, `coin.sort.<sütun>.asc`.
  - Dil sırası: hesaptaki dil > bu tarayıcıdaki son seçim (`localStorage` `coinportal.language`) >
    tarayıcı dili > İngilizce. Açılışta ve girişte `LanguageService.use()`; çeviri yüklenmeden dil
    değişmez. Dil seçici footer'da (herkes) ve Ayarlar > Görünüm'de; ikisi de `LanguagePreference.change()`
    kullanır (girişliyse önce hesaba kaydeder). Seçici `shared/language-select` (bayraklı liste kutusu,
    klavyeyle kullanılır; native `<select>` resim gösteremez, emoji bayraklar Windows'ta harf çıkar),
    bayraklar `shared/flag` (inline SVG).
  - Dil dosyaları dinamik `import()` ile ayrı chunk (sadece aktif dil iner, adlar hash'li).
  - Route `title`'ları çeviri anahtarıdır (`TranslatedTitleStrategy`: "<metin> · Coin Portal").
  - Testlerde `provideTestTransloco()` + `await useTestLanguage('tr')` (`core/i18n/testing.ts`).
  - Ayarlar sayfası: soldaki bölüm menüsü `pages/settings/settings.ts` `SECTIONS`, her bölüm
    `settings.routes.ts` içinde bir alt rota.
- Prettier: `printWidth: 100`, `singleQuote`.

## Bilinen tuzaklar

- `AutoValidateAntiforgeryTokenAttribute` için `AddControllersWithViews()` gerekir; düz
  `AddControllers()` filtrenin servisini kaydetmez, her POST 500 verir.
- Swagger `UseRequestInterceptor` string'i JS string'e gömülüp `JSON.parse` ediliyor: **tek satır,
  ters eğik çizgisiz, çift tırnaksız** olmalı (backtick kullan), yoksa Swagger sayfası boş kalır.
- `.csproj` içindeki XML yorumlarında `--` kullanılamaz.
- `@for` ile oluşan `<option>`'larda seçili değer `[selected]` ile verilir; `<select [value]>` güvenilir değil.
- Kullanıcının API'si çalışırken `bin/` kilitli olur ve `dotnet build` kopyalamada takılır. Bu
  durumda ne yapılacağı "Çalışan uygulamalar" bölümünde. `dotnet ef migrations add` / `database update`
  için API'yi durdurmak gerekmez: `BaseOutputPath=<scratchpad>/efbin/ dotnet ef …` başka klasöre derler
  (`--configuration` ile ayrı konfigürasyon işe yaramaz: Debug dışı her derleme ImageSharp lisansı ister).
- Eski dosyaların çoğunda dosya sonu satır sonu yok (kopyala-yapıştır döneminden); Prettier'ı sadece
  değiştirilen dosyalarda çalıştır, ilgisiz dosyaları diff'e katma. Harici `.html` şablonları
  (`collection.html`, `header.html` vb.) hiç Prettier'dan geçmemiş; onlarda çalıştırma, tüm dosyayı
  yeniden biçimler.
- Python kurulu değil; betikler için Node veya Bash kullan. Bash `node -e "…"` içinde template literal
  (backtick) kaçışları bozuluyor; bu tür düzenlemeleri Edit aracıyla yap. Toplu metin değişikliği
  gerekirse betiği Write ile scratchpad'e yazıp `node` ile çalıştır (heredoc'lar da bozulabiliyor).
- **ImageSharp 4.x lisans anahtarı ister:** anahtar yoksa Debug derleme uyarı verir, **Release
  (publish) derleme hata verir.** Karar bekliyor (PROJECT_STATUS "Açık konular").
- Scratchpad'deki .NET betikleri (`dotnet run x.cs`, `#:package`) repo'nun `nuget.config`'ini görmez;
  şirket feed'i 401 verir. Betik klasörüne repo'daki `nuget.config` kopyalanır.
- ngx-image-cropper `allowMoveImage`: sürükleme farkını piksel olarak ekler, transform'un varsayılan
  birimi ise yüzde; `translateUnit: 'px'` verilmezse fotoğraf fareden kat kat hızlı kayar. Konum
  `(transformChange)` ile saklanmazsa yakınlaştırma değişince geri zıplar.
- Angular'ın radyo `[value]` bağlaması DOM `value` özelliğine yazılmaz (directive input'u); testte
  radyoyu etiket metniyle bul. `loading="lazy"` görseller headless'ta ekran dışındaysa hiç yüklenmez,
  `img.decode()` bekler durur; adresi `fetch` ile kontrol et.
- Headless Edge testlerinde `DOM.setFileInputFiles` ile verilen dosyalar okunamıyor (NotFoundError).
  Dosyayı sayfada `File` olarak oluşturup `DataTransfer` ile input'a ver.
- Seed komutu `src/CoinPortal.Api` klasöründen çalıştırılmalı (content root, `DevData/dev-seed.json`).
- Git Bash komut satırı argümanlarındaki Türkçe karakterler Windows ANSI kod sayfasına çevrilir
  (`curl -d '{"name":"LİSTE"}'` API'ye "LISTE" olarak gider). Türkçe içerikli API testlerini Node
  betiğiyle (`fetch`) ya da `--data-binary @dosya.json` ile yap.
- `sqlcmd` ile filtreli index'i olan tablolarda (ör. `AspNetUsers`) DELETE/UPDATE için `-I`
  (QUOTED_IDENTIFIER) gerekir. Konsol Türkçe karakterleri bozuk gösterir, veri doğrudur.
- `sticky` bir eleman ebeveyninin dışına çıkamaz: bileşen host'u (`<app-header>`) içerikle aynı
  yükseklikteyse içteki elemana verilen `sticky` işe yaramaz; `sticky` host'a verilir (`host: { class }`).
- `<select class="w-auto">` en uzun seçeneğe göre genişler; uzun dillerde (Bulgarca) mobilde sayfayı
  yatay taşırır. Select'e ve flex/grid atalarına `min-w-0` ver.
- Satır sonları LF (`.gitattributes`). Şirketin global `.npmrc`'sinde Azure DevOps feed'i var;
  paket kurulumunda sorun çıkarsa registry'nin public npm olduğunu kontrol et.
