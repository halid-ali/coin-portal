using System.Net;
using CoinPortal.Api.Contracts.Collections;
using CoinPortal.Api.Data;
using CoinPortal.Api.Tests.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CoinPortal.Api.Tests;

/// <summary>
/// Rate limits and the Angular client's hosting (wwwroot, fallback to index.html, cache headers).
/// Each test runs its own host (fresh limiter state, settings of its own); see
/// <see cref="CoinPortalFactory.WithSettings"/> for why they are in the admin collection.
/// </summary>
[Collection(AdminCollection.Name)]
public sealed class HostingTests(CoinPortalFactory factory) : IDisposable
{
    private const string IndexHtml = "<!doctype html><title>CoinVitrine test client</title>";
    private const string HashedScript = "main-AB12CD34.js";

    private readonly string webRoot = Path.Combine(Path.GetTempPath(), $"CoinPortal_WebRoot_{Guid.NewGuid():N}");

    [Fact]
    public async Task SignIn_OverTheLimit_Returns429WithCodeAndRetryAfter()
    {
        await using var host = factory.WithSettings(new Dictionary<string, string?>
        {
            ["RateLimiting:Auth:PermitLimit"] = "2",
        });
        using var client = await CoinPortalFactory.CreateAnonymousClientAsync(host);

        for (var i = 0; i < 2; i++)
        {
            using var wrong = await client.LoginAsync("nobody", "Wrongpass123");
            await wrong.ShouldHaveStatusAsync(HttpStatusCode.Unauthorized);
        }
        using var limited = await client.LoginAsync("nobody", "Wrongpass123");

        Assert.Equal("rate_limited", await limited.ReadProblemCodeAsync(HttpStatusCode.TooManyRequests));
        Assert.True(int.Parse(Assert.Single(limited.Headers.GetValues("Retry-After"))) > 0);

        // Sign-up shares the limit
        using var signUp = await client.PostAsync("/api/auth/register", TestUser.NewRegisterRequest());
        await signUp.ShouldHaveStatusAsync(HttpStatusCode.TooManyRequests);
    }

    [Fact]
    public async Task PublicReads_AreLimitedForSignedOutClientsOnly()
    {
        await using var host = factory.WithSettings(new Dictionary<string, string?>
        {
            ["RateLimiting:Public:PermitLimit"] = "4",
        });
        // Each new client fetches its antiforgery token signed out: 2 of the 4 (the test server
        // has no remote address, so all clients share one)
        using var anonymous = await CoinPortalFactory.CreateAnonymousClientAsync(host);
        using var signedIn = await CoinPortalFactory.CreateAnonymousClientAsync(host);
        await signedIn.RegisterAsync(TestUser.NewRegisterRequest());

        for (var i = 0; i < 2; i++)
        {
            using var ok = await anonymous.GetAsync("/api/public/collectors");
            await ok.ShouldHaveStatusAsync(HttpStatusCode.OK);
        }
        using var limited = await anonymous.GetAsync("/api/public/collectors");
        Assert.Equal("rate_limited", await limited.ReadProblemCodeAsync(HttpStatusCode.TooManyRequests));

        for (var i = 0; i < 3; i++)
        {
            using var ok = await signedIn.GetAsync("/api/public/collectors");
            await ok.ShouldHaveStatusAsync(HttpStatusCode.OK);
        }
    }

    [Fact]
    public async Task Writes_AreLimitedPerUser_ReadsAreNot()
    {
        await using var host = factory.WithSettings(new Dictionary<string, string?>
        {
            ["RateLimiting:Writes:PermitLimit"] = "2",
        });
        using var alice = await CoinPortalFactory.CreateAnonymousClientAsync(host);
        await factory.ConfirmEmailAsync((await alice.RegisterAsync(TestUser.NewRegisterRequest())).Id);
        using var bob = await CoinPortalFactory.CreateAnonymousClientAsync(host);
        await factory.ConfirmEmailAsync((await bob.RegisterAsync(TestUser.NewRegisterRequest())).Id);

        for (var i = 0; i < 2; i++)
        {
            using var ok = await alice.PostAsync("/api/collections", new CollectionUpsertRequest { Name = $"C{i}" });
            await ok.ShouldHaveStatusAsync(HttpStatusCode.Created);
        }
        using var limited = await alice.PostAsync("/api/collections", new CollectionUpsertRequest { Name = "C2" });
        using var read = await alice.GetAsync("/api/collections");
        // Another user from the same address has a count of their own
        using var other = await bob.PostAsync("/api/collections", new CollectionUpsertRequest { Name = "C0" });

        Assert.Equal("rate_limited", await limited.ReadProblemCodeAsync(HttpStatusCode.TooManyRequests));
        await read.ShouldHaveStatusAsync(HttpStatusCode.OK);
        await other.ShouldHaveStatusAsync(HttpStatusCode.Created);
    }

    [Fact]
    public async Task AccountLimits_CollectionsAndCoins()
    {
        await using var host = factory.WithSettings(new Dictionary<string, string?>
        {
            ["UserLimits:MaxCollections"] = "2",
            ["UserLimits:MaxCoins"] = "1",
        });
        using var client = await CoinPortalFactory.CreateAnonymousClientAsync(host);
        await factory.ConfirmEmailAsync((await client.RegisterAsync(TestUser.NewRegisterRequest())).Id);
        var first = Assert.Single(await client.GetJsonAsync<List<CollectionResponse>>("/api/collections"));

        // The first collection comes with sign-up: one more fits
        using var second = await client.PostAsync("/api/collections", new CollectionUpsertRequest { Name = "Second" });
        using var third = await client.PostAsync("/api/collections", new CollectionUpsertRequest { Name = "Third" });
        using var coin = await client.PostAsync("/api/coins", TestUser.NewCoin(first.Id));
        using var tooMany = await client.PostAsync("/api/coins", TestUser.NewCoin(first.Id));

        await second.ShouldHaveStatusAsync(HttpStatusCode.Created);
        Assert.Equal("collection_limit", await third.ReadProblemCodeAsync());
        await coin.ShouldHaveStatusAsync(HttpStatusCode.Created);
        Assert.Equal("coin_limit", await tooMany.ReadProblemCodeAsync());
    }

    [Fact]
    public async Task Upload_LargerThanTheSourceLimit_IsRejected()
    {
        await using var host = factory.WithSettings(new Dictionary<string, string?>
        {
            ["PhotoStorage:MaxSourceDimension"] = "1600",
        });
        using var client = await CoinPortalFactory.CreateAnonymousClientAsync(host);
        await client.RegisterAsync(TestUser.NewRegisterRequest());
        var collection = Assert.Single(await client.GetJsonAsync<List<CollectionResponse>>("/api/collections"));
        using var created = await client.PostAsync("/api/coins", TestUser.NewCoin(collection.Id));
        var coin = await created.ReadJsonAsync<Contracts.Coins.CoinResponse>();

        // Checked from the header, before any pixel is decoded
        using var tooWide = await client.PutFileAsync($"/api/coins/{coin.Id}/photos/National", TestImages.Png(1601, 200));
        using var fits = await client.PutFileAsync($"/api/coins/{coin.Id}/photos/National", TestImages.Png(1600, 200));

        Assert.Equal("invalid_image", await tooWide.ReadProblemCodeAsync());
        await fits.ShouldHaveStatusAsync(HttpStatusCode.OK);
    }

    [Fact]
    public async Task ImageReads_AreLimitedForSignedOutClients()
    {
        await using var host = factory.WithSettings(new Dictionary<string, string?>
        {
            ["RateLimiting:Photos:PermitLimit"] = "2",
        });
        using var anonymous = await CoinPortalFactory.CreateAnonymousClientAsync(host);

        // Missing images count too: the limit is on requests, not on what they find
        using var photo = await anonymous.GetAsync("/api/coins/999999/photos/National/Thumb");
        using var cover = await anonymous.GetAsync("/api/collections/999999/cover");
        using var limited = await anonymous.GetAsync("/api/coins/999999/photos/National/Thumb");

        await photo.ShouldHaveStatusAsync(HttpStatusCode.NotFound);
        await cover.ShouldHaveStatusAsync(HttpStatusCode.NotFound);
        Assert.Equal("rate_limited", await limited.ReadProblemCodeAsync(HttpStatusCode.TooManyRequests));
    }

    [Fact]
    public async Task RequestLog_MasksShareKeys()
    {
        const string key = "SecretKey0123456789abc";
        Directory.CreateDirectory(webRoot);
        var logs = Path.Combine(webRoot, "logs");
        await using (var host = factory.WithSettings(new Dictionary<string, string?>
        {
            ["Serilog:MinimumLevel:Default"] = "Information",
            ["Logs:Path"] = logs,
        }))
        {
            using var client = await CoinPortalFactory.CreateAnonymousClientAsync(host);
            using var shared = await client.GetAsync($"/api/public/shared/{key}");
            await shared.ShouldHaveStatusAsync(HttpStatusCode.NotFound);
        }

        // The request line is written before the response returns. The file sink may still hold
        // the file right after the host stops, so it is read shared.
        // The key in a query (?s=) is not covered here: the test server gives no raw request
        // target, so the request log leaves the query out (Kestrel and IIS give it); see
        // LogMaskingTests for the masking itself.
        var text = string.Concat(Directory.GetFiles(logs).Select(ReadShared));
        Assert.Contains("HTTP GET /api/public/shared/*** responded 404", text);
        Assert.DoesNotContain(key, text);
    }

    [Fact]
    public async Task Export_IsLimitedPerUser()
    {
        await using var host = factory.WithSettings(new Dictionary<string, string?>
        {
            ["RateLimiting:Export:PermitLimit"] = "1",
        });
        using var alice = await CoinPortalFactory.CreateAnonymousClientAsync(host);
        await alice.RegisterAsync(TestUser.NewRegisterRequest());
        using var bob = await CoinPortalFactory.CreateAnonymousClientAsync(host);
        await bob.RegisterAsync(TestUser.NewRegisterRequest());

        using var first = await alice.GetAsync("/api/settings/export");
        using var second = await alice.GetAsync("/api/settings/export");
        // Same address, another user: a count of their own
        using var other = await bob.GetAsync("/api/settings/export");

        await first.ShouldHaveStatusAsync(HttpStatusCode.OK);
        Assert.Equal("rate_limited", await second.ReadProblemCodeAsync(HttpStatusCode.TooManyRequests));
        await other.ShouldHaveStatusAsync(HttpStatusCode.OK);
    }

    [Theory]
    [InlineData("/")]
    [InlineData("/collections/5")]
    [InlineData("/s/AbCdEf0123456789")]
    // User names may contain dots: not to be taken for a file name
    [InlineData("/u/ayse.yilmaz")]
    [InlineData("/u/ayse.yilmaz/12")]
    public async Task ClientRoutes_ServeIndexHtml_Revalidated(string path)
    {
        await using var host = HostWithClient();
        using var client = await CoinPortalFactory.CreateAnonymousClientAsync(host);

        using var response = await client.GetAsync(path);

        await response.ShouldHaveStatusAsync(HttpStatusCode.OK);
        Assert.Equal(IndexHtml, await response.Content.ReadAsStringAsync());
        Assert.Equal("text/html", response.Content.Headers.ContentType?.MediaType);
        Assert.True(response.Headers.CacheControl?.NoCache);
    }

    [Fact]
    public async Task WebAppManifest_IsServedWithItsType()
    {
        await using var host = HostWithClient();
        using var client = await CoinPortalFactory.CreateAnonymousClientAsync(host);

        // Static files answer 404 for extensions they do not know; browsers want this type
        using var response = await client.GetAsync("/manifest.webmanifest");

        await response.ShouldHaveStatusAsync(HttpStatusCode.OK);
        Assert.Equal("application/manifest+json", response.Content.Headers.ContentType?.MediaType);
        Assert.True(response.Headers.CacheControl?.NoCache);
    }

    [Fact]
    public async Task HashedFiles_AreCachedForGood()
    {
        await using var host = HostWithClient();
        using var client = await CoinPortalFactory.CreateAnonymousClientAsync(host);

        using var response = await client.GetAsync("/" + HashedScript);

        await response.ShouldHaveStatusAsync(HttpStatusCode.OK);
        Assert.Equal(TimeSpan.FromDays(365), response.Headers.CacheControl?.MaxAge);
        Assert.Contains("immutable", response.Headers.CacheControl?.ToString());
    }

    [Fact]
    public async Task SecurityHeaders_OnPagesAndApi_AndApiDataIsNeverCached()
    {
        await using var host = HostWithClient();
        using var client = await CoinPortalFactory.CreateAnonymousClientAsync(host);

        using var page = await client.GetAsync("/collections/5");
        using var api = await client.GetAsync("/api/countries");

        foreach (var response in new[] { page, api })
        {
            await response.ShouldHaveStatusAsync(HttpStatusCode.OK);
            Assert.Equal("nosniff", Single(response, "X-Content-Type-Options"));
            Assert.Equal("DENY", Single(response, "X-Frame-Options"));
            Assert.Equal("frame-ancestors 'none'", Single(response, "Content-Security-Policy"));
            Assert.Equal("strict-origin-when-cross-origin", Single(response, "Referrer-Policy"));
            Assert.Contains("camera=()", Single(response, "Permissions-Policy"));
            Assert.Equal("same-origin", Single(response, "Cross-Origin-Opener-Policy"));
            Assert.Equal("same-origin", Single(response, "Cross-Origin-Resource-Policy"));
            Assert.Equal("require-corp", Single(response, "Cross-Origin-Embedder-Policy"));
        }
        Assert.True(api.Headers.CacheControl?.NoStore);
        // The page keeps its own policy (revalidated, see ClientRoutes_ServeIndexHtml_Revalidated)
        Assert.True(page.Headers.CacheControl?.NoCache);
    }

    [Fact]
    public async Task Hsts_OnARealHostName_NotOnLocalhost()
    {
        await using var host = factory.WithSettings(new Dictionary<string, string?>());
        using var site = host.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://coins.example"),
            AllowAutoRedirect = false,
        });
        using var local = host.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false,
        });

        using var siteResponse = await site.GetAsync("/api/health");
        using var localResponse = await local.GetAsync("/api/health");

        // 30 days at first (Hsts:MaxAgeDays)
        Assert.Equal("max-age=2592000", Single(siteResponse, "Strict-Transport-Security"));
        Assert.False(localResponse.Headers.Contains("Strict-Transport-Security"));
    }

    [Fact]
    public async Task PlainHttp_IsRedirectedToHttps()
    {
        // On IIS the port comes from the site's binding; the test server has none
        await using var host = factory.WithSettings(new Dictionary<string, string?> { ["https_port"] = "443" });
        using var client = host.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("http://localhost"),
            AllowAutoRedirect = false,
        });

        using var response = await client.GetAsync("/api/health?x=1");

        Assert.Equal(HttpStatusCode.TemporaryRedirect, response.StatusCode);
        Assert.Equal("https://localhost/api/health?x=1", response.Headers.Location?.ToString());
    }

    [Fact]
    public async Task OtherHostNames_AreRedirectedToTheCanonicalHost()
    {
        await using var host = factory.WithSettings(new Dictionary<string, string?>
        {
            ["CanonicalHost:Host"] = "coins.example",
            ["https_port"] = "443",
        });
        HttpClient Client(string address) => host.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri(address),
            AllowAutoRedirect = false,
        });
        using var old = Client("https://old.example");
        using var oldHttp = Client("http://old.example");
        using var site = Client("https://COINS.example");

        using var page = await old.GetAsync("/u/ayse.yilmaz?x=1");
        using var post = await old.PostAsync("/api/auth/logout", null);
        using var plain = await oldHttp.GetAsync("/s/abc");
        using var challenge = await oldHttp.GetAsync("/.well-known/acme-challenge/token");
        using var canonical = await site.GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.PermanentRedirect, page.StatusCode);
        Assert.Equal("https://coins.example/u/ayse.yilmaz?x=1", page.Headers.Location?.ToString());
        // 308 keeps the method
        Assert.Equal(HttpStatusCode.PermanentRedirect, post.StatusCode);
        Assert.Equal("https://coins.example/api/auth/logout", post.Headers.Location?.ToString());
        // From plain HTTP in one step, not through https://old.example first
        Assert.Equal("https://coins.example/s/abc", plain.Headers.Location?.ToString());
        // Certificate renewals of the other names stay on their own name
        Assert.Equal("https://old.example/.well-known/acme-challenge/token", challenge.Headers.Location?.ToString());
        // The host name is compared case-insensitively
        await canonical.ShouldHaveStatusAsync(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Startup_MigratesAnEmptyDatabase_OnlyWhenAskedTo()
    {
        var connectionString = factory.ConnectionStringWithDatabaseSuffix("_Migrate");
        try
        {
            // Off by default: a database without the schema stops the app (the admin sync needs it)
            await using (var plain = factory.WithSettings(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = connectionString,
            }))
            {
                Assert.ThrowsAny<Exception>(() => plain.CreateClient());
            }

            await using var host = factory.WithSettings(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = connectionString,
                ["Database:MigrateOnStartup"] = "true",
            });
            using var client = await CoinPortalFactory.CreateAnonymousClientAsync(host);
            using var health = await client.GetAsync("/api/health");

            await health.ShouldHaveStatusAsync(HttpStatusCode.OK);
            await using var scope = host.Services.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            Assert.Empty(await db.Database.GetPendingMigrationsAsync());
        }
        finally
        {
            await using var db = new AppDbContext(
                new DbContextOptionsBuilder<AppDbContext>().UseSqlServer(connectionString).Options);
            await db.Database.EnsureDeletedAsync();
        }
    }

    [Fact]
    public async Task Startup_WithAnInvalidCanonicalHost_Fails()
    {
        await using var host = factory.WithSettings(new Dictionary<string, string?>
        {
            ["CanonicalHost:Host"] = "https://coins.example/",
        });

        var error = Assert.ThrowsAny<Exception>(() => host.CreateClient());
        Assert.Contains("CanonicalHost:Host", error.ToString());
    }

    [Theory]
    [InlineData("/")]
    [InlineData("/" + HashedScript)]
    [InlineData("/api/countries")]
    public async Task TextResponses_AreCompressed(string path)
    {
        await using var host = HostWithClient();
        // A plain client: the test server's handler does not decompress, so the encoding shows
        using var client = host.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
        });
        using var request = new HttpRequestMessage(HttpMethod.Get, path);
        request.Headers.AcceptEncoding.ParseAdd("br, gzip");

        using var response = await client.SendAsync(request);

        await response.ShouldHaveStatusAsync(HttpStatusCode.OK);
        Assert.Equal("br", Assert.Single(response.Content.Headers.ContentEncoding));
    }

    [Fact]
    public async Task Startup_WithAnUnwritablePhotoFolder_Fails()
    {
        // A file where the folder should be: nothing can be created below it
        Directory.CreateDirectory(webRoot);
        var file = Path.Combine(webRoot, "not-a-folder");
        await File.WriteAllTextAsync(file, "x");
        await using var host = factory.WithSettings(new Dictionary<string, string?>
        {
            ["PhotoStorage:RootPath"] = Path.Combine(file, "photos"),
        });

        Assert.ThrowsAny<IOException>(() => host.CreateClient());
    }

    [Fact]
    public async Task Startup_WithAnInvalidLimit_Fails()
    {
        await using var host = factory.WithSettings(new Dictionary<string, string?>
        {
            ["RateLimiting:Public:WindowSeconds"] = "0",
        });

        var error = Assert.ThrowsAny<Exception>(() => host.CreateClient());
        Assert.Contains("RateLimiting", error.ToString());
    }

    private static string Single(HttpResponseMessage response, string header) =>
        Assert.Single(response.Headers.TryGetValues(header, out var values) ? values : []);

    [Fact]
    public async Task MissingFiles_Return404NotTheClient()
    {
        await using var host = HostWithClient();
        using var client = await CoinPortalFactory.CreateAnonymousClientAsync(host);

        // A chunk of an older build: the browser must see it is gone, not get index.html as script
        using var response = await client.GetAsync("/chunk-ZZ99ZZ99.js");

        await response.ShouldHaveStatusAsync(HttpStatusCode.NotFound);
        Assert.NotEqual(IndexHtml, await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task UnknownApiPaths_Return404NotTheClient()
    {
        await using var host = HostWithClient();
        using var client = await CoinPortalFactory.CreateAnonymousClientAsync(host);

        using var response = await client.GetAsync("/api/no-such-thing");

        await response.ShouldHaveStatusAsync(HttpStatusCode.NotFound);
        Assert.NotEqual(IndexHtml, await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task WithoutClientBuild_UnknownPathsAre404()
    {
        // The default test host has no wwwroot, like development
        using var client = await factory.CreateAnonymousClientAsync();

        using var page = await client.GetAsync("/collections/5");
        using var api = await client.GetAsync("/api/no-such-thing");

        await page.ShouldHaveStatusAsync(HttpStatusCode.NotFound);
        await api.ShouldHaveStatusAsync(HttpStatusCode.NotFound);
    }

    private WebApplicationFactory<Program> HostWithClient()
    {
        Directory.CreateDirectory(webRoot);
        File.WriteAllText(Path.Combine(webRoot, "index.html"), IndexHtml);
        File.WriteAllText(Path.Combine(webRoot, HashedScript), "console.log('test');");
        File.WriteAllText(Path.Combine(webRoot, "manifest.webmanifest"), """{ "name": "CoinVitrine" }""");
        return factory.WithSettings(new Dictionary<string, string?>(), webRoot);
    }

    private static string ReadShared(string path)
    {
        using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete);
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }

    public void Dispose()
    {
        if (!Directory.Exists(webRoot))
        {
            return;
        }
        try
        {
            Directory.Delete(webRoot, recursive: true);
        }
        catch (IOException)
        {
            // A log file still held open by the logger; the temp folder is left behind
        }
    }
}
