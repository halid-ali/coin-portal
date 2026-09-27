# CLAUDE.md

Coin Portal: kullanıcıların kendi Euro madeni para koleksiyonlarını yönettiği web uygulaması.
Tek repo: ASP.NET Core Web API (.NET 10) + Angular 21 SPA + SQL Server.

**Her oturumun başında [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) dosyasını oku.** Orada güncel durum,
tamamlanan özellikler, sıradaki adım, açık konular ve alınmış kararların gerekçeleri var. Bu dosya
(CLAUDE.md) ise değişmeyen kuralları ve komutları tutar.

## Çalışma kuralları

- Kullanıcıyla iletişim **Türkçe**. Koddaki yorumlar, commit mesajları, branch adları **İngilizce**.
- Arayüz metinleri şimdilik Türkçe, template'lerde ve `shared/form-errors.ts` içinde sabit (i18n ileride).
- Kullanıcıya verilen terminal komutları **Git Bash** sözdiziminde (`/c/repos/...`).
- Büyük bir değişiklikten önce kısa bir plan sun, kullanıcı onaylayınca uygula. Karar kullanıcıya aitse
  (UX, kapsam, kütüphane seçimi) sor; teknik varsayılanı belli olan konularda sorma, seçip söyle.
- Kodu değiştirdikten sonra doğrula: backend için `dotnet build`, client için `ng build` ve `ng test`.
  Doğrulanamayan bir şey varsa (ör. tarayıcıda görsel kontrol) bunu açıkça söyle.
- Bir özellik ya da anlamlı bir adım bitince [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) güncellenir
  (tamamlananlar, yeni kararlar, açık konular, sıradaki adım, "Son güncelleme" satırı).
  Kalıcı bir kural veya tuzak öğrenildiyse bu dosyaya eklenir.

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
(e-postalar `@example.com`), parola hepsi için `Coinportal1`.

## Mimari

```
src/CoinPortal.Api/     Controllers/, Contracts/{Auth,Coins,Countries,Common}/, Data/ (entities,
                        AppDbContext, Migrations/), DevData/ (dev only), Validation/
src/client/src/app/     core/{auth,coins,http}/, shared/, layout/header/, pages/
```

- Auth: ASP.NET Core Identity + HttpOnly cookie `coinportal.auth` (JWT yok, SPA ile API aynı origin).
- CSRF: antiforgery, header `X-XSRF-TOKEN`; client `GET /api/auth/antiforgery` ile okunabilir
  `XSRF-TOKEN` cookie'si alır (açılışta ve her login/register/logout sonrası, token kullanıcıya bağlı).
- Yayın hedefi: Angular derlemesi API'nin `wwwroot`'undan sunulacak, tek site, Windows hosting.

## Backend kuralları

- Tüm controller'lar `api/[controller]` altında. İstek/yanıt tipleri `Contracts/` altında, entity'ler
  dışarı açılmaz.
- Kullanıcıya ait kaynaklarda sahiplik filtresi sorgunun içinde; başkasına ait kayıt → **404** (403 değil).
- Doğrulama hataları `ValidationProblem(ModelState)` ile 400 ProblemDetails olarak döner.
- Enum'lar JSON'da string (`JsonStringEnumConverter(allowIntegerValues: false)`).
- Tüm `DateTime` değerleri UTC (`UtcDateTimeConverter`, alan adları `…Utc`).
- `UseHttpsRedirection()` sadece Development dışında.
- Migration'ı uygulamadan önce oluşan `Up()` gözden geçirilir; Identity tablolarında beklenmeyen
  `AlterColumn` olmamalı.

## Client kuralları

- Angular 20+ adlandırma (`login.ts`, class `Login`), standalone, zoneless, durum signal'larla,
  `inject()`. Sayfalar `loadComponent` ile lazy.
- Formlar `NonNullableFormBuilder` ile Reactive Forms. Sunucu hataları `applyServerErrors(form, err)`
  ile forma uygulanır (400 anahtarları kontrol adlarıyla büyük/küçük harf duyarsız eşleşir).
- Liste sayfalarında **URL tek doğruluk kaynağı**: filtre/sıralama/sayfa query param'larda,
  `withComponentInputBinding()` ile input'lara bağlı, varsayılanlar URL'e yazılmaz; yükleme
  `toObservable(query)` + `switchMap`.
- UI kütüphanesi yok. Ortak stiller `styles.css` içinde `@apply` class'ları: `card`, `form-label`,
  `form-input`, `form-error`, `form-hint`, `alert-error`, `btn-primary`, `btn-secondary`, `btn-danger`,
  `btn-icon`, `nav-link`, `link`. Yeni ortak stil gerekirse buraya eklenir.
- Onaylar `ConfirmDialogService.confirm({...}): Promise<boolean>` ile (native `<dialog>`);
  `window.confirm` kullanılmaz.
- Custom element'ler varsayılan inline; boşluklar için `host: { class: 'block' }`.
- Ülke isimleri client'ta `Intl.DisplayNames` ile ISO koddan üretilir (`CountryService`, locale `tr`).
- Prettier: `printWidth: 100`, `singleQuote`.

## Bilinen tuzaklar

- `AutoValidateAntiforgeryTokenAttribute` için `AddControllersWithViews()` gerekir; düz
  `AddControllers()` filtrenin servisini kaydetmez, her POST 500 verir.
- Swagger `UseRequestInterceptor` string'i JS string'e gömülüp `JSON.parse` ediliyor: **tek satır,
  ters eğik çizgisiz, çift tırnaksız** olmalı (backtick kullan), yoksa Swagger sayfası boş kalır.
- `.csproj` içindeki XML yorumlarında `--` kullanılamaz.
- `@for` ile oluşan `<option>`'larda seçili değer `[selected]` ile verilir; `<select [value]>` güvenilir değil.
- Seed komutu `src/CoinPortal.Api` klasöründen çalıştırılmalı (content root, `DevData/dev-seed.json`).
- Satır sonları LF (`.gitattributes`). Şirketin global `.npmrc`'sinde Azure DevOps feed'i var;
  paket kurulumunda sorun çıkarsa registry'nin public npm olduğunu kontrol et.
