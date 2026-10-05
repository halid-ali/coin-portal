using System.Net;
using System.Text.Json;
using CoinPortal.Api.Contracts.Coins;
using CoinPortal.Api.Contracts.Collections;
using CoinPortal.Api.Contracts.Countries;
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

        var photo = await alice.UploadPhotoAsync(coin.Id, CoinSide.National);
        using var thumb = await alice.Client.GetAsync($"/api/coins/{coin.Id}/photos/National/Thumb?v={photo.Id}");

        await thumb.ShouldHaveStatusAsync(HttpStatusCode.OK);
        Assert.Equal("image/webp", thumb.Content.Headers.ContentType?.MediaType);
        Assert.Equal(["full.webp", "preview.webp", "thumb.webp"], StoredFiles(alice, photo.Id));
    }

    [Fact]
    public async Task Photos_AreCachedForGood()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.FirstCollectionAsync();
        var coin = await alice.CreateCoinAsync(collection.Id);
        var photo = await alice.UploadPhotoAsync(coin.Id, CoinSide.National);
        await alice.PublishAsync(collection);
        // Signed out: in tests every signed-in request renews the cookie (zero validation interval),
        // and a response that sets a cookie is marked no-cache
        using var visitor = await factory.CreateAnonymousClientAsync();

        using var thumb = await visitor.GetAsync($"/api/coins/{coin.Id}/photos/National/Thumb?v={photo.Id}");

        await thumb.ShouldHaveStatusAsync(HttpStatusCode.OK);
        Assert.Contains("immutable", thumb.Headers.CacheControl?.ToString());
    }

    [Fact]
    public async Task Images_AreCachedPrivately_AndRevalidateWithTheirETag()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.CreateCollectionAsync(visibility: CollectionVisibility.Unlisted);
        var coin = await alice.CreateCoinAsync(collection.Id);
        var photo = await alice.UploadPhotoAsync(coin.Id);
        var cover = await alice.UploadCoverAsync(collection.Id);
        using var visitor = await factory.CreateAnonymousClientAsync();

        // The share key is in the address: "private" keeps shared caches (a proxy, a CDN) from
        // storing it
        foreach (var url in new[]
                 {
                     $"/api/coins/{coin.Id}/photos/National/Thumb?v={photo.Id}&s={collection.ShareToken}",
                     $"/api/collections/{collection.Id}/cover?v={cover}&s={collection.ShareToken}",
                 })
        {
            using var first = await visitor.GetAsync(url);
            await first.ShouldHaveStatusAsync(HttpStatusCode.OK);
            var cache = first.Headers.CacheControl!;
            Assert.True(cache.Private);
            Assert.Equal(TimeSpan.FromDays(365), cache.MaxAge);
            Assert.Contains(cache.Extensions, e => e.Name == "immutable");
            using var second = await visitor.GetIfNoneMatchAsync(url, first.Headers.ETag!);

            await second.ShouldHaveStatusAsync(HttpStatusCode.NotModified);
        }
    }

    [Fact]
    public async Task Upload_TooLargeFile_IsFileTooLarge()
    {
        var alice = await factory.SignUpAsync();
        var coin = await alice.CreateCoinAsync((await alice.FirstCollectionAsync()).Id);

        // One byte over PhotoStorage:MaxUploadBytes (10 MB): rejected before it is read as an image
        using var response = await alice.Client.PutFileAsync($"/api/coins/{coin.Id}/photos/National",
            new byte[10 * 1024 * 1024 + 1]);

        Assert.Equal("file_too_large", await response.ReadProblemCodeAsync());
    }

    [Fact]
    public async Task Upload_Gif_IsRejected_ForItsFormat()
    {
        var alice = await factory.SignUpAsync();
        var coin = await alice.CreateCoinAsync((await alice.FirstCollectionAsync()).Id);

        using var response = await alice.Client.PutFileAsync($"/api/coins/{coin.Id}/photos/National",
            TestImages.Gif(200, 200), "photo.gif", "image/gif");

        Assert.Equal("invalid_image", await response.ReadProblemCodeAsync());
        // Large enough otherwise: the format is the reason
        Assert.Contains("JPEG and PNG", await ProblemTitleAsync(response));
    }

    [Fact]
    public async Task Upload_AppliesTheExifOrientation_AndDropsAllMetadata()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.FirstCollectionAsync();

        // 640x360 turned by 90°: a 360x640 picture, its 16:9 cover is 360 wide
        var cover = await alice.UploadCoverAsync(collection.Id, TestImages.PngWithExif(640, 360));
        using var response = await alice.Client.GetAsync($"/api/collections/{collection.Id}/cover?v={cover}");

        await response.ShouldHaveStatusAsync(HttpStatusCode.OK);
        var (width, height, chunks) = TestImages.ReadWebp(await response.Content.ReadAsByteArrayAsync());
        Assert.Equal(360, width);
        Assert.True(height < width);
        // No EXIF (orientation, GPS position) and no XMP in what others download
        Assert.DoesNotContain("EXIF", chunks);
        Assert.DoesNotContain("XMP ", chunks);
    }

    [Fact]
    public async Task Cover_Replace_RemovesTheOldFile_AndDelete_RemovesTheCover()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.FirstCollectionAsync();
        var first = await alice.UploadCoverAsync(collection.Id);

        var second = await alice.UploadCoverAsync(collection.Id);

        Assert.Empty(StoredFiles(alice, first));
        await alice.Client.ExpectStatusAsync($"/api/collections/{collection.Id}/cover?v={first}", HttpStatusCode.NotFound);
        Assert.Equal(second, (await alice.Client.GetJsonAsync<CollectionResponse>($"/api/collections/{collection.Id}")).CoverImageId);

        using (var delete = await alice.Client.DeleteAsync($"/api/collections/{collection.Id}/cover"))
        {
            await delete.ShouldHaveStatusAsync(HttpStatusCode.NoContent);
        }
        Assert.Empty(StoredFiles(alice, second));
        Assert.Null((await alice.Client.GetJsonAsync<CollectionResponse>($"/api/collections/{collection.Id}")).CoverImageId);
        // It no longer counts against the quota
        Assert.Equal(0, await factory.WithDbAsync(db => db.Collections
            .Where(c => c.Id == collection.Id).Select(c => c.CoverSizeBytes).SingleAsync()));
        using var again = await alice.Client.DeleteAsync($"/api/collections/{collection.Id}/cover");
        await again.ShouldHaveStatusAsync(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ImagesWithoutVersion_AreRevalidated()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.FirstCollectionAsync();
        var coin = await alice.CreateCoinAsync(collection.Id);
        await alice.UploadPhotoAsync(coin.Id, CoinSide.National);
        await alice.UploadCoverAsync(collection.Id);
        await alice.PublishAsync(collection);
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
        var first = await alice.UploadPhotoAsync(coin.Id, CoinSide.Common);

        var second = await alice.UploadPhotoAsync(coin.Id, CoinSide.Common);
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
        var national = await alice.UploadPhotoAsync(coin.Id, CoinSide.National);
        var common = await alice.UploadPhotoAsync(coin.Id, CoinSide.Common);

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
        var photo = await alice.UploadPhotoAsync(coin.Id, CoinSide.National);
        var cover = await alice.UploadCoverAsync(doomed.Id);

        using var response = await alice.Client.DeleteAsync($"/api/collections/{doomed.Id}?deleteCoins=true");

        await response.ShouldHaveStatusAsync(HttpStatusCode.NoContent);
        Assert.Empty(StoredFiles(alice, photo.Id));
        Assert.Empty(StoredFiles(alice, cover));
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
        var photo = await alice.UploadPhotoAsync(coin.Id, CoinSide.National);
        var cover = await alice.UploadCoverAsync(collection.Id);
        collection = visibility == CollectionVisibility.Public
            ? await alice.PublishAsync(collection)
            : await alice.SetVisibilityAsync(collection, visibility);
        // A valid-looking secret for the collections that have none
        var link = collection.ShareToken ?? new string('A', Collection.ShareTokenLength);
        // The key of another link-only collection opens only that one
        var otherKey = (await alice.CreateCollectionAsync(visibility: CollectionVisibility.Unlisted)).ShareToken;
        using var visitor = await factory.CreateAnonymousClientAsync();

        foreach (var url in new[]
                 {
                     $"/api/coins/{coin.Id}/photos/National/Preview?v={photo.Id}",
                     $"/api/collections/{collection.Id}/cover?v={cover}",
                 })
        {
            var linked = url + "&s=" + link;
            await ExpectVisibleAsync(alice.Client, url, true);
            await ExpectVisibleAsync(visitor, url, visibleWithoutLink);
            await ExpectVisibleAsync(bob.Client, url, visibleWithoutLink);
            await ExpectVisibleAsync(visitor, linked, visibleWithLink);
            await ExpectVisibleAsync(visitor, url + "&s=" + otherKey, visibleWithoutLink);
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
    public async Task OtherUsersCoinOrCollection_CannotReceiveOrLoseImages()
    {
        var alice = await factory.SignUpAsync();
        var bob = await factory.SignUpAsync();
        var collection = await alice.FirstCollectionAsync();
        var coin = await alice.CreateCoinAsync(collection.Id);
        var existing = await alice.UploadPhotoAsync(coin.Id, CoinSide.Common);
        var existingCover = await alice.UploadCoverAsync(collection.Id);

        using var photo = await bob.Client.PutFileAsync($"/api/coins/{coin.Id}/photos/National", Photo);
        using var cover = await bob.Client.PutFileAsync($"/api/collections/{collection.Id}/cover",
            TestImages.Png(640, 360));
        using var deletePhoto = await bob.Client.DeleteAsync($"/api/coins/{coin.Id}/photos/Common");
        using var deleteCover = await bob.Client.DeleteAsync($"/api/collections/{collection.Id}/cover");

        await photo.ShouldHaveStatusAsync(HttpStatusCode.NotFound);
        await cover.ShouldHaveStatusAsync(HttpStatusCode.NotFound);
        await deletePhoto.ShouldHaveStatusAsync(HttpStatusCode.NotFound);
        await deleteCover.ShouldHaveStatusAsync(HttpStatusCode.NotFound);
        Assert.NotEmpty(StoredFiles(alice, existing.Id));
        Assert.NotEmpty(StoredFiles(alice, existingCover));
    }

    [Fact]
    public async Task Countries_AreListedForEveryone_ByCode()
    {
        using var visitor = await factory.CreateAnonymousClientAsync();

        var countries = await visitor.GetJsonAsync<List<CountryResponse>>("/api/countries");

        Assert.Contains(countries, c => c.Code == "DE");
        Assert.Equal(countries.Select(c => c.Code).Order(StringComparer.Ordinal), countries.Select(c => c.Code));
    }

    private static async Task<string?> ProblemTitleAsync(HttpResponseMessage response)
    {
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return json.RootElement.GetProperty("title").GetString();
    }

    private static Task ExpectVisibleAsync(ApiClient client, string url, bool visible) =>
        client.ExpectStatusAsync(url, visible ? HttpStatusCode.OK : HttpStatusCode.NotFound);

    // Storage layout: {root}/{ownerId}/{imageId:N}/{file}.webp
    private string[] StoredFiles(TestUser user, Guid imageId)
    {
        var folder = Path.Combine(factory.PhotoRoot, user.User.Id, imageId.ToString("N"));
        return Directory.Exists(folder)
            ? Directory.GetFiles(folder).Select(f => Path.GetFileName(f)).Order().ToArray()
            : [];
    }
}
