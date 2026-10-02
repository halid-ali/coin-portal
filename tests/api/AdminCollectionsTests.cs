using System.Net;
using CoinPortal.Api.Contracts.Admin;
using CoinPortal.Api.Contracts.Collections;
using CoinPortal.Api.Contracts.Common;
using CoinPortal.Api.Data;
using CoinPortal.Api.Tests.Infrastructure;

namespace CoinPortal.Api.Tests;

[Collection(AdminCollection.Name)]
public class AdminCollectionsTests(CoinPortalFactory factory)
{
    [Fact]
    public async Task List_ShowsSharedCollections_NeverPrivateOnes()
    {
        var admin = await factory.SignUpAdminAsync();
        var alice = await factory.SignUpAsync();
        var hidden = await alice.FirstCollectionAsync(); // private
        var shown = await alice.CreateCollectionAsync(visibility: CollectionVisibility.Public);
        var linked = await alice.CreateCollectionAsync(visibility: CollectionVisibility.Unlisted);

        var list = await ListAsync(admin, $"search={alice.UserName}");
        var onlyUnlisted = await ListAsync(admin, $"search={alice.UserName}&visibility=Unlisted");

        Assert.Equal([linked.Id, shown.Id], list.Items.Select(c => c.Id).Order().Reverse());
        Assert.DoesNotContain(list.Items, c => c.Id == hidden.Id);
        Assert.Equal(linked.ShareToken, Assert.Single(onlyUnlisted.Items).ShareToken);
        Assert.All(list.Items, c => Assert.Equal(alice.UserName, c.OwnerUserName));
        using var privateOne = await admin.Client.PutAsync($"/api/admin/collections/{hidden.Id}/lock", new AdminLockRequest(null));
        await privateOne.ShouldHaveStatusAsync(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Hide_MakesItPrivate_AndTheOwnerCannotShareItUntilUnlocked()
    {
        var admin = await factory.SignUpAdminAsync();
        var alice = await factory.SignUpAsync();
        var collection = await alice.SetVisibilityAsync(await alice.FirstCollectionAsync(), CollectionVisibility.Public);
        using var visitor = await factory.CreateAnonymousClientAsync();

        using (var hide = await admin.Client.PutAsync($"/api/admin/collections/{collection.Id}/lock", new AdminLockRequest(null)))
        {
            await hide.ShouldHaveStatusAsync(HttpStatusCode.NoContent);
        }
        var owned = await alice.Client.GetJsonAsync<CollectionResponse>($"/api/collections/{collection.Id}");
        using var publicView = await visitor.GetAsync($"/api/public/collections/{collection.Id}");
        using var share = await alice.Client.PutAsync($"/api/collections/{collection.Id}",
            new CollectionUpsertRequest { Name = collection.Name, Visibility = CollectionVisibility.Public });
        using var rename = await alice.Client.PutAsync($"/api/collections/{collection.Id}",
            new CollectionUpsertRequest { Name = "Renamed", Visibility = CollectionVisibility.Private });
        var locked = await ListAsync(admin, $"search={alice.UserName}&locked=true");

        Assert.Equal((CollectionVisibility.Private, true), (owned.Visibility, owned.ModerationLocked));
        await publicView.ShouldHaveStatusAsync(HttpStatusCode.NotFound);
        Assert.Equal("moderation_locked", await share.ReadProblemCodeAsync(HttpStatusCode.Forbidden));
        Assert.Equal("Renamed", (await rename.ReadJsonAsync<CollectionResponse>()).Name);
        Assert.NotNull(Assert.Single(locked.Items).ModerationLockedAtUtc);

        using (var unlock = await admin.Client.DeleteAsync($"/api/admin/collections/{collection.Id}/lock"))
        {
            await unlock.ShouldHaveStatusAsync(HttpStatusCode.NoContent);
        }
        var stillPrivate = await alice.Client.GetJsonAsync<CollectionResponse>($"/api/collections/{collection.Id}");
        var sharedAgain = await alice.SetVisibilityAsync(stillPrivate, CollectionVisibility.Public);

        Assert.Equal((CollectionVisibility.Private, false), (stillPrivate.Visibility, stillPrivate.ModerationLocked));
        Assert.Equal(CollectionVisibility.Public, sharedAgain.Visibility);
    }

    [Fact]
    public async Task Hide_KeepsTheCoinsInTheCollection_UntilUnlocked()
    {
        var admin = await factory.SignUpAdminAsync();
        var alice = await factory.SignUpAsync();
        var hidden = await alice.SetVisibilityAsync(await alice.FirstCollectionAsync(), CollectionVisibility.Public);
        var coin = await alice.CreateCoinAsync(hidden.Id);
        var other = await alice.CreateCollectionAsync(visibility: CollectionVisibility.Public);
        using (var hide = await admin.Client.PutAsync($"/api/admin/collections/{hidden.Id}/lock", new AdminLockRequest(null)))
        {
            await hide.ShouldHaveStatusAsync(HttpStatusCode.NoContent);
        }

        // Moving the coins out would publish the hidden content again
        using var move = await alice.Client.PutAsync($"/api/coins/{coin.Id}", TestUser.NewCoin(other.Id, "Moved"));
        using var deleteAndMove = await alice.Client.DeleteAsync($"/api/collections/{hidden.Id}?moveTo={other.Id}");
        // Editing it in place is fine
        using var edit = await alice.Client.PutAsync($"/api/coins/{coin.Id}", TestUser.NewCoin(hidden.Id, "Edited"));

        Assert.Equal("moderation_locked", await move.ReadProblemCodeAsync(HttpStatusCode.Forbidden));
        Assert.Equal("moderation_locked", await deleteAndMove.ReadProblemCodeAsync(HttpStatusCode.Forbidden));
        Assert.Equal((hidden.Id, "Edited"),
            (await edit.ReadJsonAsync<Contracts.Coins.CoinResponse>() is var c ? (c.CollectionId, c.Title) : default));

        // Deleting it with its coins takes the content away: allowed
        using var deleteAll = await alice.Client.DeleteAsync($"/api/collections/{hidden.Id}");
        await deleteAll.ShouldHaveStatusAsync(HttpStatusCode.NoContent);
        using var gone = await alice.Client.GetAsync($"/api/coins/{coin.Id}");
        await gone.ShouldHaveStatusAsync(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task AdminsCollections_AreMarked_AndCanBeHiddenToo()
    {
        // Content moderation applies to everyone; only account locks spare admins
        var admin = await factory.SignUpAdminAsync();
        var otherAdmin = await factory.SignUpAdminAsync();
        var alice = await factory.SignUpAsync();
        var adminsCollection = await otherAdmin.CreateCollectionAsync(visibility: CollectionVisibility.Public);
        var alicesCollection = await alice.CreateCollectionAsync(visibility: CollectionVisibility.Public);

        var ofAdmin = Assert.Single((await ListAsync(admin, $"search={otherAdmin.UserName}")).Items);
        var ofAlice = Assert.Single((await ListAsync(admin, $"search={alice.UserName}")).Items);
        using var hide = await admin.Client.PutAsync($"/api/admin/collections/{adminsCollection.Id}/lock",
            new AdminLockRequest(null));

        Assert.Equal((adminsCollection.Id, true), (ofAdmin.Id, ofAdmin.OwnerIsAdmin));
        Assert.Equal((alicesCollection.Id, false), (ofAlice.Id, ofAlice.OwnerIsAdmin));
        await hide.ShouldHaveStatusAsync(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task Hide_EndsTheShareLink()
    {
        var admin = await factory.SignUpAdminAsync();
        var alice = await factory.SignUpAsync();
        var linked = await alice.CreateCollectionAsync(visibility: CollectionVisibility.Unlisted);
        using var visitor = await factory.CreateAnonymousClientAsync();

        using (await admin.Client.PutAsync($"/api/admin/collections/{linked.Id}/lock", new AdminLockRequest(null))) { }
        using var oldLink = await visitor.GetAsync($"/api/public/shared/{linked.ShareToken}");
        var owned = await alice.Client.GetJsonAsync<CollectionResponse>($"/api/collections/{linked.Id}");

        await oldLink.ShouldHaveStatusAsync(HttpStatusCode.NotFound);
        Assert.Null(owned.ShareToken);
    }

    [Fact]
    public async Task AuditLog_RecordsWhoDidWhatAndWhy()
    {
        var admin = await factory.SignUpAdminAsync();
        var alice = await factory.SignUpAsync();
        var collection = await alice.CreateCollectionAsync("Doomed", CollectionVisibility.Public);

        using (await admin.Client.PutAsync($"/api/admin/collections/{collection.Id}/lock", new AdminLockRequest("  Offensive cover  "))) { }
        using (await admin.Client.DeleteAsync($"/api/admin/collections/{collection.Id}/lock")) { }
        using (await admin.Client.PutAsync($"/api/admin/users/{alice.User.Id}/lock", new AdminLockRequest(null))) { }
        // Repeating a lock is a no-op, not a second entry
        using (await admin.Client.PutAsync($"/api/admin/users/{alice.User.Id}/lock", new AdminLockRequest(null))) { }
        using (await admin.Client.DeleteAsync($"/api/admin/users/{alice.User.Id}/lock")) { }
        // The log outlives what it is about
        using (await alice.Client.DeleteAsync($"/api/collections/{collection.Id}")) { }

        var aboutAlice = await admin.Client.GetJsonAsync<PagedResponse<AdminAuditEntryResponse>>(
            $"/api/admin/audit?userId={alice.User.Id}");
        var hidden = await admin.Client.GetJsonAsync<PagedResponse<AdminAuditEntryResponse>>(
            $"/api/admin/audit?collectionId={collection.Id}&action=CollectionHidden");

        Assert.Equal(
            [AuditAction.UserUnlocked, AuditAction.UserLocked, AuditAction.CollectionUnlocked, AuditAction.CollectionHidden],
            aboutAlice.Items.Select(e => e.Action));
        Assert.All(aboutAlice.Items, e => Assert.Equal((admin.User.Id, admin.UserName), (e.ActorId, e.ActorUserName)));
        Assert.All(aboutAlice.Items, e => Assert.Equal(alice.UserName, e.TargetUserName));
        var entry = Assert.Single(hidden.Items);
        Assert.Equal(("Doomed", "Offensive cover"), (entry.TargetCollectionName, entry.Note));
    }

    [Fact]
    public async Task CollectionAndAuditEndpoints_AreForAdminsOnly()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.CreateCollectionAsync(visibility: CollectionVisibility.Public);

        using var list = await alice.Client.GetAsync("/api/admin/collections");
        using var hide = await alice.Client.PutAsync($"/api/admin/collections/{collection.Id}/lock", new AdminLockRequest(null));
        using var audit = await alice.Client.GetAsync("/api/admin/audit");

        await list.ShouldHaveStatusAsync(HttpStatusCode.Forbidden);
        await hide.ShouldHaveStatusAsync(HttpStatusCode.Forbidden);
        await audit.ShouldHaveStatusAsync(HttpStatusCode.Forbidden);
    }

    private static Task<PagedResponse<AdminCollectionResponse>> ListAsync(TestUser admin, string query) =>
        admin.Client.GetJsonAsync<PagedResponse<AdminCollectionResponse>>($"/api/admin/collections?{query}");
}
