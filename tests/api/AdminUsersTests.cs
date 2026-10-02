using System.Net;
using CoinPortal.Api.Contracts.Admin;
using CoinPortal.Api.Contracts.Coins;
using CoinPortal.Api.Contracts.Common;
using CoinPortal.Api.Contracts.Public;
using CoinPortal.Api.Contracts.Settings;
using CoinPortal.Api.Data;
using CoinPortal.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace CoinPortal.Api.Tests;

[Collection(AdminCollection.Name)]
public class AdminUsersTests(CoinPortalFactory factory)
{
    [Fact]
    public async Task List_FindsUsersByNameOrEmail_WithCounts()
    {
        var admin = await factory.SignUpAdminAsync();
        var alice = await factory.SignUpAsync();
        var coin = await alice.CreateCoinAsync((await alice.FirstCollectionAsync()).Id);
        using (var upload = await alice.Client.PutFileAsync($"/api/coins/{coin.Id}/photos/National",
                   TestImages.Png(200, 200)))
        {
            await upload.ShouldHaveStatusAsync(HttpStatusCode.OK);
        }

        var byName = await ListAsync(admin, $"search={alice.UserName}");
        var byEmail = await ListAsync(admin, $"search={alice.User.Email}");

        var row = Assert.Single(byName.Items);
        Assert.Equal(alice.User.Id, Assert.Single(byEmail.Items).Id);
        Assert.Equal((alice.UserName, alice.User.Email), (row.UserName, row.Email));
        Assert.Equal((AdminUserStatus.Active, false), (row.Status, row.IsAdmin));
        Assert.Equal((1, 1), (row.CollectionCount, row.CoinCount));
        Assert.True(row.StorageBytes > 0);
        Assert.NotNull(row.LastSeenAtUtc);
    }

    [Fact]
    public async Task List_SortsAndPages()
    {
        var admin = await factory.SignUpAdminAsync();
        var prefix = "s" + Guid.NewGuid().ToString("N")[..8];
        foreach (var suffix in new[] { "b", "c", "a" })
        {
            await factory.SignUpAsync(userName: prefix + suffix);
        }

        var asc = await ListAsync(admin, $"search={prefix}&sort=UserName&dir=Asc");
        var desc = await ListAsync(admin, $"search={prefix}&sort=UserName&dir=Desc&pageSize=2&page=2");
        var newest = await ListAsync(admin, $"search={prefix}");

        Assert.Equal([prefix + "a", prefix + "b", prefix + "c"], asc.Items.Select(u => u.UserName));
        Assert.Equal((3, 2), (desc.TotalCount, desc.TotalPages));
        Assert.Equal(prefix + "a", Assert.Single(desc.Items).UserName);
        Assert.Equal(prefix + "a", newest.Items[0].UserName); // newest account first by default
    }

    [Fact]
    public async Task Get_ShowsDetails_And404ForUnknownUsers()
    {
        var admin = await factory.SignUpAdminAsync();
        var alice = await factory.SignUpAsync();
        await alice.SetVisibilityAsync(await alice.FirstCollectionAsync(), CollectionVisibility.Public);
        await alice.CreateCollectionAsync(visibility: CollectionVisibility.Unlisted);

        var detail = await admin.Client.GetJsonAsync<AdminUserDetailResponse>($"/api/admin/users/{alice.User.Id}");
        using var unknown = await admin.Client.GetAsync($"/api/admin/users/{Guid.NewGuid()}");

        Assert.Equal(("Test", "User"), (detail.FirstName, detail.LastName));
        Assert.Equal((2, 1, 1), (detail.CollectionCount, detail.PublicCollectionCount, detail.UnlistedCollectionCount));
        Assert.NotNull(detail.LastSignInAtUtc);
        Assert.True(detail.QuotaBytes > 0);
        await unknown.ShouldHaveStatusAsync(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Lock_EndsTheSession_AndBlocksSignIn_UntilUnlocked()
    {
        var admin = await factory.SignUpAdminAsync();
        var alice = await factory.SignUpAsync();
        using var other = await factory.CreateAnonymousClientAsync();

        using (var locked = await admin.Client.PutAsync($"/api/admin/users/{alice.User.Id}/lock",
                   new AdminLockRequest("Spam")))
        {
            await locked.ShouldHaveStatusAsync(HttpStatusCode.NoContent);
        }
        using var session = await alice.Client.GetAsync("/api/auth/me");
        using var signIn = await other.LoginAsync(alice.UserName, TestUser.Password);
        using var guess = await other.LoginAsync(alice.UserName, "Wrongpass123");
        var detail = await admin.Client.GetJsonAsync<AdminUserDetailResponse>($"/api/admin/users/{alice.User.Id}");

        await session.ShouldHaveStatusAsync(HttpStatusCode.Unauthorized);
        Assert.Equal("account_locked", await signIn.ReadProblemCodeAsync(HttpStatusCode.Locked));
        // The lock is told only with the right password
        await guess.ShouldHaveStatusAsync(HttpStatusCode.Unauthorized);
        Assert.Equal(AdminUserStatus.Locked, detail.Status);
        Assert.NotNull(detail.LockedAtUtc);

        using (var unlocked = await admin.Client.DeleteAsync($"/api/admin/users/{alice.User.Id}/lock"))
        {
            await unlocked.ShouldHaveStatusAsync(HttpStatusCode.NoContent);
        }
        using var again = await other.LoginAsync(alice.UserName, TestUser.Password);
        await again.ShouldHaveStatusAsync(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Lock_HidesTheUsersSharedCollections_UntilUnlocked()
    {
        var admin = await factory.SignUpAdminAsync();
        var alice = await factory.SignUpAsync();
        var shown = await alice.SetVisibilityAsync(await alice.FirstCollectionAsync(), CollectionVisibility.Public);
        var linked = await alice.CreateCollectionAsync(visibility: CollectionVisibility.Unlisted);
        var coin = await alice.CreateCoinAsync(shown.Id);
        Guid photoId;
        using (var upload = await alice.Client.PutFileAsync($"/api/coins/{coin.Id}/photos/National",
                   TestImages.Png(200, 200)))
        {
            photoId = (await upload.ReadJsonAsync<CoinResponse>()).Photos.Single().Id;
        }
        using var visitor = await factory.CreateAnonymousClientAsync();
        string[] urls =
        [
            $"/api/public/collections/{shown.Id}",
            $"/api/public/users/{alice.UserName}",
            $"/api/public/shared/{linked.ShareToken}",
            $"/api/coins/{coin.Id}/photos/National/Thumb?v={photoId}",
        ];

        using (await admin.Client.PutAsync($"/api/admin/users/{alice.User.Id}/lock", new AdminLockRequest(null))) { }
        foreach (var url in urls)
        {
            using var response = await visitor.GetAsync(url);
            await response.ShouldHaveStatusAsync(HttpStatusCode.NotFound);
        }
        Assert.Empty((await visitor.GetJsonAsync<PagedResponse<ExploreCoinResponse>>(
            $"/api/public/coins?owner={alice.UserName}")).Items);
        Assert.DoesNotContain(await visitor.GetJsonAsync<List<CollectorResponse>>("/api/public/collectors"),
            c => c.UserName == alice.UserName);

        // Nothing was changed, so unlocking brings everything back
        using (await admin.Client.DeleteAsync($"/api/admin/users/{alice.User.Id}/lock")) { }
        foreach (var url in urls)
        {
            using var response = await visitor.GetAsync(url);
            await response.ShouldHaveStatusAsync(HttpStatusCode.OK);
        }
    }

    [Fact]
    public async Task Admins_CannotBeLocked()
    {
        var admin = await factory.SignUpAdminAsync();
        var otherAdmin = await factory.SignUpAdminAsync();

        using var self = await admin.Client.PutAsync($"/api/admin/users/{admin.User.Id}/lock", new AdminLockRequest(null));
        using var other = await admin.Client.PutAsync($"/api/admin/users/{otherAdmin.User.Id}/lock", new AdminLockRequest(null));

        Assert.Equal("cannot_lock_admin", await self.ReadProblemCodeAsync());
        Assert.Equal("cannot_lock_admin", await other.ReadProblemCodeAsync());
    }

    [Fact]
    public async Task Unlock_AlsoEndsATemporaryLockout()
    {
        var admin = await factory.SignUpAdminAsync();
        var bob = await factory.SignUpAsync();
        using var client = await factory.CreateAnonymousClientAsync();
        for (var i = 0; i < 5; i++)
        {
            using var failed = await client.LoginAsync(bob.UserName, "Wrongpass123");
        }
        var lockedOut = await admin.Client.GetJsonAsync<AdminUserDetailResponse>($"/api/admin/users/{bob.User.Id}");
        var filtered = await ListAsync(admin, $"search={bob.UserName}&status=LockedOut");

        using (await admin.Client.DeleteAsync($"/api/admin/users/{bob.User.Id}/lock")) { }
        using var signIn = await client.LoginAsync(bob.UserName, TestUser.Password);

        Assert.Equal(AdminUserStatus.LockedOut, lockedOut.Status);
        Assert.NotNull(lockedOut.LockedOutUntilUtc);
        Assert.Null(lockedOut.LockedAtUtc);
        Assert.Equal(bob.User.Id, Assert.Single(filtered.Items).Id);
        await signIn.ShouldHaveStatusAsync(HttpStatusCode.OK);
    }

    [Fact]
    public async Task UserEndpoints_AreForAdminsOnly()
    {
        var alice = await factory.SignUpAsync();
        var bob = await factory.SignUpAsync();

        using var list = await alice.Client.GetAsync("/api/admin/users");
        using var lockBob = await alice.Client.PutAsync($"/api/admin/users/{bob.User.Id}/lock", new AdminLockRequest(null));
        using var deleteBob = await alice.Client.DeleteAsync($"/api/admin/users/{bob.User.Id}", new AdminDeleteUserRequest(null));

        await list.ShouldHaveStatusAsync(HttpStatusCode.Forbidden);
        await lockBob.ShouldHaveStatusAsync(HttpStatusCode.Forbidden);
        await deleteBob.ShouldHaveStatusAsync(HttpStatusCode.Forbidden);
        Assert.Equal(1, await factory.WithDbAsync(db => db.Users.CountAsync(u => u.Id == bob.User.Id)));
    }

    [Fact]
    public async Task Delete_RemovesTheUser_AndTheirNamesFromTheAuditLog()
    {
        var admin = await factory.SignUpAdminAsync();
        var bob = await factory.SignUpAsync();
        var collection = await bob.SetVisibilityAsync(await bob.FirstCollectionAsync(), CollectionVisibility.Public);
        using (await admin.Client.PutAsync($"/api/admin/users/{bob.User.Id}/lock", new AdminLockRequest("spam"))) { }
        using (await admin.Client.PutAsync($"/api/admin/collections/{collection.Id}/lock", new AdminLockRequest(null))) { }

        using var response = await admin.Client.DeleteAsync($"/api/admin/users/{bob.User.Id}",
            new AdminDeleteUserRequest("Spam account"));

        await response.ShouldHaveStatusAsync(HttpStatusCode.NoContent);
        using (var detail = await admin.Client.GetAsync($"/api/admin/users/{bob.User.Id}"))
        {
            await detail.ShouldHaveStatusAsync(HttpStatusCode.NotFound);
        }
        Assert.Equal(0, await factory.WithDbAsync(db => db.Collections.CountAsync(c => c.OwnerId == bob.User.Id)));

        var entries = (await admin.Client.GetJsonAsync<PagedResponse<AdminAuditEntryResponse>>(
            $"/api/admin/audit?userId={bob.User.Id}")).Items;
        Assert.Equal([AuditAction.UserDeleted, AuditAction.CollectionHidden, AuditAction.UserLocked],
            entries.Select(e => e.Action));
        Assert.All(entries, e =>
        {
            Assert.Null(e.TargetUserName);
            Assert.Null(e.TargetCollectionName);
            Assert.Equal(admin.UserName, e.ActorUserName);
        });
        Assert.Equal("Spam account", entries[0].Note);
        Assert.Equal(collection.Id, entries[1].TargetCollectionId);
    }

    [Fact]
    public async Task Delete_Admins_AndUnknownUsers_AreRefused()
    {
        var admin = await factory.SignUpAdminAsync();
        var otherAdmin = await factory.SignUpAdminAsync();

        using var self = await admin.Client.DeleteAsync($"/api/admin/users/{admin.User.Id}", new AdminDeleteUserRequest(null));
        using var other = await admin.Client.DeleteAsync($"/api/admin/users/{otherAdmin.User.Id}", new AdminDeleteUserRequest(null));
        using var unknown = await admin.Client.DeleteAsync($"/api/admin/users/{Guid.NewGuid()}", new AdminDeleteUserRequest(null));

        Assert.Equal("cannot_delete_admin", await self.ReadProblemCodeAsync());
        Assert.Equal("cannot_delete_admin", await other.ReadProblemCodeAsync());
        await unknown.ShouldHaveStatusAsync(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task OwnAccount_AdminsCannotDeleteIt_FormerAdminsCan_AndLeaveTheLogAsActors()
    {
        var admin = await factory.SignUpAdminAsync();
        var bob = await factory.SignUpAsync();
        using (await admin.Client.PutAsync($"/api/admin/users/{bob.User.Id}/lock", new AdminLockRequest(null))) { }

        using (var refused = await admin.Client.DeleteAsync("/api/settings/account", new DeleteAccountRequest(TestUser.Password)))
        {
            Assert.Equal("admin_account", await refused.ReadProblemCodeAsync(HttpStatusCode.Forbidden));
        }

        // Removed from the configuration: an ordinary user now
        await factory.SyncAdminsAsync();
        using var deleted = await admin.Client.DeleteAsync("/api/settings/account", new DeleteAccountRequest(TestUser.Password));

        await deleted.ShouldHaveStatusAsync(HttpStatusCode.NoContent);
        var entry = await factory.WithDbAsync(db => db.AuditLog.SingleAsync(e => e.ActorId == admin.User.Id));
        Assert.Null(entry.ActorUserName);
        Assert.Equal(bob.UserName, entry.TargetUserName);
    }

    private static Task<PagedResponse<AdminUserResponse>> ListAsync(TestUser admin, string query) =>
        admin.Client.GetJsonAsync<PagedResponse<AdminUserResponse>>($"/api/admin/users?{query}");
}
