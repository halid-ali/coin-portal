using System.Net;
using CoinPortal.Api.Contracts.Coins;
using CoinPortal.Api.Data;
using CoinPortal.Api.Photos;
using CoinPortal.Api.Tests.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;

namespace CoinPortal.Api.Tests;

/// <summary>
/// The orphan sweep (PhotoSweeper). Its background run is off in tests; they call it directly.
/// Other tests write to the same photo folder meanwhile, so only what these tests made old is
/// expected to go, and counts are at least what they set up.
/// </summary>
public class PhotoSweepTests(CoinPortalFactory factory)
{
    private static readonly DateTime LongAgo = DateTime.UtcNow - PhotoSweeper.MinAge - TimeSpan.FromHours(1);

    [Fact]
    public async Task Sweep_RemovesOldOrphansAndUnfinishedUploads_AndKeepsEverythingElse()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.FirstCollectionAsync();
        var coin = await alice.CreateCoinAsync(collection.Id);
        var photo = await UploadAsync(alice, coin.Id, CoinSide.National);
        using (var cover = await alice.Client.PutFileAsync($"/api/collections/{collection.Id}/cover", TestImages.Png(640, 360)))
        {
            await cover.ShouldHaveStatusAsync(HttpStatusCode.OK);
        }
        var coverId = (await factory.WithDbAsync(db => db.Collections.FindAsync(collection.Id).AsTask()))!.CoverImageId!.Value;
        // A real photo, but written long ago: its row keeps it
        Directory.SetLastWriteTimeUtc(ImageFolder(alice.User.Id, photo.Id), LongAgo);

        var oldOrphan = MakeImageFolder(factory.PhotoRoot, alice.User.Id, old: true);
        var newOrphan = MakeImageFolder(factory.PhotoRoot, alice.User.Id, old: false);
        var unfinished = MakeFolder(Path.Combine(factory.PhotoRoot, ".tmp", Guid.NewGuid().ToString("N")), old: true);
        // Left behind by a deleted account: the owner folder goes too
        var goneOwner = Guid.NewGuid().ToString();
        MakeImageFolder(factory.PhotoRoot, goneOwner, old: true);

        var result = await Sweeper(factory).SweepAsync(CancellationToken.None);

        Assert.False(Directory.Exists(oldOrphan));
        Assert.False(Directory.Exists(unfinished));
        Assert.False(Directory.Exists(Path.Combine(factory.PhotoRoot, goneOwner)));
        // Possibly an upload in progress, and the images the database refers to
        Assert.True(Directory.Exists(newOrphan));
        Assert.True(Directory.Exists(ImageFolder(alice.User.Id, photo.Id)));
        Assert.True(Directory.Exists(ImageFolder(alice.User.Id, coverId)));

        Assert.False(result.RemovalSkipped);
        Assert.True(result.RemovedImageCount >= 2);
        Assert.True(result.RemovedUnfinishedCount >= 1);
        Assert.True(result.ImageCount >= 3);
        Assert.True(result.DiskBytes > 0);
        Assert.Same(result, Sweeper(factory).LastResult);
    }

    [Fact]
    public async Task Sweep_CountsImagesWhoseFileIsMissing_AndKeepsTheirRows()
    {
        var alice = await factory.SignUpAsync();
        var coin = await alice.CreateCoinAsync((await alice.FirstCollectionAsync()).Id);
        var photo = await UploadAsync(alice, coin.Id, CoinSide.Common);
        Directory.Delete(ImageFolder(alice.User.Id, photo.Id), recursive: true);

        var result = await Sweeper(factory).SweepAsync(CancellationToken.None);

        Assert.True(result.MissingImageCount >= 1);
        Assert.Single((await alice.Client.GetJsonAsync<CoinResponse>($"/api/coins/{coin.Id}")).Photos);
    }

    private static PhotoSweeper Sweeper(WebApplicationFactory<Program> host) =>
        host.Services.GetRequiredService<PhotoSweeper>();

    private string ImageFolder(string ownerId, Guid imageId) =>
        Path.Combine(factory.PhotoRoot, ownerId, imageId.ToString("N"));

    // Storage layout: {root}/{ownerId}/{imageId:N}/{file}.webp
    internal static string MakeImageFolder(string root, string ownerId, bool old) =>
        MakeFolder(Path.Combine(root, ownerId, Guid.NewGuid().ToString("N")), old);

    private static string MakeFolder(string folder, bool old)
    {
        Directory.CreateDirectory(folder);
        File.WriteAllBytes(Path.Combine(folder, "thumb.webp"), [1, 2, 3]);
        if (old)
        {
            // After the file: adding it sets the folder's time
            Directory.SetLastWriteTimeUtc(folder, LongAgo);
        }
        return folder;
    }

    private static async Task<CoinPhotoResponse> UploadAsync(TestUser user, int coinId, CoinSide side)
    {
        using var response = await user.Client.PutFileAsync($"/api/coins/{coinId}/photos/{side}", TestImages.Png(200, 160));
        var coin = await response.ReadJsonAsync<CoinResponse>();
        return coin.Photos.Single(p => p.Side == side);
    }
}

// A second host: its startup runs the admin sync
[Collection(AdminCollection.Name)]
public class PhotoSweepWrongFolderTests(CoinPortalFactory factory)
{
    [Fact]
    public async Task Sweep_RemovesNothing_WhenMostImagesHaveNoRow()
    {
        // A photo folder that belongs to another database, e.g. after a wrong setting
        var root = Path.Combine(Path.GetTempPath(), $"CoinPortal_SweepTest_{Guid.NewGuid():N}");
        try
        {
            var owner = Guid.NewGuid().ToString();
            var folders = Enumerable.Range(0, 11).Select(_ => PhotoSweepTests.MakeImageFolder(root, owner, old: true)).ToList();
            await using var host = factory.WithSettings(new Dictionary<string, string?>
            {
                ["PhotoStorage:RootPath"] = root,
            });

            var result = await host.Services.GetRequiredService<PhotoSweeper>().SweepAsync(CancellationToken.None);

            Assert.True(result.RemovalSkipped);
            Assert.Equal(0, result.RemovedImageCount);
            Assert.All(folders, f => Assert.True(Directory.Exists(f)));
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }
}
