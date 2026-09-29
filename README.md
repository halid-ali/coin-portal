# Coin Portal

A web application for managing a personal euro coin collection. Users register, organise their coins
into collections, add photos of both sides, and share collections publicly or through a private link.

## Features

- Accounts with cookie-based authentication (18+ registration)
- Multiple collections per user, each Private, Unlisted (secret link) or Public
- Coins with denomination, issuing country, year, mint mark, commemorative flag and description
- Photos of the national and common side: client-side cropping, server-side validation and resizing
  to WebP thumbnails, previews and full-size images, with a per-user storage quota
- List and grid views with filtering, sorting and paging kept in the URL
- Public profiles and an Explore page across all public collections
- Interface in English, Turkish, German and Bulgarian; light, dark and system themes; accent colours

## Tech stack

- **Backend:** ASP.NET Core Web API on .NET 10, EF Core 10, ASP.NET Core Identity, SQL Server,
  SixLabors ImageSharp
- **Frontend:** Angular 21 (standalone components, signals, zoneless), Tailwind CSS 4, Transloco,
  Vitest

The Angular build is meant to be served from the API's `wwwroot` as a single site, so the SPA and the
API share one origin (no CORS, no JWT).

## Repository layout

```
src/api/        ASP.NET Core API (project CoinPortal.Api)
src/web/        Angular client
tests/          API and end-to-end tests (planned)
docs/           Project status, decisions and dated reviews
.config/        .NET local tools (dotnet-ef)
```

## Requirements

- .NET SDK 10 (pinned in `global.json`)
- Node.js 22+ and Angular CLI 21
- SQL Server LocalDB (or another SQL Server; set `ConnectionStrings:DefaultConnection`)

Docker is not required.

## Getting started

```bash
# First time on a fresh clone
dotnet tool restore
dotnet ef database update --project src/api
(cd src/web && npm install)

# Optional: development data (5 users, 567 coins, password Coinportal1)
cd src/api && dotnet run --launch-profile http -- --seed-dev-data

# Terminal 1: API on http://localhost:5080 (Swagger UI at /swagger)
cd src/api && dotnet run --launch-profile http

# Terminal 2: client on http://localhost:4200 (/api is proxied to the API)
cd src/web && ng serve
```

The development data is for local use only; it resets the seed users' collections and photos each
time it runs.

## Tests and checks

```bash
dotnet build
cd src/web && ng test --watch=false
cd src/web && npx prettier --check "src/**/*.{ts,html,css}"
```

## Image processing license

ImageSharp 4 checks for a Six Labors license key at build time. Debug builds only print a warning;
Release builds and `dotnet publish` fail without a key. Provide it through the `SixLaborsLicenseKey`
MSBuild property or environment variable, or a `sixlabors.lic` file (ignored by Git). Image handling
sits behind a single interface (`IImageProcessor`), so the library can be replaced.

## Documentation

- [CHANGELOG.md](CHANGELOG.md): release notes, generated from the commit history
- [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md): current state, decisions and roadmap
- [docs/reviews/](docs/reviews/): dated reviews of the project's direction
- [CLAUDE.md](CLAUDE.md): development rules and known pitfalls

These internal documents are written in Turkish; code, comments and commit messages are in English.

## License

[MIT](LICENSE)
