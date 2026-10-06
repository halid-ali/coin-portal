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
        await alice.UploadPhotoAsync(coin.Id);

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

    // Users a, b, c: created a, c, b (oldest first); last seen a, then b, c never; storage c > b > a
    [Theory]
    [InlineData("", "b,c,a")] // newest account first
    [InlineData("sort=CreatedAt&dir=Asc", "a,c,b")]
    [InlineData("sort=UserName&dir=Asc", "a,b,c")]
    [InlineData("sort=UserName&dir=Desc", "c,b,a")]
    [InlineData("sort=LastSeen&dir=Desc", "a,b,c")]
    [InlineData("sort=Storage&dir=Desc", "c,b,a")]
    [InlineData("sort=Storage&dir=Asc", "a,b,c")]
    public async Task List_SortsByEachColumn(string query, string expected)
    {
        var admin = await factory.SignUpAdminAsync();
        var prefix = await SignUpThreeAsync();

        var list = await ListAsync(admin, $"search={prefix}&{query}");

        Assert.Equal(expected, string.Join(",", list.Items.Select(u => u.UserName[prefix.Length..])));
    }

    [Fact]
    public async Task List_Pages()
    {
        var admin = await factory.SignUpAdminAsync();
        var prefix = await SignUpThreeAsync();

        var page = await ListAsync(admin, $"search={prefix}&sort=UserName&dir=Desc&pageSize=2&page=2");

        Assert.Equal((3, 2), (page.TotalCount, page.TotalPages));
        Assert.Equal(prefix + "a", Assert.Single(page.Items).UserName);
    }

    [Fact]
    public async Task List_FiltersByStatus()
    {
        var admin = await factory.SignUpAdminAsync();
        var prefix = await SignUpThreeAsync();
        var b = (await ListAsync(admin, $"search={prefix}b")).Items.Single();
        using (var lockB = await admin.Client.PutAsync($"/api/admin/users/{b.Id}/lock", new AdminLockRequest(null)))
        {
            await lockB.ShouldHaveStatusAsync(HttpStatusCode.NoContent);
        }

        var locked = await ListAsync(admin, $"search={prefix}&status=Locked");
        var active = await ListAsync(admin, $"search={prefix}&status=Active&sort=UserName&dir=Asc");

        Assert.Equal([prefix + "b"], locked.Items.Select(u => u.UserName));
        Assert.Equal(AdminUserStatus.Locked, locked.Items[0].Status);
        Assert.Equal([prefix + "a", prefix + "c"], active.Items.Select(u => u.UserName));
    }

    [Theory]
    [InlineData("sort=Email")]
    [InlineData("status=Banned")]
    [InlineData("dir=Up")]
    [InlineData("pageSize=101")]
    public async Task List_InvalidQuery_IsRejected(string query)
    {
        var admin = await factory.SignUpAdminAsync();

        await admin.Client.ExpectStatusAsync($"/api/admin/users?{query}", HttpStatusCode.BadRequest);
    }

    // Three users with a fresh name prefix; times set directly, so the order never rests on how
    // fast they signed up
    private async Task<string> SignUpThreeAsync()
    {
        var prefix = "s" + Guid.NewGuid().ToString("N")[..8];
        var users = new Dictionary<string, TestUser>();
        foreach (var suffix in new[] { "a", "b", "c" })
        {
            users[suffix] = await factory.SignUpAsync(userName: prefix + suffix);
        }
        foreach (var (suffix, photos) in new[] { ("b", 1), ("c", 2) })
        {
            var coin = await users[suffix].CreateCoinAsync((await users[suffix].FirstCollectionAsync()).Id);
            await users[suffix].UploadPhotoAsync(coin.Id, CoinSide.National);
            if (photos == 2)
            {
                await users[suffix].UploadPhotoAsync(coin.Id, CoinSide.Common);
            }
        }
        var now = DateTime.UtcNow;
        await factory.WithDbAsync(async db =>
        {
            var rows = await db.Users.Where(u => u.UserName!.StartsWith(prefix)).ToListAsync();
            foreach (var user in rows)
            {
                (user.CreatedAtUtc, user.LastSeenAtUtc) = user.UserName![prefix.Length..] switch
                {
                    "a" => (now.AddDays(-3), now.AddHours(-1)),
                    "b" => (now.AddDays(-1), now.AddHours(-2)),
                    _ => (now.AddDays(-2), (DateTime?)null),
                };
            }
            return await db.SaveChangesAsync();
        });
        return prefix;
    }

    [Fact]
    public async Task Get_ShowsDetails_And404ForUnknownUsers()
    {
        var admin = await factory.SignUpAdminAsync();
        var alice = await factory.SignUpAsync();
        await alice.PublishAsync(await alice.FirstCollectionAsync());
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
        var shown = await alice.PublishAsync(await alice.FirstCollectionAsync());
        var linked = await alice.CreateCollectionAsync(visibility: CollectionVisibility.Unlisted);
        var coin = await alice.CreatePhotographedCoinAsync(shown.Id);
        var photoId = coin.Photos.Single().Id;
        var coverId = await alice.UploadCoverAsync(shown.Id);
        using var visitor = await factory.CreateAnonymousClientAsync();
        string[] urls =
        [
            $"/api/public/collections/{shown.Id}",
            $"/api/public/users/{alice.UserName}",
            $"/api/public/shared/{linked.ShareToken}",
            $"/api/coins/{coin.Id}/photos/National/Thumb?v={photoId}",
            $"/api/collections/{shown.Id}/cover?v={coverId}",
        ];

        using (await admin.Client.PutAsync($"/api/admin/users/{alice.User.Id}/lock", new AdminLockRequest(null))) { }
        foreach (var url in urls)
        {
            await visitor.ExpectStatusAsync(url, HttpStatusCode.NotFound);
        }
        Assert.Empty((await visitor.GetJsonAsync<PagedResponse<ExploreCoinResponse>>(
            $"/api/public/coins?owner={alice.UserName}")).Items);
        Assert.DoesNotContain(await visitor.GetJsonAsync<List<CollectorResponse>>("/api/public/collectors"),
            c => c.UserName == alice.UserName);

        // Nothing was changed, so unlocking brings everything back
        using (await admin.Client.DeleteAsync($"/api/admin/users/{alice.User.Id}/lock")) { }
        foreach (var url in urls)
        {
            await visitor.ExpectStatusAsync(url, HttpStatusCode.OK);
        }
    }

    [Fact]
    public async Task Admins_CannotBeLocked()
    {
        var admin = await factory.SignUpAdminAsync();
        var otherAdmin = await factory.SignUpAdminAsync();

        using var self = await admin.Client.PutAsync($"/api/admin/users/{admin.User.Id}/lock", new AdminLockRequest(null));
        using var other = await admin.Client.PutAsync($"/api/admin/users/{otherAdmin.User.Id}/lock", new AdminLockRequest(null));

        Assert.Equal("cannot_lock_admin", await self.ReadProblemCodeAsync(HttpStatusCode.Forbidden));
        Assert.Equal("cannot_lock_admin", await other.ReadProblemCodeAsync(HttpStatusCode.Forbidden));
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
        var collection = await bob.PublishAsync(await bob.FirstCollectionAsync());
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

        Assert.Equal("cannot_delete_admin", await self.ReadProblemCodeAsync(HttpStatusCode.Forbidden));
        Assert.Equal("cannot_delete_admin", await other.ReadProblemCodeAsync(HttpStatusCode.Forbidden));
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
