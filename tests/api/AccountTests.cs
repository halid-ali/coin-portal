using System.IO.Compression;
using System.Net;
using System.Text.Json;
using CoinPortal.Api.Accounts;
using CoinPortal.Api.Contracts.Settings;
using CoinPortal.Api.Data;
using CoinPortal.Api.Photos;
using CoinPortal.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CoinPortal.Api.Tests;

/// <summary>The user's own account: data export and deletion (Settings > Account).</summary>
public class AccountTests(CoinPortalFactory factory)
{
    // Non-ASCII letters, a middle dot and apostrophes, like titles in the other languages
    private const string Title = "2 € · Belçika · Ünlü'nün coin'i";

    [Fact]
    public async Task Export_HoldsTheUsersDataAndImages_AndNothingOfOthers()
    {
        var alice = await factory.SignUpAsync();
        var (collection, coin) = await FillAsync(alice, Title);
        var bob = await factory.SignUpAsync();
        await FillAsync(bob, "Bob's secret coin");
        var shared = await alice.SetVisibilityAsync(collection, CollectionVisibility.Unlisted);

        using var response = await alice.Client.GetAsync("/api/settings/export");

        await response.ShouldHaveStatusAsync(HttpStatusCode.OK);
        Assert.Equal("application/zip", response.Content.Headers.ContentType?.MediaType);
        // The date part is tested on its own: around midnight it may differ from the test's clock
        var fileName = response.Content.Headers.ContentDisposition?.FileName;
        Assert.StartsWith($"coinvitrine-{alice.UserName}-", fileName);
        Assert.EndsWith(".zip", fileName);

        using var zip = new ZipArchive(await response.Content.ReadAsStreamAsync());
        var names = zip.Entries.Select(e => e.FullName).Order().ToList();
        Assert.Equal(
            ["account.json", "collections.json", $"covers/{collection.Id}.webp", "moderation.json",
                $"photos/{coin.Id}-national.webp"],
            names);

        var account = Read<AccountExportFile>(zip, "account.json");
        Assert.Equal((alice.UserName, alice.User.Email, true, "Test", "User"),
            (account.UserName, account.Email, account.EmailConfirmed, account.FirstName, account.LastName));
        Assert.Equal(new DateOnly(1990, 1, 1), account.BirthDate);
        Assert.Empty(account.MissingImages);

        var collections = Read<List<CollectionExport>>(zip, "collections.json");
        var exported = Assert.Single(collections, c => c.Id == collection.Id);
        Assert.Equal($"covers/{collection.Id}.webp", exported.Cover);
        Assert.Equal(shared.ShareToken, exported.ShareToken);
        Assert.Null(exported.HiddenByAdminAtUtc);
        Assert.Empty(Read<List<ModerationExport>>(zip, "moderation.json"));
        var exportedCoin = Assert.Single(exported.Coins);
        Assert.Equal((coin.Id, Title, "DE", 2006), (exportedCoin.Id, exportedCoin.Title,
            exportedCoin.CountryCode, exportedCoin.Year));
        Assert.Equal($"photos/{coin.Id}-national.webp", exportedCoin.Photos[CoinSide.National]);
        // The sign-up collection is there too, empty
        Assert.Equal(2, collections.Count);

        var everything = string.Join("", zip.Entries.Where(e => e.Name.EndsWith(".json"))
            .Select(e => new StreamReader(e.Open()).ReadToEnd()));
        Assert.DoesNotContain("Bob's secret coin", everything);
        // Readable as text: written as it is, not as \u escapes
        Assert.Contains(Title, everything);
        Assert.DoesNotContain(@"\u00", everything);
        Assert.DoesNotContain(bob.UserName, everything);
        Assert.Contains("RIFF", System.Text.Encoding.ASCII.GetString(ReadBytes(zip, $"photos/{coin.Id}-national.webp")[..4]));
    }

    [Fact]
    public void ExportFileName_HasTheUserNameAndTheUtcDate()
    {
        var user = new ApplicationUser { UserName = "ayse.yilmaz" };

        var name = AccountExport.FileName(user, new DateTime(2026, 10, 4, 23, 59, 59, DateTimeKind.Utc));

        Assert.Equal("coinvitrine-ayse.yilmaz-20261004.zip", name);
    }

    [Fact]
    public async Task Export_ListsImagesWhoseFileIsMissing()
    {
        var alice = await factory.SignUpAsync();
        var (collection, coin) = await FillAsync(alice);
        var photoId = (await alice.Client.GetJsonAsync<Contracts.Coins.CoinResponse>($"/api/coins/{coin.Id}")).Photos[0].Id;
        // Disk and database out of step (a restored backup, a folder removed by hand)
        Directory.Delete(Path.Combine(factory.PhotoRoot, alice.User.Id, photoId.ToString("N")), recursive: true);

        using var response = await alice.Client.GetAsync("/api/settings/export");

        await response.ShouldHaveStatusAsync(HttpStatusCode.OK);
        using var zip = new ZipArchive(await response.Content.ReadAsStreamAsync());
        Assert.Equal([$"photos/{coin.Id}-national.webp"], Read<AccountExportFile>(zip, "account.json").MissingImages);
        Assert.Null(zip.GetEntry($"photos/{coin.Id}-national.webp"));
        Assert.NotNull(zip.GetEntry($"covers/{collection.Id}.webp"));
    }

    [Fact]
    public async Task Export_And_Delete_SignedOut_Are401()
    {
        using var client = await factory.CreateAnonymousClientAsync();

        using var export = await client.GetAsync("/api/settings/export");
        using var delete = await client.DeleteAsync("/api/settings/account", new DeleteAccountRequest(TestUser.Password));

        await export.ShouldHaveStatusAsync(HttpStatusCode.Unauthorized);
        await delete.ShouldHaveStatusAsync(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Delete_WrongPassword_IsRejected_AndKeepsTheAccount()
    {
        var alice = await factory.SignUpAsync();

        using var response = await alice.Client.DeleteAsync("/api/settings/account",
            new DeleteAccountRequest("Wrongpass123"));

        Assert.Equal("wrong_password", await response.ReadProblemCodeAsync());
        using var me = await alice.Client.GetAsync("/api/auth/me");
        await me.ShouldHaveStatusAsync(HttpStatusCode.OK);
        Assert.Equal(1, await factory.WithDbAsync(db => db.Users.CountAsync(u => u.Id == alice.User.Id)));
    }

    [Fact]
    public async Task Delete_FiveWrongPasswords_LockTheAccount_AndKeepIt()
    {
        var alice = await factory.SignUpAsync();

        // Guessing the password here counts like failed sign-ins
        for (var i = 0; i < 4; i++)
        {
            using var wrong = await alice.Client.DeleteAsync("/api/settings/account",
                new DeleteAccountRequest("Wrongpass123"));
            Assert.Equal("wrong_password", await wrong.ReadProblemCodeAsync());
        }
        using (var fifth = await alice.Client.DeleteAsync("/api/settings/account",
                   new DeleteAccountRequest("Wrongpass123")))
        {
            await fifth.ShouldHaveStatusAsync(HttpStatusCode.Locked);
        }
        using var right = await alice.Client.DeleteAsync("/api/settings/account",
            new DeleteAccountRequest(TestUser.Password));

        await right.ShouldHaveStatusAsync(HttpStatusCode.Locked);
        Assert.Equal(1, await factory.WithDbAsync(db => db.Users.CountAsync(u => u.Id == alice.User.Id)));
    }

    [Fact]
    public async Task Delete_RemovesTheUserCollectionsCoinsAndFiles_AndSignsOut()
    {
        var alice = await factory.SignUpAsync();
        var (collection, _) = await FillAsync(alice);
        await alice.PublishAsync(collection);
        var bob = await factory.SignUpAsync();
        var (bobsCollection, bobsCoin) = await FillAsync(bob);
        var aliceFolder = Path.Combine(factory.PhotoRoot, alice.User.Id);
        Assert.True(Directory.Exists(aliceFolder));

        using var response = await alice.Client.DeleteAsync("/api/settings/account",
            new DeleteAccountRequest(TestUser.Password));

        await response.ShouldHaveStatusAsync(HttpStatusCode.NoContent);
        using (var me = await alice.Client.GetAsync("/api/auth/me"))
        {
            await me.ShouldHaveStatusAsync(HttpStatusCode.Unauthorized);
        }
        // The antiforgery token belonged to the deleted user; the client renews it, like after sign-out
        await alice.Client.RefreshAntiforgeryAsync();
        using (var login = await alice.Client.LoginAsync(alice.UserName, TestUser.Password))
        {
            await login.ShouldHaveStatusAsync(HttpStatusCode.Unauthorized);
        }
        using var anonymous = await factory.CreateAnonymousClientAsync();
        using (var shared = await anonymous.GetAsync($"/api/public/collections/{collection.Id}"))
        {
            await shared.ShouldHaveStatusAsync(HttpStatusCode.NotFound);
        }

        var left = await factory.WithDbAsync(async db => new[]
        {
            await db.Users.CountAsync(u => u.Id == alice.User.Id),
            await db.Collections.CountAsync(c => c.OwnerId == alice.User.Id),
            await db.Coins.CountAsync(c => c.OwnerId == alice.User.Id),
            await db.CoinPhotos.CountAsync(p => p.Coin.OwnerId == alice.User.Id),
        });
        Assert.Equal([0, 0, 0, 0], left);
        Assert.False(Directory.Exists(aliceFolder));

        // Someone else's data is untouched
        Assert.Single((await bob.Client.GetJsonAsync<Contracts.Coins.CoinResponse>($"/api/coins/{bobsCoin.Id}")).Photos);
        Assert.True(Directory.Exists(Path.Combine(factory.PhotoRoot, bob.User.Id)));
        Assert.Contains(await bob.Client.GetJsonAsync<List<Contracts.Collections.CollectionResponse>>("/api/collections"),
            c => c.Id == bobsCollection.Id);
    }

    // A collection with a cover and a coin with a national side photo
    [Fact]
    public async Task Delete_WhileAPhotoIsBeingServed_RemovesTheFolder()
    {
        var alice = await factory.SignUpAsync();
        var (_, coin) = await FillAsync(alice);
        var photo = (await alice.Client.GetJsonAsync<Contracts.Coins.CoinResponse>($"/api/coins/{coin.Id}")).Photos[0];
        var aliceFolder = Path.Combine(factory.PhotoRoot, alice.User.Id);

        // A response still streaming the photo holds the file open, as the API does
        var storage = factory.Services.GetRequiredService<IPhotoStorage>();
        await using var reading = storage.OpenRead(alice.User.Id, photo.Id, "full.webp");
        Assert.NotNull(reading);

        using var response = await alice.Client.DeleteAsync("/api/settings/account",
            new DeleteAccountRequest(TestUser.Password));

        await response.ShouldHaveStatusAsync(HttpStatusCode.NoContent);
        Assert.False(Directory.Exists(aliceFolder));
    }

    private static async Task<(Contracts.Collections.CollectionResponse, Contracts.Coins.CoinResponse)> FillAsync(
        TestUser user, string coinTitle = "Alice's coin")
    {
        var collection = await user.CreateCollectionAsync();
        var coin = await user.CreateCoinAsync(collection.Id, coinTitle);
        await user.UploadPhotoAsync(coin.Id);
        await user.UploadCoverAsync(collection.Id);
        return (collection, coin);
    }

    private static T Read<T>(ZipArchive zip, string name)
    {
        using var stream = zip.GetEntry(name)!.Open();
        return JsonSerializer.Deserialize<T>(stream, ApiClient.Json)!;
    }

    private static byte[] ReadBytes(ZipArchive zip, string name)
    {
        using var stream = zip.GetEntry(name)!.Open();
        using var memory = new MemoryStream();
        stream.CopyTo(memory);
        return memory.ToArray();
    }
}
