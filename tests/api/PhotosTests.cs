using System.Net;
using CoinPortal.Api.Contracts.Coins;
using CoinPortal.Api.Contracts.Collections;
using CoinPortal.Api.Data;
using CoinPortal.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace CoinPortal.Api.Tests;

public class PhotosTests(CoinPortalFactory factory)
{
    private static readonly byte[] Photo = TestImages.Png(200, 160);

    [Fact]
    public async Task Upload_StoresThreeSizesAndServesThemToTheOwner()
    {
        var alice = await factory.SignUpAsync();
        var coin = await alice.CreateCoinAsync((await alice.FirstCollectionAsync()).Id);

        var photo = await UploadAsync(alice, coin.Id, CoinSide.National);
        using var thumb = await alice.Client.GetAsync($"/api/coins/{coin.Id}/photos/National/Thumb?v={photo.Id}");

        await thumb.ShouldHaveStatusAsync(HttpStatusCode.OK);
        Assert.Equal("image/webp", thumb.Content.Headers.ContentType?.MediaType);
        Assert.Equal(["full.webp", "preview.webp", "thumb.webp"], StoredFiles(alice, photo.Id));
    }

    [Fact]
    public async Task Photos_AreCachedForGood()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.SetVisibilityAsync(await alice.FirstCollectionAsync(), CollectionVisibility.Public);
        var coin = await alice.CreateCoinAsync(collection.Id);
        var photo = await UploadAsync(alice, coin.Id, CoinSide.National);
        // Signed out: in tests every signed-in request renews the cookie (zero validation interval),
        // and a response that sets a cookie is marked no-cache
        using var visitor = await factory.CreateAnonymousClientAsync();

        using var thumb = await visitor.GetAsync($"/api/coins/{coin.Id}/photos/National/Thumb?v={photo.Id}");

        await thumb.ShouldHaveStatusAsync(HttpStatusCode.OK);
        Assert.Contains("immutable", thumb.Headers.CacheControl?.ToString());
    }

    [Fact]
    public async Task ImagesWithoutVersion_AreRevalidated()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.SetVisibilityAsync(await alice.FirstCollectionAsync(), CollectionVisibility.Public);
        var coin = await alice.CreateCoinAsync(collection.Id);
        await UploadAsync(alice, coin.Id, CoinSide.National);
        await UploadCoverAsync(alice, collection.Id);
        using var visitor = await factory.CreateAnonymousClientAsync();

        // The same address serves the next image too, so it must not be kept for good
        using var photo = await visitor.GetAsync($"/api/coins/{coin.Id}/photos/National/Thumb");
        using var cover = await visitor.GetAsync($"/api/collections/{collection.Id}/cover");

        foreach (var response in new[] { photo, cover })
        {
            await response.ShouldHaveStatusAsync(HttpStatusCode.OK);
            Assert.True(response.Headers.CacheControl?.NoCache);
            Assert.DoesNotContain("immutable", response.Headers.CacheControl?.ToString());
        }
    }

    [Fact]
    public async Task ParallelUploads_LeaveNoFileWithoutARow()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.FirstCollectionAsync();
        var coin = await alice.CreateCoinAsync(collection.Id);

        // Two tabs saving at once: each upload either wins or reports a conflict, and every file
        // on disk belongs to the image the database holds
        var responses = await Task.WhenAll(Enumerable.Range(0, 4).SelectMany(_ => new[]
        {
            alice.Client.PutFileAsync($"/api/collections/{collection.Id}/cover", TestImages.Png(640, 360)),
            alice.Client.PutFileAsync($"/api/coins/{coin.Id}/photos/National", Photo),
        }));

        foreach (var response in responses)
        {
            Assert.Contains(response.StatusCode, new[] { HttpStatusCode.OK, HttpStatusCode.Conflict });
            if (response.StatusCode == HttpStatusCode.Conflict)
            {
                Assert.Equal("conflict", await response.ReadProblemCodeAsync(HttpStatusCode.Conflict));
            }
            response.Dispose();
        }
        var stored = await factory.WithDbAsync(async db => new[]
        {
            (await db.Collections.SingleAsync(c => c.Id == collection.Id)).CoverImageId!.Value,
            (await db.CoinPhotos.SingleAsync(p => p.CoinId == coin.Id)).Id,
        });
        var folders = Directory.GetDirectories(Path.Combine(factory.PhotoRoot, alice.User.Id))
            .Select(f => Guid.ParseExact(Path.GetFileName(f), "N"));
        Assert.Equal(stored.Order(), folders.Order());
    }

    [Fact]
    public async Task Replace_RemovesTheOldFiles_AndOldVersionIs404()
    {
        var alice = await factory.SignUpAsync();
        var coin = await alice.CreateCoinAsync((await alice.FirstCollectionAsync()).Id);
        var first = await UploadAsync(alice, coin.Id, CoinSide.Common);

        var second = await UploadAsync(alice, coin.Id, CoinSide.Common);
        using var oldVersion = await alice.Client.GetAsync($"/api/coins/{coin.Id}/photos/Common/Thumb?v={first.Id}");

        Assert.NotEqual(first.Id, second.Id);
        Assert.Empty(StoredFiles(alice, first.Id));
        await oldVersion.ShouldHaveStatusAsync(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeletingThePhotoOrTheCoin_RemovesTheFiles()
    {
        var alice = await factory.SignUpAsync();
        var coin = await alice.CreateCoinAsync((await alice.FirstCollectionAsync()).Id);
        var national = await UploadAsync(alice, coin.Id, CoinSide.National);
        var common = await UploadAsync(alice, coin.Id, CoinSide.Common);

        using var deletePhoto = await alice.Client.DeleteAsync($"/api/coins/{coin.Id}/photos/National");
        await deletePhoto.ShouldHaveStatusAsync(HttpStatusCode.NoContent);
        Assert.Empty(StoredFiles(alice, national.Id));
        Assert.NotEmpty(StoredFiles(alice, common.Id));

        using var deleteCoin = await alice.Client.DeleteAsync($"/api/coins/{coin.Id}");
        await deleteCoin.ShouldHaveStatusAsync(HttpStatusCode.NoContent);
        Assert.Empty(StoredFiles(alice, common.Id));
    }

    [Fact]
    public async Task DeletingTheCollection_RemovesPhotoAndCoverFiles()
    {
        var alice = await factory.SignUpAsync();
        await alice.FirstCollectionAsync();
        var doomed = await alice.CreateCollectionAsync();
        var coin = await alice.CreateCoinAsync(doomed.Id);
        var photo = await UploadAsync(alice, coin.Id, CoinSide.National);
        var cover = await UploadCoverAsync(alice, doomed.Id);

        using var response = await alice.Client.DeleteAsync($"/api/collections/{doomed.Id}?deleteCoins=true");

        await response.ShouldHaveStatusAsync(HttpStatusCode.NoContent);
        Assert.Empty(StoredFiles(alice, photo.Id));
        Assert.Empty(StoredFiles(alice, cover.CoverImageId));
    }

    [Theory]
    [InlineData(CollectionVisibility.Private, false, false)]
    [InlineData(CollectionVisibility.Public, true, true)]
    [InlineData(CollectionVisibility.Unlisted, false, true)]
    public async Task PhotosAndCover_FollowTheCollectionsVisibility(
        CollectionVisibility visibility, bool visibleWithoutLink, bool visibleWithLink)
    {
        var alice = await factory.SignUpAsync();
        var bob = await factory.SignUpAsync();
        var collection = await alice.FirstCollectionAsync();
        var coin = await alice.CreateCoinAsync(collection.Id);
        var photo = await UploadAsync(alice, coin.Id, CoinSide.National);
        var cover = await UploadCoverAsync(alice, collection.Id);
        collection = await alice.SetVisibilityAsync(collection, visibility);
        // A valid-looking secret for the collections that have none
        var link = collection.ShareToken ?? new string('A', Collection.ShareTokenLength);
        using var visitor = await factory.CreateAnonymousClientAsync();

        foreach (var url in new[]
                 {
                     $"/api/coins/{coin.Id}/photos/National/Preview?v={photo.Id}",
                     $"/api/collections/{collection.Id}/cover?v={cover.CoverImageId}",
                 })
        {
            var linked = url + "&s=" + link;
            await ExpectVisibleAsync(alice.Client, url, true);
            await ExpectVisibleAsync(visitor, url, visibleWithoutLink);
            await ExpectVisibleAsync(bob.Client, url, visibleWithoutLink);
            await ExpectVisibleAsync(visitor, linked, visibleWithLink);
        }
    }

    [Theory]
    [InlineData("notAnImage")]
    [InlineData("tooSmall")]
    [InlineData("losslessJpeg")]
    public async Task Upload_InvalidImage_IsRejected(string kind)
    {
        var alice = await factory.SignUpAsync();
        var coin = await alice.CreateCoinAsync((await alice.FirstCollectionAsync()).Id);
        // No image at all (whatever the file name says), below 150 px on one side, or a JPEG kind
        // the image library does not decode
        var bytes = kind switch
        {
            "notAnImage" => TestImages.NotAnImage(),
            "tooSmall" => TestImages.Png(149, 400),
            _ => TestImages.LosslessJpeg(),
        };

        using var response = await alice.Client.PutFileAsync($"/api/coins/{coin.Id}/photos/National", bytes);

        Assert.Equal("invalid_image", await response.ReadProblemCodeAsync());
        Assert.Empty((await alice.Client.GetJsonAsync<CoinResponse>($"/api/coins/{coin.Id}")).Photos);
    }

    [Fact]
    public async Task Upload_WithoutFile_IsFileMissing()
    {
        var alice = await factory.SignUpAsync();
        var coin = await alice.CreateCoinAsync((await alice.FirstCollectionAsync()).Id);

        using var response = await alice.Client.PutFileAsync($"/api/coins/{coin.Id}/photos/National", []);

        Assert.Equal("file_missing", await response.ReadProblemCodeAsync());
    }

    [Fact]
    public async Task Cover_NarrowerThan320In16To9_IsRejected()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.FirstCollectionAsync();

        using var response = await alice.Client.PutFileAsync($"/api/collections/{collection.Id}/cover",
            TestImages.Png(319, 180));

        Assert.Equal("invalid_image", await response.ReadProblemCodeAsync());
    }

    [Fact]
    public async Task OtherUsersCoinOrCollection_CannotReceiveImages()
    {
        var alice = await factory.SignUpAsync();
        var bob = await factory.SignUpAsync();
        var collection = await alice.FirstCollectionAsync();
        var coin = await alice.CreateCoinAsync(collection.Id);

        using var photo = await bob.Client.PutFileAsync($"/api/coins/{coin.Id}/photos/National", Photo);
        using var cover = await bob.Client.PutFileAsync($"/api/collections/{collection.Id}/cover",
            TestImages.Png(640, 360));

        await photo.ShouldHaveStatusAsync(HttpStatusCode.NotFound);
        await cover.ShouldHaveStatusAsync(HttpStatusCode.NotFound);
    }

    private static async Task<CoinPhotoResponse> UploadAsync(TestUser user, int coinId, CoinSide side)
    {
        using var response = await user.Client.PutFileAsync($"/api/coins/{coinId}/photos/{side}", Photo);
        var coin = await response.ReadJsonAsync<CoinResponse>();
        return coin.Photos.Single(p => p.Side == side);
    }

    private static async Task<CollectionCoverImageResponse> UploadCoverAsync(TestUser user, int collectionId)
    {
        using var response = await user.Client.PutFileAsync($"/api/collections/{collectionId}/cover",
            TestImages.Png(640, 360));
        return await response.ReadJsonAsync<CollectionCoverImageResponse>();
    }

    private static async Task ExpectVisibleAsync(ApiClient client, string url, bool visible)
    {
        using var response = await client.GetAsync(url);
        await response.ShouldHaveStatusAsync(visible ? HttpStatusCode.OK : HttpStatusCode.NotFound);
    }

    // Storage layout: {root}/{ownerId}/{imageId:N}/{file}.webp
    private string[] StoredFiles(TestUser user, Guid imageId)
    {
        var folder = Path.Combine(factory.PhotoRoot, user.User.Id, imageId.ToString("N"));
        return Directory.Exists(folder)
            ? Directory.GetFiles(folder).Select(f => Path.GetFileName(f)).Order().ToArray()
            : [];
    }
}
