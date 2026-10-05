using System.Net;
using CoinPortal.Api.Contracts.Admin;
using CoinPortal.Api.Contracts.Common;
using CoinPortal.Api.Data;
using CoinPortal.Api.Tests.Infrastructure;

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
        using var put = await alice.Client.PutAsync(Url, new AdminSettingsRequest(5, null));
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
            using var changed = await admin.Client.PutAsync(Url, new AdminSettingsRequest(7, "More photos"));
            using var unchanged = await admin.Client.PutAsync(Url, new AdminSettingsRequest(7, "Same again"));

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

    [Theory]
    [InlineData(0)]
    [InlineData(101)]
    public async Task Update_RejectsValuesOutOfRange(int value)
    {
        var admin = await factory.SignUpAdminAsync();

        using var response = await admin.Client.PutAsync(Url, new AdminSettingsRequest(value, null));
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
            using (var raise = await admin.Client.PutAsync(Url, new AdminSettingsRequest(raised, null)))
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

    private static async Task RestoreAsync(TestUser admin)
    {
        using var response = await admin.Client.PutAsync(Url, new AdminSettingsRequest(CoinPortalFactory.MinPublicCoins, null));
        await response.ShouldHaveStatusAsync(HttpStatusCode.OK);
    }
}
