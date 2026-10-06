using System.Net;
using System.Text.Json;
using CoinPortal.Api.Contracts.Coins;
using CoinPortal.Api.Contracts.Collections;
using CoinPortal.Api.Contracts.Common;
using CoinPortal.Api.Data;
using CoinPortal.Api.Tests.Infrastructure;

namespace CoinPortal.Api.Tests;

/// <summary>
/// The rule of Public collections (PublicationRules): a national side photo of every coin and at
/// least <see cref="CoinPortalFactory.MinPublicCoins"/> such coins. Raised minimums are in
/// <see cref="SiteSettingsTests"/>.
/// </summary>
public class PublicationTests(CoinPortalFactory factory)
{
    private const int Min = CoinPortalFactory.MinPublicCoins;

    [Fact]
    public async Task Publish_NeedsANationalSidePhotoOfEveryCoin_AndTheMinimum()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.FirstCollectionAsync();

        await ExpectRequirementsAsync(alice, collection, coins: 0, photographed: 0);
        await alice.CreatePhotographedCoinAsync(collection.Id);
        await ExpectRequirementsAsync(alice, collection, coins: 1, photographed: 1);
        // The common side alone does not count: it looks the same in every country
        var commonOnly = await alice.CreateCoinAsync(collection.Id);
        await alice.UploadPhotoAsync(commonOnly.Id, CoinSide.Common);
        await ExpectRequirementsAsync(alice, collection, coins: 2, photographed: 1);

        await alice.UploadPhotoAsync(commonOnly.Id, CoinSide.National);
        var published = await alice.SetVisibilityAsync(collection, CollectionVisibility.Public);

        Assert.Equal(CollectionVisibility.Public, published.Visibility);
        Assert.Equal((2, 2, Min, true),
            (published.CoinCount, published.PhotographedCoinCount, published.MinPublicCoins, published.CanBePublic));
    }

    [Fact]
    public async Task PublishEndpoint_OnlyChangesTheVisibility_AndEndsTheShareLink()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.CreateCollectionAsync(visibility: CollectionVisibility.Unlisted);
        for (var i = 0; i < Min; i++)
        {
            await alice.CreatePhotographedCoinAsync(collection.Id);
        }
        var ready = await GetAsync(alice, collection);
        // Renamed in another tab: the page that publishes still holds the old name
        await alice.SetVisibilityAsync(ready with { Name = "Renamed elsewhere" }, CollectionVisibility.Unlisted);
        using var visitor = await factory.CreateAnonymousClientAsync();

        using var response = await alice.Client.PostAsync($"/api/collections/{collection.Id}/publish");
        var published = await response.ReadJsonAsync<CollectionResponse>();

        Assert.True(ready.CanBePublic);
        Assert.Equal((CollectionVisibility.Public, "Renamed elsewhere", (string?)null),
            (published.Visibility, published.Name, published.ShareToken));
        await visitor.ExpectStatusAsync($"/api/public/collections/{collection.Id}", HttpStatusCode.OK);
        await visitor.ExpectStatusAsync($"/api/public/shared/{ready.ShareToken}", HttpStatusCode.NotFound);

        // Again: already Public, returned as it is
        using var again = await alice.Client.PostAsync($"/api/collections/{collection.Id}/publish");
        Assert.Equal(CollectionVisibility.Public, (await again.ReadJsonAsync<CollectionResponse>()).Visibility);
    }

    [Fact]
    public async Task PublishEndpoint_OtherUsersCollection_Is404_AndAnonymousIs401()
    {
        var alice = await factory.SignUpAsync();
        var bob = await factory.SignUpAsync();
        var bobs = await bob.FirstCollectionAsync();
        for (var i = 0; i < Min; i++)
        {
            await bob.CreatePhotographedCoinAsync(bobs.Id);
        }
        using var visitor = await factory.CreateAnonymousClientAsync();

        using var byAlice = await alice.Client.PostAsync($"/api/collections/{bobs.Id}/publish");
        using var anonymous = await visitor.PostAsync($"/api/collections/{bobs.Id}/publish", null);

        await byAlice.ShouldHaveStatusAsync(HttpStatusCode.NotFound);
        await anonymous.ShouldHaveStatusAsync(HttpStatusCode.Unauthorized);
        Assert.Equal(CollectionVisibility.Private, (await GetAsync(bob, bobs)).Visibility);
    }

    [Fact]
    public async Task NewCollection_CannotStartPublic()
    {
        var alice = await factory.SignUpAsync();

        using var response = await alice.Client.PostAsync("/api/collections",
            new CollectionUpsertRequest { Name = "Straight to public", Visibility = CollectionVisibility.Public });

        Assert.Equal("public_requirements", await response.ReadProblemCodeAsync());
        Assert.DoesNotContain(await alice.Client.GetJsonAsync<List<CollectionResponse>>("/api/collections"),
            c => c.Name == "Straight to public");
    }

    [Fact]
    public async Task PrivateAndUnlistedCollections_HaveNoRequirements()
    {
        var alice = await factory.SignUpAsync();
        var unlisted = await alice.CreateCollectionAsync(visibility: CollectionVisibility.Unlisted);
        var coin = await alice.CreateCoinAsync(unlisted.Id);
        var photographed = await alice.CreatePhotographedCoinAsync(unlisted.Id);

        using (var deletePhoto = await alice.Client.DeleteAsync($"/api/coins/{photographed.Id}/photos/National"))
        {
            await deletePhoto.ShouldHaveStatusAsync(HttpStatusCode.NoContent);
        }
        using (var deleteCoin = await alice.Client.DeleteAsync($"/api/coins/{coin.Id}"))
        {
            await deleteCoin.ShouldHaveStatusAsync(HttpStatusCode.NoContent);
        }
        var madePrivate = await alice.SetVisibilityAsync(unlisted, CollectionVisibility.Private);

        Assert.Equal(CollectionVisibility.Private, madePrivate.Visibility);
        Assert.Equal((1, 0), (madePrivate.CoinCount, madePrivate.PhotographedCoinCount));
    }

    [Fact]
    public async Task CoinWithoutPhoto_InAPublicCollection_NeedsConfirmation_AndUnpublishesIt()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.CreatePublicCollectionAsync();
        using var visitor = await factory.CreateAnonymousClientAsync();

        using (var refused = await alice.Client.PostAsync("/api/coins", TestUser.NewCoin(collection.Id, "No photo")))
        {
            await ExpectWouldUnpublishAsync(refused, collection);
        }
        Assert.Equal(Min, (await GetAsync(alice, collection)).CoinCount);

        using (var confirmed = await alice.Client.PostAsync("/api/coins?unpublish=true",
                   TestUser.NewCoin(collection.Id, "No photo")))
        {
            await confirmed.ShouldHaveStatusAsync(HttpStatusCode.Created);
        }
        var after = await GetAsync(alice, collection);
        Assert.Equal(CollectionVisibility.Unlisted, after.Visibility);
        Assert.NotNull(after.ShareToken);
        Assert.Equal(Min + 1, after.CoinCount);
        await visitor.ExpectStatusAsync($"/api/public/collections/{collection.Id}", HttpStatusCode.NotFound);
        await visitor.ExpectStatusAsync($"/api/public/shared/{after.ShareToken}", HttpStatusCode.OK);
    }

    [Fact]
    public async Task CoinWithItsPhotos_JoinsAPublicCollection_InOneRequest()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.CreatePublicCollectionAsync();
        using var visitor = await factory.CreateAnonymousClientAsync();

        using var created = await alice.Client.PostCoinWithPhotosAsync("/api/coins/with-photos",
            TestUser.NewCoin(collection.Id, "Both sides"), national: TestImages.Png(200, 160),
            common: TestImages.Png(300, 300));
        using var commonOnly = await alice.Client.PostCoinWithPhotosAsync("/api/coins/with-photos",
            TestUser.NewCoin(collection.Id, "Common side only"), common: TestImages.Png(200, 160));

        await created.ShouldHaveStatusAsync(HttpStatusCode.Created);
        var coin = await created.ReadJsonAsync<CoinResponse>();
        Assert.Equal([CoinSide.National, CoinSide.Common], coin.Photos.Select(p => p.Side));
        Assert.Equal("Both sides", coin.Title);
        await ExpectWouldUnpublishAsync(commonOnly, collection);
        Assert.Equal(CollectionVisibility.Public, (await GetAsync(alice, collection)).Visibility);
        var national = coin.Photos[0];
        await visitor.ExpectStatusAsync($"/api/coins/{coin.Id}/photos/National/Thumb?v={national.Id}", HttpStatusCode.OK);
    }

    [Fact]
    public async Task CoinWithPhotos_IsSavedWithAllOfThem_OrNotAtAll()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.FirstCollectionAsync();

        using var badPhoto = await alice.Client.PostCoinWithPhotosAsync("/api/coins/with-photos",
            TestUser.NewCoin(collection.Id), national: TestImages.Png(200, 160), common: TestImages.NotAnImage());
        using var badCoin = await alice.Client.PostCoinWithPhotosAsync("/api/coins/with-photos",
            TestUser.NewCoin(collection.Id, title: ""), national: TestImages.Png(200, 160));
        using var notJson = await alice.Client.SendAsync(HttpMethod.Post, "/api/coins/with-photos",
            new MultipartFormDataContent { { new StringContent("{ not json"), "coin" } });
        // Enums by name only, as in the JSON endpoint
        using var numericEnum = await alice.Client.SendAsync(HttpMethod.Post, "/api/coins/with-photos",
            new MultipartFormDataContent
            {
                {
                    new StringContent($$"""{"collectionId":{{collection.Id}},"title":"x","countryCode":"DE","year":2006,"denomination":200}"""),
                    "coin"
                },
            });

        Assert.Equal("invalid_image", await badPhoto.ReadProblemCodeAsync());
        Assert.Contains("Title", await badCoin.ReadValidationKeysAsync());
        Assert.Contains("coin", await notJson.ReadValidationKeysAsync());
        Assert.Contains("coin", await numericEnum.ReadValidationKeysAsync());
        Assert.Equal(0, (await GetAsync(alice, collection)).CoinCount);
        // Every image is processed first; files are written only when all of them are good
        var folder = Path.Combine(factory.PhotoRoot, alice.User.Id);
        Assert.True(!Directory.Exists(folder) || Directory.GetFileSystemEntries(folder).Length == 0);
    }

    [Fact]
    public async Task PhotoErrors_OfACoinWithPhotos_NameTheSide()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.FirstCollectionAsync();

        using var response = await alice.Client.PostCoinWithPhotosAsync("/api/coins/with-photos",
            TestUser.NewCoin(collection.Id), common: TestImages.NotAnImage());

        await response.ShouldHaveStatusAsync(HttpStatusCode.BadRequest);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(("invalid_image", "Common"),
            (json.RootElement.GetProperty("code").GetString(), json.RootElement.GetProperty("side").GetString()));
    }

    [Fact]
    public async Task RemovingTheNationalSidePhoto_InAPublicCollection_NeedsConfirmation()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.CreatePublicCollectionAsync();
        var coin = (await CoinsAsync(alice, collection)).First();
        await alice.UploadPhotoAsync(coin.Id, CoinSide.Common);

        // The common side is not needed
        using (var common = await alice.Client.DeleteAsync($"/api/coins/{coin.Id}/photos/Common"))
        {
            await common.ShouldHaveStatusAsync(HttpStatusCode.NoContent);
        }
        using (var refused = await alice.Client.DeleteAsync($"/api/coins/{coin.Id}/photos/National"))
        {
            await ExpectWouldUnpublishAsync(refused, collection);
        }
        Assert.Single((await alice.Client.GetJsonAsync<CoinResponse>($"/api/coins/{coin.Id}")).Photos);

        using (var confirmed = await alice.Client.DeleteAsync($"/api/coins/{coin.Id}/photos/National?unpublish=true"))
        {
            await confirmed.ShouldHaveStatusAsync(HttpStatusCode.NoContent);
        }
        Assert.Empty((await alice.Client.GetJsonAsync<CoinResponse>($"/api/coins/{coin.Id}")).Photos);
        Assert.Equal(CollectionVisibility.Unlisted, (await GetAsync(alice, collection)).Visibility);
    }

    [Fact]
    public async Task DeletingCoins_BelowTheMinimum_NeedsConfirmation()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.CreatePublicCollectionAsync();
        var extra = await alice.CreatePhotographedCoinAsync(collection.Id);
        var unphotographedElsewhere = await alice.CreateCoinAsync((await alice.FirstCollectionAsync()).Id);

        // Still at the minimum afterwards
        using (var first = await alice.Client.DeleteAsync($"/api/coins/{extra.Id}"))
        {
            await first.ShouldHaveStatusAsync(HttpStatusCode.NoContent);
        }
        var next = (await CoinsAsync(alice, collection)).First();
        using (var refused = await alice.Client.DeleteAsync($"/api/coins/{next.Id}"))
        {
            await ExpectWouldUnpublishAsync(refused, collection);
        }
        using (var other = await alice.Client.DeleteAsync($"/api/coins/{unphotographedElsewhere.Id}"))
        {
            await other.ShouldHaveStatusAsync(HttpStatusCode.NoContent);
        }
        using (var confirmed = await alice.Client.DeleteAsync($"/api/coins/{next.Id}?unpublish=true"))
        {
            await confirmed.ShouldHaveStatusAsync(HttpStatusCode.NoContent);
        }

        var after = await GetAsync(alice, collection);
        Assert.Equal((CollectionVisibility.Unlisted, Min - 1), (after.Visibility, after.CoinCount));
    }

    [Fact]
    public async Task MovingCoins_KeepsBothCollectionsWithinTheRule()
    {
        var alice = await factory.SignUpAsync();
        var shown = await alice.CreatePublicCollectionAsync();
        var drawer = await alice.FirstCollectionAsync();
        var unphotographed = await alice.CreateCoinAsync(drawer.Id, "No photo");
        var photographed = await alice.CreatePhotographedCoinAsync(drawer.Id, "With photo");

        // Into the public one: only with photos
        using (var refused = await alice.Client.PutAsync($"/api/coins/{unphotographed.Id}",
                   TestUser.NewCoin(shown.Id, "No photo")))
        {
            await ExpectWouldUnpublishAsync(refused, shown);
        }
        using (var movedIn = await alice.Client.PutAsync($"/api/coins/{photographed.Id}",
                   TestUser.NewCoin(shown.Id, "With photo")))
        {
            await movedIn.ShouldHaveStatusAsync(HttpStatusCode.OK);
        }

        // Out of it: down to the minimum, not below
        var inShown = await CoinsAsync(alice, shown);
        using (var movedOut = await alice.Client.PutAsync($"/api/coins/{inShown[0].Id}", TestUser.NewCoin(drawer.Id)))
        {
            await movedOut.ShouldHaveStatusAsync(HttpStatusCode.OK);
        }
        using (var refused = await alice.Client.PutAsync($"/api/coins/{inShown[1].Id}", TestUser.NewCoin(drawer.Id)))
        {
            await ExpectWouldUnpublishAsync(refused, shown);
        }
        // Editing a coin in place changes nothing about the rule
        using (var edited = await alice.Client.PutAsync($"/api/coins/{inShown[1].Id}", TestUser.NewCoin(shown.Id, "Renamed")))
        {
            await edited.ShouldHaveStatusAsync(HttpStatusCode.OK);
        }
        Assert.Equal(CollectionVisibility.Public, (await GetAsync(alice, shown)).Visibility);

        using (var confirmed = await alice.Client.PutAsync($"/api/coins/{inShown[1].Id}?unpublish=true",
                   TestUser.NewCoin(drawer.Id)))
        {
            await confirmed.ShouldHaveStatusAsync(HttpStatusCode.OK);
        }
        Assert.Equal(CollectionVisibility.Unlisted, (await GetAsync(alice, shown)).Visibility);
    }

    [Fact]
    public async Task DeletingACollection_IntoAPublicOne_MovesOnlyPhotographedCoinsWithoutConfirmation()
    {
        var alice = await factory.SignUpAsync();
        var shown = await alice.CreatePublicCollectionAsync();
        var withPhotos = await alice.CreateCollectionAsync();
        await alice.CreatePhotographedCoinAsync(withPhotos.Id);
        var mixed = await alice.CreateCollectionAsync();
        await alice.CreatePhotographedCoinAsync(mixed.Id);
        await alice.CreateCoinAsync(mixed.Id, "No photo");

        using (var moved = await alice.Client.DeleteAsync($"/api/collections/{withPhotos.Id}?moveTo={shown.Id}"))
        {
            await moved.ShouldHaveStatusAsync(HttpStatusCode.NoContent);
        }
        var afterMove = await GetAsync(alice, shown);
        Assert.Equal((CollectionVisibility.Public, Min + 1), (afterMove.Visibility, afterMove.CoinCount));

        using (var refused = await alice.Client.DeleteAsync($"/api/collections/{mixed.Id}?moveTo={shown.Id}"))
        {
            await ExpectWouldUnpublishAsync(refused, shown);
        }
        await alice.Client.ExpectStatusAsync($"/api/collections/{mixed.Id}", HttpStatusCode.OK);

        using (var confirmed = await alice.Client.DeleteAsync(
                   $"/api/collections/{mixed.Id}?moveTo={shown.Id}&unpublish=true"))
        {
            await confirmed.ShouldHaveStatusAsync(HttpStatusCode.NoContent);
        }
        var after = await GetAsync(alice, shown);
        Assert.Equal((CollectionVisibility.Unlisted, Min + 3), (after.Visibility, after.CoinCount));
        Assert.NotNull(after.ShareToken);
    }

    [Fact]
    public async Task OtherUsersCollection_IsNotReportedByTheGuard()
    {
        var alice = await factory.SignUpAsync();
        var bob = await factory.SignUpAsync();
        var bobsPublic = await bob.CreatePublicCollectionAsync();

        // Someone else's collection stays a 404, whatever its rule would say
        using var response = await alice.Client.PostAsync("/api/coins", TestUser.NewCoin(bobsPublic.Id));

        Assert.Contains("CollectionId", await response.ReadValidationKeysAsync());
        Assert.Equal(CollectionVisibility.Public, (await GetAsync(bob, bobsPublic)).Visibility);
    }

    [Fact]
    public async Task CoinList_FiltersByPhotos()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.FirstCollectionAsync();
        var none = await alice.CreateCoinAsync(collection.Id, "None");
        var commonOnly = await alice.CreateCoinAsync(collection.Id, "Common only");
        await alice.UploadPhotoAsync(commonOnly.Id, CoinSide.Common);
        var national = await alice.CreatePhotographedCoinAsync(collection.Id, "National");

        var without = await alice.Client.GetJsonAsync<PagedResponse<CoinResponse>>(
            $"/api/coins?collectionId={collection.Id}&photographed=false");
        var with = await alice.Client.GetJsonAsync<PagedResponse<CoinResponse>>(
            $"/api/coins?collectionId={collection.Id}&photographed=true");

        Assert.Equal(new[] { none.Id, commonOnly.Id }.Order(), without.Items.Select(c => c.Id).Order());
        Assert.Equal(national.Id, Assert.Single(with.Items).Id);
    }

    // Both ways to publish refuse it with the same counts: the form's PUT and the publish endpoint
    private static async Task ExpectRequirementsAsync(TestUser user, CollectionResponse collection, int coins,
        int photographed)
    {
        using var put = await user.Client.PutAsync($"/api/collections/{collection.Id}", new CollectionUpsertRequest
        {
            Name = collection.Name,
            Visibility = CollectionVisibility.Public,
        });
        await ExpectRequirementsProblemAsync(put, coins, photographed);
        using var publish = await user.Client.PostAsync($"/api/collections/{collection.Id}/publish");
        await ExpectRequirementsProblemAsync(publish, coins, photographed);

        var current = await GetAsync(user, collection);
        Assert.Equal((CollectionVisibility.Private, coins, photographed, false),
            (current.Visibility, current.CoinCount, current.PhotographedCoinCount, current.CanBePublic));
    }

    private static async Task ExpectRequirementsProblemAsync(HttpResponseMessage response, int coins, int photographed)
    {
        await response.ShouldHaveStatusAsync(HttpStatusCode.BadRequest);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var root = json.RootElement;
        Assert.Equal("public_requirements", root.GetProperty("code").GetString());
        Assert.Equal((coins, photographed, Min), (root.GetProperty("coinCount").GetInt32(),
            root.GetProperty("photographedCoinCount").GetInt32(), root.GetProperty("minPublicCoins").GetInt32()));
    }

    private static async Task ExpectWouldUnpublishAsync(HttpResponseMessage response, CollectionResponse collection)
    {
        await response.ShouldHaveStatusAsync(HttpStatusCode.Conflict);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("would_unpublish", json.RootElement.GetProperty("code").GetString());
        var broken = Assert.Single(json.RootElement.GetProperty("collections").EnumerateArray());
        Assert.Equal((collection.Id, collection.Name),
            (broken.GetProperty("id").GetInt32(), broken.GetProperty("name").GetString()));
    }

    private static Task<CollectionResponse> GetAsync(TestUser user, CollectionResponse collection) =>
        user.Client.GetJsonAsync<CollectionResponse>($"/api/collections/{collection.Id}");

    private static async Task<IReadOnlyList<CoinResponse>> CoinsAsync(TestUser user, CollectionResponse collection) =>
        (await user.Client.GetJsonAsync<PagedResponse<CoinResponse>>($"/api/coins?collectionId={collection.Id}")).Items;
}
