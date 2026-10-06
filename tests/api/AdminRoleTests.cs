using System.Net;
using CoinPortal.Api.Authorization;
using CoinPortal.Api.Contracts.Admin;
using CoinPortal.Api.Contracts.Auth;
using CoinPortal.Api.Data;
using CoinPortal.Api.Photos;
using CoinPortal.Api.Tests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;

namespace CoinPortal.Api.Tests;

[Collection(AdminCollection.Name)]
public class AdminRoleTests(CoinPortalFactory factory)
{
    [Fact]
    public async Task Me_ListsTheRoles()
    {
        var alice = await factory.SignUpAsync();
        var admin = await factory.SignUpAdminAsync();

        Assert.Empty(alice.User.Roles);
        Assert.Empty((await alice.Client.GetJsonAsync<UserResponse>("/api/auth/me")).Roles);
        Assert.Equal([AppRoles.Admin], admin.User.Roles);
        Assert.Equal([AppRoles.Admin], (await admin.Client.GetJsonAsync<UserResponse>("/api/auth/me")).Roles);
    }

    [Fact]
    public async Task Sync_GrantsTheListedUsers_AndRevokesEveryoneElse()
    {
        var alice = await factory.SignUpAsync();
        var bob = await factory.SignUpAsync();

        // Unknown ids are skipped (logged), not an error
        await factory.SyncAdminsAsync(alice.User.Id, Guid.NewGuid().ToString());
        Assert.Equal([AppRoles.Admin], await RolesAsync(alice));
        Assert.Empty(await RolesAsync(bob));

        await factory.SyncAdminsAsync(bob.User.Id);
        Assert.Empty(await RolesAsync(alice));
        Assert.Equal([AppRoles.Admin], await RolesAsync(bob));

        // A new cookie reflects the change
        alice = await alice.SignInAgainAsync();
        bob = await bob.SignInAgainAsync();
        await alice.Client.ExpectStatusAsync("/api/admin/stats", HttpStatusCode.Forbidden);
        await bob.Client.ExpectStatusAsync("/api/admin/stats", HttpStatusCode.OK);
    }

    [Fact]
    public async Task RoleChange_ReachesAnOpenSession_WithoutSigningInAgain()
    {
        var alice = await factory.SignUpAdminAsync();
        await alice.Client.ExpectStatusAsync("/api/admin/stats", HttpStatusCode.OK);

        // The cookie is checked against the database (in tests on every request, in the app once
        // a minute), so the open session loses the role
        await factory.SyncAdminsAsync();

        await alice.Client.ExpectStatusAsync("/api/admin/stats", HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task AdminEndpoints_NeedTheAdminRole()
    {
        using var visitor = await factory.CreateAnonymousClientAsync();
        var alice = await factory.SignUpAsync();
        var admin = await factory.SignUpAdminAsync();

        await visitor.ExpectStatusAsync("/api/admin/stats", HttpStatusCode.Unauthorized);
        await alice.Client.ExpectStatusAsync("/api/admin/stats", HttpStatusCode.Forbidden);
        await admin.Client.ExpectStatusAsync("/api/admin/stats", HttpStatusCode.OK);
    }

    [Fact]
    public async Task Stats_CountTheWholeSite()
    {
        var admin = await factory.SignUpAdminAsync();
        var alice = await factory.SignUpAsync();
        // Public with photographed coins
        await alice.PublishAsync(await alice.FirstCollectionAsync());
        await alice.CreateCollectionAsync(visibility: CollectionVisibility.Unlisted);

        var stats = await admin.Client.GetJsonAsync<AdminStatsResponse>("/api/admin/stats");

        // Other tests add data at the same time, so only lower bounds are exact
        Assert.True(stats.UserCount >= 2);
        Assert.True(stats.NewUsersLast30Days >= 2);
        Assert.True(stats.CollectionCount >= stats.PublicCollectionCount + stats.UnlistedCollectionCount);
        Assert.True(stats.PublicCollectionCount >= 1);
        Assert.True(stats.UnlistedCollectionCount >= 1);
        Assert.True(stats.CoinCount >= 1);
        Assert.True(stats.PhotoCount >= 1);
        Assert.True(stats.StorageBytes > 0);
    }

    [Fact]
    public async Task Stats_CountLockedUsersAndHiddenCollections()
    {
        // Only admin tests lock and hide, and they run one after another: the difference is exact
        var admin = await factory.SignUpAdminAsync();
        var alice = await factory.SignUpAsync();
        var collection = await alice.CreatePublicCollectionAsync();
        var before = await admin.Client.GetJsonAsync<AdminStatsResponse>("/api/admin/stats");

        using (await admin.Client.PutAsync($"/api/admin/collections/{collection.Id}/lock", new AdminLockRequest(null))) { }
        using (await admin.Client.PutAsync($"/api/admin/users/{alice.User.Id}/lock", new AdminLockRequest(null))) { }
        var after = await admin.Client.GetJsonAsync<AdminStatsResponse>("/api/admin/stats");

        Assert.Equal(before.LockedUserCount + 1, after.LockedUserCount);
        Assert.Equal(before.HiddenCollectionCount + 1, after.HiddenCollectionCount);
    }

    [Fact]
    public async Task Stats_ShowTheLastPhotoSweep()
    {
        var admin = await factory.SignUpAdminAsync();
        var sweep = await factory.Services.GetRequiredService<PhotoSweeper>().SweepAsync(CancellationToken.None);

        var stats = await admin.Client.GetJsonAsync<AdminStatsResponse>("/api/admin/stats");

        // PhotoSweepTests may have run another sweep since
        Assert.NotNull(stats.DiskCheck);
        Assert.True(stats.DiskCheck.CheckedAtUtc >= sweep.CheckedAtUtc);
        Assert.False(stats.DiskCheck.RemovalSkipped);
    }

    private static async Task<IReadOnlyList<string>> RolesAsync(TestUser user) =>
        (await user.Client.GetJsonAsync<UserResponse>("/api/auth/me")).Roles;
}
