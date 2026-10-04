using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using CoinPortal.Api.Contracts.Auth;
using CoinPortal.Api.Contracts.Coins;
using CoinPortal.Api.Contracts.Collections;
using CoinPortal.Api.Tests.Infrastructure;

namespace CoinPortal.Api.Tests;

public class AuthTests(CoinPortalFactory factory)
{
    [Fact]
    public async Task Health_ReturnsOkAndVersion()
    {
        using var client = await factory.CreateAnonymousClientAsync();
        var health = await client.GetJsonAsync<Dictionary<string, object>>("/api/health");

        Assert.Equal("ok", health["status"].ToString());
        Assert.False(string.IsNullOrEmpty(health["version"].ToString()));
    }

    [Theory]
    [InlineData("en", "My collection")]
    [InlineData("tr", "Koleksiyonum")]
    [InlineData("de", "Meine Sammlung")]
    [InlineData("bg", "Моята колекция")]
    [InlineData(null, "My collection")]
    public async Task Register_SignsInWithFirstCollectionInTheLanguage(string? language, string collectionName)
    {
        var alice = await factory.SignUpAsync(language);

        Assert.Equal(language, alice.User.Language);
        var me = await alice.Client.GetJsonAsync<UserResponse>("/api/auth/me");
        Assert.Equal(alice.UserName, me.UserName);
        var collections = await alice.Client.GetJsonAsync<List<CollectionResponse>>("/api/collections");
        Assert.Equal(collectionName, Assert.Single(collections).Name);
    }

    [Fact]
    public async Task Register_WithoutAcceptingThePrivacyPolicy_IsRejected()
    {
        using var client = await factory.CreateAnonymousClientAsync();
        var request = TestUser.NewRegisterRequest() with { AcceptTerms = false };

        using var response = await client.PostAsync("/api/auth/register", request);
        // Older clients that do not send the field at all
        using var missing = await client.SendRawJsonAsync(HttpMethod.Post, "/api/auth/register",
            JsonSerializer.Serialize(TestUser.NewRegisterRequest(), ApiClient.Json).Replace(",\"acceptTerms\":true", ""));

        Assert.Contains("AcceptTerms", await response.ReadValidationKeysAsync(), StringComparer.OrdinalIgnoreCase);
        Assert.Contains("AcceptTerms", await missing.ReadValidationKeysAsync(), StringComparer.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Register_UnderEighteen_IsRejected()
    {
        using var client = await factory.CreateAnonymousClientAsync();
        var request = TestUser.NewRegisterRequest() with
        {
            BirthDate = DateOnly.FromDateTime(DateTime.UtcNow).AddYears(-18).AddDays(1),
        };

        using var response = await client.PostAsync("/api/auth/register", request);

        Assert.Contains("BirthDate", await response.ReadValidationKeysAsync(), StringComparer.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Register_TakenEmailOrUserName_IsRejectedIgnoringCase()
    {
        var alice = await factory.SignUpAsync();
        using var client = await factory.CreateAnonymousClientAsync();

        var sameEmail = TestUser.NewRegisterRequest() with { Email = alice.User.Email.ToUpperInvariant() };
        using var emailResponse = await client.PostAsync("/api/auth/register", sameEmail);
        Assert.Contains("DuplicateEmail", await emailResponse.ReadValidationKeysAsync());

        var sameName = TestUser.NewRegisterRequest() with { UserName = alice.UserName.ToUpperInvariant() };
        using var nameResponse = await client.PostAsync("/api/auth/register", sameName);
        Assert.Contains("DuplicateUserName", await nameResponse.ReadValidationKeysAsync());
    }

    [Theory]
    [InlineData("ab")]
    [InlineData("name@with-at")]
    [InlineData("abcdefghijklmnopqrstu")] // 21 characters
    public async Task Register_InvalidUserName_IsRejected(string userName)
    {
        using var client = await factory.CreateAnonymousClientAsync();
        var request = TestUser.NewRegisterRequest() with { UserName = userName };

        using var response = await client.PostAsync("/api/auth/register", request);

        Assert.Contains("UserName", await response.ReadValidationKeysAsync(), StringComparer.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Register_SignInIsPersistent()
    {
        using var client = await factory.CreateAnonymousClientAsync();

        using var response = await client.PostAsync("/api/auth/register", TestUser.NewRegisterRequest());

        await response.ShouldHaveStatusAsync(HttpStatusCode.OK);
        Assert.True(AuthCookieExpires(response));
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Login_RememberMe_DecidesWhetherTheCookieOutlivesTheBrowser(bool rememberMe)
    {
        var alice = await factory.SignUpAsync();
        using var client = await factory.CreateAnonymousClientAsync();

        using var response = await client.PostAsync("/api/auth/login",
            new LoginRequest(alice.UserName, TestUser.Password, rememberMe));

        await response.ShouldHaveStatusAsync(HttpStatusCode.OK);
        Assert.Equal(rememberMe, AuthCookieExpires(response));
    }

    // A persistent cookie carries an expiry date; a session cookie ends with the browser
    private static bool AuthCookieExpires(HttpResponseMessage response) =>
        response.Headers.GetValues("Set-Cookie")
            .Single(c => c.StartsWith("coinportal.auth="))
            .Contains("expires=", StringComparison.OrdinalIgnoreCase);

    [Fact]
    public async Task Login_WorksWithUserNameOrEmail()
    {
        var alice = await factory.SignUpAsync();
        using var client = await factory.CreateAnonymousClientAsync();

        using (var byName = await client.LoginAsync(alice.UserName, TestUser.Password))
        {
            Assert.Equal(alice.User.Id, (await byName.ReadJsonAsync<UserResponse>()).Id);
        }
        await client.LogoutAsync();
        using (var byEmail = await client.LoginAsync(alice.User.Email, TestUser.Password))
        {
            Assert.Equal(alice.User.Id, (await byEmail.ReadJsonAsync<UserResponse>()).Id);
        }
    }

    [Fact]
    public async Task Login_WrongPasswordAndUnknownUser_LookTheSame()
    {
        var alice = await factory.SignUpAsync();
        using var client = await factory.CreateAnonymousClientAsync();

        using var wrongPassword = await client.LoginAsync(alice.UserName, "Wrongpass123");
        using var unknownUser = await client.LoginAsync("nobody" + Guid.NewGuid().ToString("N")[..8], "Wrongpass123");

        // Same status and message: sign-in does not reveal which user names exist
        await wrongPassword.ShouldHaveStatusAsync(HttpStatusCode.Unauthorized);
        await unknownUser.ShouldHaveStatusAsync(HttpStatusCode.Unauthorized);
        Assert.Equal(await TitleAsync(wrongPassword), await TitleAsync(unknownUser));
    }

    [Fact]
    public async Task Login_FiveFailures_LockTheAccount()
    {
        var alice = await factory.SignUpAsync();
        using var client = await factory.CreateAnonymousClientAsync();

        for (var i = 0; i < 5; i++)
        {
            // The attempt that starts the lockout looks like any failure
            using var failed = await client.LoginAsync(alice.UserName, "Wrongpass123");
            await failed.ShouldHaveStatusAsync(HttpStatusCode.Unauthorized);
        }
        using var response = await client.LoginAsync(alice.UserName, TestUser.Password);

        // No code: "account_locked" would make the client say an administrator locked it
        Assert.Null(await response.ReadProblemCodeAsync(HttpStatusCode.Locked));
    }

    [Fact]
    public async Task Login_LockedAccount_WrongPassword_LooksLikeUnknownUser()
    {
        var alice = await factory.SignUpAsync();
        using var client = await factory.CreateAnonymousClientAsync();
        for (var i = 0; i < 5; i++)
        {
            using var failed = await client.LoginAsync(alice.UserName, "Wrongpass123");
        }

        // Without the password nobody learns that the account exists or is locked
        using var wrongPassword = await client.LoginAsync(alice.UserName, "Wrongpass123");
        using var unknownUser = await client.LoginAsync("nobody" + Guid.NewGuid().ToString("N")[..8], "Wrongpass123");

        await wrongPassword.ShouldHaveStatusAsync(HttpStatusCode.Unauthorized);
        Assert.Equal(await TitleAsync(unknownUser), await TitleAsync(wrongPassword));
        // Failures during the lockout do not count: the correct password still reports the lock
        using var correct = await client.LoginAsync(alice.UserName, TestUser.Password);
        await correct.ShouldHaveStatusAsync(HttpStatusCode.Locked);
    }

    [Fact]
    public async Task Me_SignedOut_Is401()
    {
        using var client = await factory.CreateAnonymousClientAsync();

        using var response = await client.GetAsync("/api/auth/me");

        await response.ShouldHaveStatusAsync(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Logout_EndsTheSession()
    {
        var alice = await factory.SignUpAsync();

        await alice.Client.LogoutAsync();

        using var response = await alice.Client.GetAsync("/api/auth/me");
        await response.ShouldHaveStatusAsync(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task UnsafeRequest_WithoutAntiforgeryToken_IsRejected()
    {
        var alice = await factory.SignUpAsync();

        using var response = await alice.Client.SendAsync(HttpMethod.Post, "/api/collections",
            JsonContent.Create(new CollectionUpsertRequest { Name = "No token" }),
            withAntiforgeryToken: false);

        await response.ShouldHaveStatusAsync(HttpStatusCode.BadRequest);
    }

    // Not only JSON posts: every unsafe method and body type needs the token
    [Theory]
    [InlineData("uploadPhoto")]
    [InlineData("deleteCoin")]
    [InlineData("updateCollection")]
    [InlineData("deleteCover")]
    public async Task UnsafeRequests_OfEveryKind_WithoutAntiforgeryToken_AreRejected(string kind)
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.FirstCollectionAsync();
        var coin = await alice.CreateCoinAsync(collection.Id);
        await alice.UploadCoverAsync(collection.Id);
        var photo = new ByteArrayContent(TestImages.Png(200, 160));
        photo.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        var (method, url, content) = kind switch
        {
            "uploadPhoto" => (HttpMethod.Put, $"/api/coins/{coin.Id}/photos/National",
                (HttpContent?)new MultipartFormDataContent { { photo, "file", "photo.png" } }),
            "deleteCoin" => (HttpMethod.Delete, $"/api/coins/{coin.Id}", null),
            "updateCollection" => (HttpMethod.Put, $"/api/collections/{collection.Id}",
                JsonContent.Create(new CollectionUpsertRequest { Name = "Renamed" })),
            _ => (HttpMethod.Delete, $"/api/collections/{collection.Id}/cover", null),
        };

        using var response = await alice.Client.SendAsync(method, url, content, withAntiforgeryToken: false);

        await response.ShouldHaveStatusAsync(HttpStatusCode.BadRequest);
        // Nothing happened
        var after = await alice.Client.GetJsonAsync<CoinResponse>($"/api/coins/{coin.Id}");
        Assert.Empty(after.Photos);
        var collectionAfter = await alice.Client.GetJsonAsync<CollectionResponse>($"/api/collections/{collection.Id}");
        Assert.Equal(collection.Name, collectionAfter.Name);
        Assert.NotNull(collectionAfter.CoverImageId);
    }

    [Fact]
    public async Task Cookies_CarryTheirSecurityFlags()
    {
        var alice = await factory.SignUpAsync();
        using var http = CoinPortalFactory.CreateHttpClient(factory);

        // The first token request sets both antiforgery cookies
        using var antiforgery = await http.GetAsync("/api/auth/antiforgery");
        var client = new ApiClient(http);
        await client.RefreshAntiforgeryAsync();
        using var login = await client.LoginAsync(alice.UserName, TestUser.Password);

        await login.ShouldHaveStatusAsync(HttpStatusCode.OK);
        // Session and antiforgery cookie: out of reach of scripts; the token cookie is read by the
        // client on purpose. All of them only over HTTPS.
        Assert.Equal(["httponly", "samesite=lax", "secure"], Flags(login, "coinportal.auth"));
        Assert.Equal(["httponly", "samesite=strict", "secure"], Flags(antiforgery, "coinportal.af"));
        Assert.Equal(["samesite=strict", "secure"], Flags(antiforgery, "XSRF-TOKEN"));
    }

    // The security attributes of one Set-Cookie header (not its value, path or expiry)
    private static string[] Flags(HttpResponseMessage response, string cookie) =>
        response.Headers.GetValues("Set-Cookie").Single(c => c.StartsWith(cookie + "="))
            .Split(';').Skip(1)
            .Select(a => a.Trim().ToLowerInvariant())
            .Where(a => a is "httponly" or "secure" || a.StartsWith("samesite="))
            .Order().ToArray();

    [Theory]
    [InlineData("Weakpassword", "PasswordRequiresDigit")]
    [InlineData("short1A", "Password")]
    [InlineData(null, "Password")]
    public async Task Register_PasswordOutsideTheRules_IsRejected(string? password, string expectedKey)
    {
        using var client = await factory.CreateAnonymousClientAsync();
        // null: one character over the limit of 100
        var request = TestUser.NewRegisterRequest() with { Password = password ?? "Aa1" + new string('x', 98) };

        using var response = await client.PostAsync("/api/auth/register", request);

        Assert.Contains(expectedKey, await response.ReadValidationKeysAsync());
    }

    [Fact]
    public async Task Register_UnknownLanguage_IsRejected()
    {
        using var client = await factory.CreateAnonymousClientAsync();

        using var response = await client.PostAsync("/api/auth/register", TestUser.NewRegisterRequest("xx"));

        Assert.Contains("Language", await response.ReadValidationKeysAsync());
    }

    // Days from today (UTC) of the 18th birthday; 18 years old exactly today is enough
    [Theory]
    [InlineData(0, true)]
    [InlineData(1, false)]
    public async Task Register_AgeLimit_CountsFromTheUtcDate(int daysUntilEighteenth, bool accepted)
    {
        using var client = await factory.CreateAnonymousClientAsync();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var request = TestUser.NewRegisterRequest() with
        {
            BirthDate = today.AddDays(daysUntilEighteenth).AddYears(-18),
        };

        using var response = await client.PostAsync("/api/auth/register", request);

        if (accepted)
        {
            await response.ShouldHaveStatusAsync(HttpStatusCode.OK);
        }
        else
        {
            Assert.Equal(["BirthDate"], await response.ReadValidationKeysAsync());
        }
    }

    [Theory]
    [InlineData(1)]
    [InlineData(-121 * 366)]
    public async Task Register_FutureOrImplausibleBirthDate_IsRejected(int daysFromToday)
    {
        using var client = await factory.CreateAnonymousClientAsync();
        var request = TestUser.NewRegisterRequest() with
        {
            BirthDate = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(daysFromToday),
        };

        using var response = await client.PostAsync("/api/auth/register", request);

        Assert.Equal(["BirthDate"], await response.ReadValidationKeysAsync());
    }

    [Fact]
    public async Task AntiforgeryToken_IsBoundToTheUser()
    {
        var alice = await factory.SignUpAsync();
        using var client = await factory.CreateAnonymousClientAsync();

        // Signs in without renewing the token issued while signed out
        using (var login = await client.PostAsync("/api/auth/login", new LoginRequest(alice.UserName, TestUser.Password)))
        {
            await login.ShouldHaveStatusAsync(HttpStatusCode.OK);
        }
        using var response = await client.PostAsync("/api/collections", new CollectionUpsertRequest { Name = "Stale token" });

        await response.ShouldHaveStatusAsync(HttpStatusCode.BadRequest);
    }

    private static async Task<string?> TitleAsync(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.GetProperty("title").GetString();
}
