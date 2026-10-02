using System.Net;
using CoinPortal.Api.Tests.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;

namespace CoinPortal.Api.Tests;

/// <summary>
/// Rate limits and the Angular client's hosting (wwwroot, fallback to index.html, cache headers).
/// Each test runs its own host (fresh limiter state, settings of its own); see
/// <see cref="CoinPortalFactory.WithSettings"/> for why they are in the admin collection.
/// </summary>
[Collection(AdminCollection.Name)]
public sealed class HostingTests(CoinPortalFactory factory) : IDisposable
{
    private const string IndexHtml = "<!doctype html><title>Coin Portal test client</title>";
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
            ["RateLimiting:Public:PermitLimit"] = "2",
        });
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
        File.WriteAllText(Path.Combine(webRoot, "manifest.webmanifest"), """{ "name": "Coin Portal" }""");
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
