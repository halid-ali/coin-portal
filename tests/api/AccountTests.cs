using System.IO.Compression;
using System.Net;
using System.Text.Json;
using CoinPortal.Api.Contracts.Settings;
using CoinPortal.Api.Data;
using CoinPortal.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

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

        using var response = await alice.Client.GetAsync("/api/settings/export");

        await response.ShouldHaveStatusAsync(HttpStatusCode.OK);
        Assert.Equal("application/zip", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal($"coinportal-{alice.UserName}-{DateTime.UtcNow:yyyyMMdd}.zip",
            response.Content.Headers.ContentDisposition?.FileName);

        using var zip = new ZipArchive(await response.Content.ReadAsStreamAsync());
        var names = zip.Entries.Select(e => e.FullName).Order().ToList();
        Assert.Equal(
            ["account.json", "collections.json", $"covers/{collection.Id}.webp", $"photos/{coin.Id}-national.webp"],
            names);

        var account = Read<AccountExportFile>(zip, "account.json");
        Assert.Equal((alice.UserName, alice.User.Email, "Test", "User"),
            (account.UserName, account.Email, account.FirstName, account.LastName));
        Assert.Equal(new DateOnly(1990, 1, 1), account.BirthDate);

        var collections = Read<List<CollectionExport>>(zip, "collections.json");
        var exported = Assert.Single(collections, c => c.Id == collection.Id);
        Assert.Equal($"covers/{collection.Id}.webp", exported.Cover);
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
    public async Task Delete_RemovesTheUserCollectionsCoinsAndFiles_AndSignsOut()
    {
        var alice = await factory.SignUpAsync();
        var (collection, _) = await FillAsync(alice);
        await alice.SetVisibilityAsync(collection, CollectionVisibility.Public);
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
    private static async Task<(Contracts.Collections.CollectionResponse, Contracts.Coins.CoinResponse)> FillAsync(
        TestUser user, string coinTitle = "Alice's coin")
    {
        var collection = await user.CreateCollectionAsync();
        var coin = await user.CreateCoinAsync(collection.Id, coinTitle);
        using (var photo = await user.Client.PutFileAsync($"/api/coins/{coin.Id}/photos/National", TestImages.Png(200, 200)))
        {
            await photo.ShouldHaveStatusAsync(HttpStatusCode.OK);
        }
        using (var cover = await user.Client.PutFileAsync($"/api/collections/{collection.Id}/cover", TestImages.Png(640, 360)))
        {
            await cover.ShouldHaveStatusAsync(HttpStatusCode.OK);
        }
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
