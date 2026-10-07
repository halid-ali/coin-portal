# Third-party notices

Coin Portal is licensed under the [MIT License](LICENSE). It is built on the open-source software
listed here, each under its own license. The full license texts are at the linked addresses.

## Client (Angular)

Every package bundled into the client is listed with its license text in `3rdpartylicenses.txt`,
which the Angular build generates and the release package serves at `/3rdpartylicenses.txt`. The
main ones:

| Package | License |
|---|---|
| Angular | [MIT](https://github.com/angular/angular/blob/main/LICENSE) |
| RxJS | [Apache-2.0](https://github.com/ReactiveX/rxjs/blob/master/LICENSE.txt) |
| Transloco (`@jsverse/transloco`) | [MIT](https://github.com/jsverse/transloco/blob/master/LICENSE) |
| ngx-image-cropper | [MIT](https://github.com/Mawi137/ngx-image-cropper/blob/master/LICENSE) |
| Tailwind CSS | [MIT](https://github.com/tailwindlabs/tailwindcss/blob/main/LICENSE) |
| tslib | [0BSD](https://github.com/microsoft/tslib/blob/main/LICENSE.txt) |

## Server (.NET)

| Package | License |
|---|---|
| ASP.NET Core, Entity Framework Core, Microsoft.Data.SqlClient | [MIT](https://github.com/dotnet/aspnetcore/blob/main/LICENSE.txt) |
| SixLabors.ImageSharp | [Six Labors Split License 1.0](https://github.com/SixLabors/ImageSharp/blob/main/LICENSE) |
| MailKit, MimeKit | [MIT](https://github.com/jstedfast/MailKit/blob/master/LICENSE) |
| BouncyCastle.Cryptography (used by MimeKit) | [MIT](https://github.com/bcgit/bc-csharp/blob/master/LICENSE.html) |
| Serilog, Serilog.AspNetCore and its sinks | [Apache-2.0](https://github.com/serilog/serilog/blob/dev/LICENSE) |
| Swashbuckle.AspNetCore.SwaggerUI (development only) | [MIT](https://github.com/domaindrivendev/Swashbuckle.AspNetCore/blob/master/LICENSE) |

**ImageSharp** is used under the Apache License 2.0 terms of the Six Labors Split License, which
apply to open-source projects. Builds use a free Six Labors Community license key; the key is not
part of this repository (see the README). The running application needs no key.

## Build tools (not shipped)

| Tool | License |
|---|---|
| MinVer | [Apache-2.0](https://github.com/adamralph/minver/blob/main/LICENSE) |
| git-cliff | [MIT or Apache-2.0](https://github.com/orhun/git-cliff/blob/main/LICENSE-MIT) |
| Vitest, jsdom, Prettier, TypeScript | MIT, MIT, MIT, Apache-2.0 |
