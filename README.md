# Coin Portal

Euro madeni para koleksiyonunu yönetmek için bir web uygulaması: kayıt/giriş, koleksiyona coin ekleme,
düzenleme, silme, filtreleme ve sıralama.

- **Backend:** ASP.NET Core Web API (.NET 10), EF Core 10, ASP.NET Core Identity (cookie auth), SQL Server
- **Frontend:** Angular 21 (standalone, signals, zoneless), Tailwind CSS 4, Vitest

Proje durumu ve yol haritası: [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) ·
Geliştirme kuralları: [CLAUDE.md](CLAUDE.md)

## Gereksinimler

.NET SDK 10 (`global.json`), Node.js 22+, Angular CLI 21, SQL Server LocalDB.

## Lokal çalıştırma

```bash
# First time on a fresh clone
dotnet tool restore
dotnet ef database update --project src/api
(cd src/web && npm install)

# Optional: test data (5 users, 567 coins, password Coinportal1)
cd src/api && dotnet run --launch-profile http -- --seed-dev-data

# Terminal 1: API on http://localhost:5080 (Swagger: /swagger)
cd src/api && dotnet run --launch-profile http

# Terminal 2: client on http://localhost:4200 (/api is proxied to the API)
cd src/web && ng serve
```

## Testler

```bash
cd src/web && ng test --watch=false
```
