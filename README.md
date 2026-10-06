# CoinVitrine

[![release](https://img.shields.io/github/v/release/halid-ali/coin-portal?label=release)](https://github.com/halid-ali/coin-portal/releases/latest)
[![license](https://img.shields.io/github/license/halid-ali/coin-portal?label=license&color=97ca00)](LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/halid-ali/coin-portal/ci.yml?branch=main&label=CI)](https://github.com/halid-ali/coin-portal/actions/workflows/ci.yml)
[![tests](https://img.shields.io/badge/tests-685%20passing-brightgreen)](#tests-and-checks)
[![languages](https://img.shields.io/badge/languages-4-orange)](#features)

<!-- The tests badge is static: API + client + end-to-end tests, updated with each release -->


A web application for managing a personal euro coin collection. Users register, organise their coins
into collections, add photos of both sides, and share collections publicly or through a private link.
Live at https://coinvitrine.com.

## Features

- Accounts with cookie-based authentication (18+ registration)
- Multiple collections per user, each Private, Unlisted (secret link) or Public
- Coins with denomination, issuing country, year, mint mark, commemorative flag and description
- Photos of the national and common side: client-side cropping, server-side validation and resizing
  to WebP thumbnails, previews and full-size images, with a per-user storage quota
- List and grid views with filtering, sorting and paging kept in the URL
- Public profiles and an Explore page across all public collections; a collection becomes public once
  every coin has a photo of its national side and a minimum number of coins (an admin setting) do
- Interface in English, Turkish, German and Bulgarian; light, dark and system themes; accent colours
- Admin panel for moderation: statistics, users (lock, delete), shared collections (hide), general
  settings, audit log
- Account data export (ZIP with all data and photos) and account deletion
- Privacy policy, terms of use and contact pages
- Installable as an app (web app manifest)
- Hosting safeguards: rate limits, security headers, one canonical address, startup checks of the
  configured folders, daily log files with share keys and search terms masked

## Tech stack

- **Backend:** ASP.NET Core Web API on .NET 10, EF Core 10, ASP.NET Core Identity, SQL Server,
  SixLabors ImageSharp
- **Frontend:** Angular 21 (standalone components, signals, zoneless), Tailwind CSS 4, Transloco,
  Vitest

The API serves the Angular build from its `wwwroot` as a single site, so the SPA and the API share one
origin (no CORS, no JWT). `dotnet publish src/api -c Release -o <dir>` builds the client too and puts
it into the package's `wwwroot`; in development `ng serve` serves the client instead.

## Repository layout

```
src/api/        ASP.NET Core API (project CoinPortal.Api)
src/web/        Angular client
tests/api/      API tests (xUnit v3, in-memory API against SQL Server)
tests/e2e/      End-to-end tests (Playwright, the whole site in a browser)
docs/           Project status, decisions and dated reviews
.config/        .NET local tools (dotnet-ef)
```

## Requirements

- .NET SDK 10 (pinned in `global.json`)
- Node.js 22.19+ ( works without a global Angular CLI)
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
cd src/web && npx ng serve
```

The development data is for local use only; it resets the seed users' collections and photos each
time it runs.

The admin panel (`/admin`) is open to the users whose Id is listed in `Admin:UserIds`: put your
`AspNetUsers.Id` into `src/api/appsettings.Development.json` (or set `Admin__UserIds__0`) and restart the
API. Roles are granted only from configuration, never from the panel.

## Tests and checks

```bash
dotnet build
dotnet test                  # API tests; needs LocalDB (or set COINPORTAL_TEST_SQL)
cd src/web && npx ng test --watch=false
cd src/web && npx prettier --check "src/**/*.{ts,html,css}"
cd tests/e2e && npm install && npx playwright test   # end-to-end, see below
```

The API tests create a database of their own for each run (`CoinPortal_Tests_…`) and drop it at
the end; the development database is not touched. To use another SQL Server, set
`COINPORTAL_TEST_SQL` to a connection string without a database name.

The end-to-end tests (`tests/e2e`, Playwright) drive the whole site in a browser: sign-up to a coin
with a cropped photo, share links, sessions, moderation, and an accessibility scan (axe) of each
page. `server/start.mjs` builds the client and the API and runs them together on port 5091 with a
database of their own (`CoinPortal_E2E` on LocalDB, or `COINPORTAL_E2E_SQL`); the development API,
`ng serve` and database are not touched. Locally the tests use the installed Microsoft Edge (no
browser download), CI uses Playwright's Chromium. `npx playwright show-report` opens the last report.

## Image processing license

ImageSharp 4 checks for a Six Labors license key at build time (the running app does not need it).
Debug builds only print a warning, so development works without a key; Release builds and
`dotnet publish` fail without one. The project's own key is not in the repository. To build Release,
get your own key at [licensing.sixlabors.com](https://licensing.sixlabors.com/) and either save the
`sixlabors.lic` file in `src/api/` (ignored by Git; the build searches the project folder, not the
repository root) or set the `SixLaborsLicenseKey` environment variable to its contents. CI builds
Release on `main` with the key from a repository secret. Image handling sits behind a single
interface (`IImageProcessor`), so the library can be replaced.

## Releases

Pushing a version tag (`vX.Y.Z`) runs `.github/workflows/release.yml`: it publishes the site (API with
the client in `wwwroot`), adds an idempotent `migrate.sql` for the database and attaches
`coinportal-vX.Y.Z.zip` with its SHA-256 to the GitHub Release.

## Documentation

- [CHANGELOG.md](CHANGELOG.md): release notes, generated from the commit history
- [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md): current state, decisions and roadmap
- [docs/reviews/](docs/reviews/): dated reviews of the project's direction
- [CLAUDE.md](CLAUDE.md): development rules and known pitfalls
- [SECURITY.md](SECURITY.md): how to report a vulnerability

These internal documents are written in Turkish; code, comments and commit messages are in English.

## License

[MIT](LICENSE). The third-party software it uses and their licenses are listed in
[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md); ImageSharp is used under the Apache 2.0 terms of the
Six Labors Split License.
