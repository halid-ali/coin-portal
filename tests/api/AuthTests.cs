using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using CoinPortal.Api.Contracts.Auth;
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

        await response.ShouldHaveStatusAsync(HttpStatusCode.Locked);
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
