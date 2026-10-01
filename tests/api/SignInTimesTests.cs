using System.Net;
using System.Text.Json;
using CoinPortal.Api.Contracts.Auth;
using CoinPortal.Api.Data;
using CoinPortal.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace CoinPortal.Api.Tests;

/// <summary>Last sign-in, the one before it (shown in the profile) and last seen (for the panel).</summary>
public class SignInTimesTests(CoinPortalFactory factory)
{
    [Fact]
    public async Task Register_IsTheFirstSignIn()
    {
        var alice = await factory.SignUpAsync();

        var stored = await StoredAsync(alice);

        Assert.Null(alice.User.PreviousSignInAtUtc);
        Assert.Null(stored.PreviousSignInAtUtc);
        AssertRecent(stored.LastSignInAtUtc);
        AssertRecent(stored.LastSeenAtUtc);
    }

    [Fact]
    public async Task SignIn_MakesTheLastSignInThePreviousOne()
    {
        var alice = await factory.SignUpAsync();
        var first = (await StoredAsync(alice)).LastSignInAtUtc;

        alice = await alice.SignInAgainAsync();
        var stored = await StoredAsync(alice);
        var me = await alice.Client.GetJsonAsync<UserResponse>("/api/auth/me");

        Assert.NotNull(first);
        Assert.Equal(first, stored.PreviousSignInAtUtc);
        Assert.True(stored.LastSignInAtUtc > first);
        Assert.Equal(first, alice.User.PreviousSignInAtUtc);
        Assert.Equal(first, me.PreviousSignInAtUtc);
    }

    [Fact]
    public async Task FailedSignIn_ChangesNothing()
    {
        var alice = await factory.SignUpAsync();
        var before = await StoredAsync(alice);
        using var client = await factory.CreateAnonymousClientAsync();

        using var response = await client.LoginAsync(alice.UserName, "Wrongpass123");
        var after = await StoredAsync(alice);

        await response.ShouldHaveStatusAsync(HttpStatusCode.Unauthorized);
        Assert.Equal(
            (before.LastSignInAtUtc, before.PreviousSignInAtUtc, before.LastSeenAtUtc),
            (after.LastSignInAtUtc, after.PreviousSignInAtUtc, after.LastSeenAtUtc));
    }

    [Fact]
    public async Task Me_UpdatesLastSeenAtMostHourly()
    {
        var alice = await factory.SignUpAsync();

        var recently = DateTime.UtcNow.AddMinutes(-10);
        await SetLastSeenAsync(alice, recently);
        using (await alice.Client.GetAsync("/api/auth/me")) { }
        var unchanged = (await StoredAsync(alice)).LastSeenAtUtc;

        await SetLastSeenAsync(alice, DateTime.UtcNow.AddHours(-2));
        using (await alice.Client.GetAsync("/api/auth/me")) { }
        var updated = (await StoredAsync(alice)).LastSeenAtUtc;

        Assert.Equal(recently, unchanged!.Value, TimeSpan.FromMilliseconds(1));
        AssertRecent(updated);
    }

    [Fact]
    public async Task PreviousSignIn_IsUtcOnTheWire()
    {
        var alice = await factory.SignUpAsync();
        alice = await alice.SignInAgainAsync();

        using var response = await alice.Client.GetAsync("/api/auth/me");
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());

        Assert.EndsWith("Z", json.RootElement.GetProperty("previousSignInAtUtc").GetString());
    }

    private Task<ApplicationUser> StoredAsync(TestUser user) =>
        factory.WithDbAsync(db => db.Users.AsNoTracking().SingleAsync(u => u.Id == user.User.Id));

    private Task<int> SetLastSeenAsync(TestUser user, DateTime value) =>
        factory.WithDbAsync(db => db.Users.Where(u => u.Id == user.User.Id)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.LastSeenAtUtc, value)));

    private static void AssertRecent(DateTime? value)
    {
        Assert.NotNull(value);
        Assert.Equal(DateTimeKind.Utc, value.Value.Kind);
        Assert.Equal(DateTime.UtcNow, value.Value, TimeSpan.FromMinutes(1));
    }
}
