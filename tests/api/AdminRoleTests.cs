using System.Net;
using CoinPortal.Api.Authorization;
using CoinPortal.Api.Contracts.Admin;
using CoinPortal.Api.Contracts.Auth;
using CoinPortal.Api.Data;
using CoinPortal.Api.Tests.Infrastructure;

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
        await ExpectStatusAsync(alice.Client, HttpStatusCode.Forbidden);
        await ExpectStatusAsync(bob.Client, HttpStatusCode.OK);
    }

    [Fact]
    public async Task AdminEndpoints_NeedTheAdminRole()
    {
        using var visitor = await factory.CreateAnonymousClientAsync();
        var alice = await factory.SignUpAsync();
        var admin = await factory.SignUpAdminAsync();

        await ExpectStatusAsync(visitor, HttpStatusCode.Unauthorized);
        await ExpectStatusAsync(alice.Client, HttpStatusCode.Forbidden);
        await ExpectStatusAsync(admin.Client, HttpStatusCode.OK);
    }

    [Fact]
    public async Task Stats_CountTheWholeSite()
    {
        var admin = await factory.SignUpAdminAsync();
        var alice = await factory.SignUpAsync();
        var collection = await alice.SetVisibilityAsync(await alice.FirstCollectionAsync(), CollectionVisibility.Public);
        await alice.CreateCollectionAsync(visibility: CollectionVisibility.Unlisted);
        var coin = await alice.CreateCoinAsync(collection.Id);
        using (var upload = await alice.Client.PutFileAsync($"/api/coins/{coin.Id}/photos/National",
                   TestImages.Png(200, 200)))
        {
            await upload.ShouldHaveStatusAsync(HttpStatusCode.OK);
        }

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

    private static async Task<IReadOnlyList<string>> RolesAsync(TestUser user) =>
        (await user.Client.GetJsonAsync<UserResponse>("/api/auth/me")).Roles;

    private static async Task ExpectStatusAsync(ApiClient client, HttpStatusCode expected)
    {
        using var response = await client.GetAsync("/api/admin/stats");
        await response.ShouldHaveStatusAsync(expected);
    }
}
