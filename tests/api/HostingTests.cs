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

    [Theory]
    [InlineData("/")]
    [InlineData("/collections/5")]
    [InlineData("/s/AbCdEf0123456789")]
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
        return factory.WithSettings(new Dictionary<string, string?>(), webRoot);
    }

    public void Dispose()
    {
        if (Directory.Exists(webRoot))
        {
            Directory.Delete(webRoot, recursive: true);
        }
    }
}
