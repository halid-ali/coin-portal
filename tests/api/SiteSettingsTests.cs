using System.Net;
using CoinPortal.Api.Contracts.Admin;
using CoinPortal.Api.Contracts.Auth;
using CoinPortal.Api.Contracts.Common;
using CoinPortal.Api.Data;
using CoinPortal.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace CoinPortal.Api.Tests;

/// <summary>
/// The admin's site settings and what a changed minimum does to Public collections. These tests
/// change the minimum, so they run alone and put it back.
/// </summary>
[Collection(SiteSettingsCollection.Name)]
public class SiteSettingsTests(CoinPortalFactory factory)
{
    private const string Url = "/api/admin/settings";

    [Fact]
    public async Task Settings_AreForAdminsOnly()
    {
        var alice = await factory.SignUpAsync();
        using var visitor = await factory.CreateAnonymousClientAsync();

        await alice.Client.ExpectStatusAsync(Url, HttpStatusCode.Forbidden);
        await visitor.ExpectStatusAsync(Url, HttpStatusCode.Unauthorized);
        await alice.Client.ExpectStatusAsync($"{Url}/impact?minPublicCoins=5", HttpStatusCode.Forbidden);
        using var put = await alice.Client.PutAsync(Url, Settings(5));
        await put.ShouldHaveStatusAsync(HttpStatusCode.Forbidden);
        Assert.Equal(CoinPortalFactory.MinPublicCoins,
            (await alice.FirstCollectionAsync()).MinPublicCoins);
    }

    [Fact]
    public async Task Update_ChangesTheMinimum_AndWritesTheAuditLog()
    {
        var admin = await factory.SignUpAdminAsync();
        try
        {
            using var changed = await admin.Client.PutAsync(Url, Settings(7, note: "More photos"));
            using var unchanged = await admin.Client.PutAsync(Url, Settings(7, note: "Same again"));

            Assert.Equal(7, (await changed.ReadJsonAsync<AdminSettingsResponse>()).MinPublicCoins);
            await unchanged.ShouldHaveStatusAsync(HttpStatusCode.OK);
            Assert.Equal(7, (await admin.Client.GetJsonAsync<AdminSettingsResponse>(Url)).MinPublicCoins);
            Assert.Equal(7, (await admin.FirstCollectionAsync()).MinPublicCoins);

            // Only a real change is recorded
            var entry = Assert.Single((await admin.Client.GetJsonAsync<PagedResponse<AdminAuditEntryResponse>>(
                    $"/api/admin/audit?action={AuditAction.SettingChanged}")).Items,
                e => e.ActorId == admin.User.Id);
            Assert.Equal((SiteSettings.MinPublicCoinsName, "2", "7", "More photos"),
                (entry.Setting, entry.OldValue, entry.NewValue, entry.Note));
        }
        finally
        {
            await RestoreAsync(admin);
        }
    }

    [Fact]
    public async Task Update_ChangesTheUnverifiedLimit_ForUnverifiedAccountsOnly()
    {
        var admin = await factory.SignUpAdminAsync();
        var alice = await factory.SignUpAsync(confirmEmail: false);
        try
        {
            using var changed = await admin.Client.PutAsync(Url,
                Settings(CoinPortalFactory.MinPublicCoins, unverifiedMaxCoins: 0, note: "Verify first"));

            Assert.Equal(0, (await changed.ReadJsonAsync<AdminSettingsResponse>()).UnverifiedMaxCoins);
            Assert.Equal(0, (await alice.Client.GetJsonAsync<UserResponse>("/api/auth/me")).UnverifiedMaxCoins);
            Assert.Null((await admin.Client.GetJsonAsync<UserResponse>("/api/auth/me")).UnverifiedMaxCoins);
            using var coin = await alice.Client.PostAsync("/api/coins",
                TestUser.NewCoin((await alice.FirstCollectionAsync()).Id));
            Assert.Equal("unverified_coin_limit", await coin.ReadProblemCodeAsync(HttpStatusCode.Forbidden));

            // One entry for the one setting that changed
            var entry = Assert.Single((await admin.Client.GetJsonAsync<PagedResponse<AdminAuditEntryResponse>>(
                    $"/api/admin/audit?action={AuditAction.SettingChanged}")).Items,
                e => e.ActorId == admin.User.Id);
            Assert.Equal((SiteSettings.UnverifiedMaxCoinsName, "3", "0", "Verify first"),
                (entry.Setting, entry.OldValue, entry.NewValue, entry.Note));
        }
        finally
        {
            await RestoreAsync(admin);
        }
    }

    [Fact]
    public async Task Lifetime_TurnedOnAgain_CountsFromThen()
    {
        var admin = await factory.SignUpAdminAsync();
        var originalSince = await LifetimeSinceAsync();
        try
        {
            using (var off = await admin.Client.PutAsync(Url,
                Settings(CoinPortalFactory.MinPublicCoins, unverifiedLifetimeDays: 0, note: "Pause")))
            {
                Assert.Equal(0, (await off.ReadJsonAsync<AdminSettingsResponse>()).UnverifiedLifetimeDays);
            }
            Assert.Equal(originalSince, await LifetimeSinceAsync());
            var before = DateTime.UtcNow;
            using (var on = await admin.Client.PutAsync(Url,
                Settings(CoinPortalFactory.MinPublicCoins, unverifiedLifetimeDays: 14)))
            {
                await on.ShouldHaveStatusAsync(HttpStatusCode.OK);
            }

            // Accounts that signed up while it was off count from now
            Assert.InRange(await LifetimeSinceAsync(), before.AddSeconds(-1), DateTime.UtcNow);
            var entries = (await admin.Client.GetJsonAsync<PagedResponse<AdminAuditEntryResponse>>(
                    $"/api/admin/audit?action={AuditAction.SettingChanged}")).Items
                .Where(e => e.ActorId == admin.User.Id)
                .Select(e => (e.Setting, e.OldValue, e.NewValue, e.Note))
                .ToList();
            Assert.Equal([
                (SiteSettings.UnverifiedLifetimeDaysName, "0", "14", null),
                (SiteSettings.UnverifiedLifetimeDaysName, "30", "0", "Pause"),
            ], entries);
        }
        finally
        {
            await RestoreAsync(admin);
            await factory.WithDbAsync(db => db.SiteSettings.ExecuteUpdateAsync(s =>
                s.SetProperty(x => x.UnverifiedLifetimeSinceUtc, originalSince)));
        }
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(366)]
    public async Task Update_RejectsLifetimesOutOfRange(int value)
    {
        var admin = await factory.SignUpAdminAsync();

        using var response = await admin.Client.PutAsync(Url,
            Settings(CoinPortalFactory.MinPublicCoins, unverifiedLifetimeDays: value));

        Assert.Equal(["UnverifiedLifetimeDays"], await response.ReadValidationKeysAsync());
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(10_001)]
    public async Task Update_RejectsUnverifiedLimitsOutOfRange(int value)
    {
        var admin = await factory.SignUpAdminAsync();

        using var response = await admin.Client.PutAsync(Url,
            Settings(CoinPortalFactory.MinPublicCoins, unverifiedMaxCoins: value));

        Assert.Equal(["UnverifiedMaxCoins"], await response.ReadValidationKeysAsync());
        Assert.Equal(CoinPortalFactory.UnverifiedMaxCoins,
            (await admin.Client.GetJsonAsync<AdminSettingsResponse>(Url)).UnverifiedMaxCoins);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(101)]
    public async Task Update_RejectsValuesOutOfRange(int value)
    {
        var admin = await factory.SignUpAdminAsync();

        using var response = await admin.Client.PutAsync(Url, Settings(value));
        using var impact = await admin.Client.GetAsync($"{Url}/impact?minPublicCoins={value}");

        Assert.Contains("MinPublicCoins", await response.ReadValidationKeysAsync());
        await impact.ShouldHaveStatusAsync(HttpStatusCode.BadRequest);
        Assert.Equal(CoinPortalFactory.MinPublicCoins,
            (await admin.Client.GetJsonAsync<AdminSettingsResponse>(Url)).MinPublicCoins);
    }

    [Fact]
    public async Task RaisedMinimum_KeepsPublicCollections_UntilAChangeLowersTheCount()
    {
        var admin = await factory.SignUpAdminAsync();
        var alice = await factory.SignUpAsync();
        const int raised = CoinPortalFactory.MinPublicCoins + 2;
        var belowBefore = await ImpactAsync(admin, raised);
        var collection = await alice.CreatePublicCollectionAsync();
        using var visitor = await factory.CreateAnonymousClientAsync();
        try
        {
            Assert.Equal(belowBefore + 1, await ImpactAsync(admin, raised));
            using (var raise = await admin.Client.PutAsync(Url, Settings(raised)))
            {
                await raise.ShouldHaveStatusAsync(HttpStatusCode.OK);
            }

            // Still public, and adding photographed coins keeps it so, although it is below
            await visitor.ExpectStatusAsync($"/api/public/collections/{collection.Id}", HttpStatusCode.OK);
            var added = await alice.CreatePhotographedCoinAsync(collection.Id);
            // Fewer photographed coins than the new minimum: that change needs a confirmation
            using (var delete = await alice.Client.DeleteAsync($"/api/coins/{added.Id}"))
            {
                Assert.Equal("would_unpublish", await delete.ReadProblemCodeAsync(HttpStatusCode.Conflict));
            }
            // Made Public again only with the new minimum
            var unlisted = await alice.SetVisibilityAsync(collection, CollectionVisibility.Unlisted);
            using (var republish = await alice.Client.PutAsync($"/api/collections/{collection.Id}",
                       new Contracts.Collections.CollectionUpsertRequest
                       {
                           Name = unlisted.Name,
                           Visibility = CollectionVisibility.Public,
                       }))
            {
                Assert.Equal("public_requirements", await republish.ReadProblemCodeAsync());
            }
        }
        finally
        {
            await RestoreAsync(admin);
        }
    }

    private static async Task<int> ImpactAsync(TestUser admin, int minPublicCoins) =>
        (await admin.Client.GetJsonAsync<AdminSettingsImpactResponse>($"{Url}/impact?minPublicCoins={minPublicCoins}"))
        .PublicCollectionsBelow;

    private Task<DateTime> LifetimeSinceAsync() =>
        factory.WithDbAsync(db => db.SiteSettings.Select(s => s.UnverifiedLifetimeSinceUtc).SingleAsync());

    private static AdminSettingsRequest Settings(int minPublicCoins,
        int unverifiedMaxCoins = CoinPortalFactory.UnverifiedMaxCoins,
        int unverifiedLifetimeDays = CoinPortalFactory.UnverifiedLifetimeDays, string? note = null) =>
        new(minPublicCoins, unverifiedMaxCoins, unverifiedLifetimeDays, note);

    private static async Task RestoreAsync(TestUser admin)
    {
        using var response = await admin.Client.PutAsync(Url, Settings(CoinPortalFactory.MinPublicCoins));
        await response.ShouldHaveStatusAsync(HttpStatusCode.OK);
    }
}
