using System.Net;
using CoinPortal.Api.Contracts.Coins;
using CoinPortal.Api.Contracts.Collections;
using CoinPortal.Api.Contracts.Common;
using CoinPortal.Api.Data;
using CoinPortal.Api.Tests.Infrastructure;

namespace CoinPortal.Api.Tests;

public class CollectionsTests(CoinPortalFactory factory)
{
    [Fact]
    public async Task OtherUsersCollection_LooksMissing()
    {
        var alice = await factory.SignUpAsync();
        var bob = await factory.SignUpAsync();
        var aliceCollection = await alice.FirstCollectionAsync();
        var url = $"/api/collections/{aliceCollection.Id}";

        using var get = await bob.Client.GetAsync(url);
        using var put = await bob.Client.PutAsync(url, new CollectionUpsertRequest { Name = "Taken over" });
        using var delete = await bob.Client.DeleteAsync(url);
        using var shareToken = await bob.Client.PostAsync(url + "/share-token");
        using var coins = await bob.Client.GetAsync($"/api/coins?collectionId={aliceCollection.Id}");

        await get.ShouldHaveStatusAsync(HttpStatusCode.NotFound);
        await put.ShouldHaveStatusAsync(HttpStatusCode.NotFound);
        await delete.ShouldHaveStatusAsync(HttpStatusCode.NotFound);
        await shareToken.ShouldHaveStatusAsync(HttpStatusCode.NotFound);
        await coins.ShouldHaveStatusAsync(HttpStatusCode.NotFound);
        Assert.Equal(aliceCollection.Name, (await alice.FirstCollectionAsync()).Name);
    }

    [Fact]
    public async Task List_ShowsOnlyOwnCollectionsWithCoinCounts()
    {
        var alice = await factory.SignUpAsync();
        var bob = await factory.SignUpAsync();
        var first = await alice.FirstCollectionAsync();
        await alice.CreateCoinAsync(first.Id);
        await alice.CreateCoinAsync(first.Id);
        var second = await alice.CreateCollectionAsync();
        await bob.CreateCollectionAsync();

        var collections = await alice.Client.GetJsonAsync<List<CollectionResponse>>("/api/collections");

        Assert.Equal([first.Id, second.Id], collections.Select(c => c.Id));
        Assert.Equal([2, 0], collections.Select(c => c.CoinCount));
    }

    [Theory]
    [InlineData("liste", "LİSTE")] // Turkish dotted capital I
    [InlineData("LIMAN", "lıman")] // Turkish dotless small i
    [InlineData("list", "LIST")] // culture-independent casing
    [InlineData("Liste", "  liste  ")] // trimmed
    public async Task Create_NameTakenIgnoringCase_IsDuplicateName(string existing, string requested)
    {
        var alice = await factory.SignUpAsync();
        await alice.CreateCollectionAsync(existing);

        using var response = await alice.Client.PostAsync("/api/collections",
            new CollectionUpsertRequest { Name = requested });

        Assert.Contains("DuplicateName", await response.ReadValidationKeysAsync());
    }

    [Fact]
    public async Task Rename_ToAnotherOwnCollectionsName_IsDuplicateName()
    {
        var alice = await factory.SignUpAsync();
        var first = await alice.FirstCollectionAsync();
        await alice.CreateCollectionAsync("Second");

        using var response = await alice.Client.PutAsync($"/api/collections/{first.Id}",
            new CollectionUpsertRequest { Name = "second" });

        Assert.Contains("DuplicateName", await response.ReadValidationKeysAsync());
    }

    [Theory]
    [InlineData("blankName", "Name")]
    [InlineData("longName", "Name")]
    [InlineData("longDescription", "Description")]
    public async Task Create_OutsideTheLimits_IsRejected(string field, string key)
    {
        var alice = await factory.SignUpAsync();
        var request = new CollectionUpsertRequest
        {
            Name = field switch
            {
                "blankName" => "   ",
                "longName" => new string('x', Collection.NameMaxLength + 1),
                _ => "Fine",
            },
            Description = field == "longDescription" ? new string('x', Collection.DescriptionMaxLength + 1) : null,
        };

        using var response = await alice.Client.PostAsync("/api/collections", request);

        Assert.Equal([key], await response.ReadValidationKeysAsync());
    }

    [Fact]
    public async Task Update_WithoutVisibility_KeepsIt()
    {
        var alice = await factory.SignUpAsync();
        var shared = await alice.SetVisibilityAsync(await alice.FirstCollectionAsync(), CollectionVisibility.Unlisted);

        using var response = await alice.Client.PutAsync($"/api/collections/{shared.Id}",
            new CollectionUpsertRequest { Name = "Renamed" });

        var updated = await response.ReadJsonAsync<CollectionResponse>();
        Assert.Equal(("Renamed", CollectionVisibility.Unlisted, shared.ShareToken),
            (updated.Name, updated.Visibility, updated.ShareToken));
    }

    [Fact]
    public async Task Create_NameOfAnotherUsersCollection_IsAllowed()
    {
        var alice = await factory.SignUpAsync();
        var bob = await factory.SignUpAsync();
        await alice.CreateCollectionAsync("Shared name");

        var bobs = await bob.CreateCollectionAsync("Shared name");

        Assert.Equal("Shared name", bobs.Name);
    }

    [Fact]
    public async Task Delete_LastCollection_IsRefused()
    {
        var alice = await factory.SignUpAsync();
        var only = await alice.FirstCollectionAsync();

        using var response = await alice.Client.DeleteAsync($"/api/collections/{only.Id}");

        Assert.Equal("last_collection", await response.ReadProblemCodeAsync());
    }

    [Fact]
    public async Task Delete_WithMoveTo_MovesTheCoins()
    {
        var alice = await factory.SignUpAsync();
        var target = await alice.FirstCollectionAsync();
        var doomed = await alice.CreateCollectionAsync();
        var coin = await alice.CreateCoinAsync(doomed.Id);
        var photo = await alice.UploadPhotoAsync(coin.Id);
        var cover = await alice.UploadCoverAsync(doomed.Id);

        using var response = await alice.Client.DeleteAsync($"/api/collections/{doomed.Id}?moveTo={target.Id}");

        await response.ShouldHaveStatusAsync(HttpStatusCode.NoContent);
        var moved = await alice.Client.GetJsonAsync<CoinResponse>($"/api/coins/{coin.Id}");
        Assert.Equal(target.Id, moved.CollectionId);
        // The coin keeps its photo; the cover goes with the collection
        Assert.Equal(photo.Id, Assert.Single(moved.Photos).Id);
        Assert.True(Directory.Exists(Path.Combine(factory.PhotoRoot, alice.User.Id, photo.Id.ToString("N"))));
        Assert.False(Directory.Exists(Path.Combine(factory.PhotoRoot, alice.User.Id, cover.ToString("N"))));
    }

    [Fact]
    public async Task Delete_WithCoins_NeedsAChoice()
    {
        var alice = await factory.SignUpAsync();
        await alice.FirstCollectionAsync();
        var full = await alice.CreateCollectionAsync();
        var coin = await alice.CreateCoinAsync(full.Id);
        var empty = await alice.CreateCollectionAsync();

        // A page opened before the coin was added must not delete it by accident
        using var refused = await alice.Client.DeleteAsync($"/api/collections/{full.Id}");
        using var emptyOne = await alice.Client.DeleteAsync($"/api/collections/{empty.Id}");

        Assert.Equal("has_coins", await refused.ReadProblemCodeAsync(HttpStatusCode.Conflict));
        using var kept = await alice.Client.GetAsync($"/api/coins/{coin.Id}");
        await kept.ShouldHaveStatusAsync(HttpStatusCode.OK);
        await emptyOne.ShouldHaveStatusAsync(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task Delete_AtTheSameTime_NeverRemovesTheLastCollection()
    {
        for (var round = 0; round < 5; round++)
        {
            var alice = await factory.SignUpAsync();
            var first = await alice.FirstCollectionAsync();
            var second = await alice.CreateCollectionAsync();

            var responses = await Task.WhenAll(
                alice.Client.DeleteAsync($"/api/collections/{first.Id}"),
                alice.Client.DeleteAsync($"/api/collections/{second.Id}"));

            Assert.Single(responses, r => r.StatusCode == HttpStatusCode.NoContent);
            Assert.Single(await alice.Client.GetJsonAsync<List<CollectionResponse>>("/api/collections"));
            foreach (var response in responses)
            {
                response.Dispose();
            }
        }
    }

    [Fact]
    public async Task Delete_WithDeleteCoins_DeletesTheCoins()
    {
        var alice = await factory.SignUpAsync();
        var kept = await alice.FirstCollectionAsync();
        var keptCoin = await alice.CreateCoinAsync(kept.Id);
        var doomed = await alice.CreateCollectionAsync();
        var coin = await alice.CreateCoinAsync(doomed.Id);

        using var response = await alice.Client.DeleteAsync($"/api/collections/{doomed.Id}?deleteCoins=true");

        await response.ShouldHaveStatusAsync(HttpStatusCode.NoContent);
        using var deletedCoin = await alice.Client.GetAsync($"/api/coins/{coin.Id}");
        await deletedCoin.ShouldHaveStatusAsync(HttpStatusCode.NotFound);
        var remaining = await alice.Client.GetJsonAsync<PagedResponse<CoinResponse>>("/api/coins");
        Assert.Equal(keptCoin.Id, Assert.Single(remaining.Items).Id);
    }

    [Fact]
    public async Task Delete_MoveToItselfOrAnotherUsersCollection_IsInvalidTarget()
    {
        var alice = await factory.SignUpAsync();
        var bob = await factory.SignUpAsync();
        await alice.FirstCollectionAsync();
        var doomed = await alice.CreateCollectionAsync();
        var bobs = await bob.FirstCollectionAsync();

        using var toItself = await alice.Client.DeleteAsync($"/api/collections/{doomed.Id}?moveTo={doomed.Id}");
        using var toBob = await alice.Client.DeleteAsync($"/api/collections/{doomed.Id}?moveTo={bobs.Id}");

        Assert.Equal("invalid_target", await toItself.ReadProblemCodeAsync());
        Assert.Equal("invalid_target", await toBob.ReadProblemCodeAsync());
    }

    [Fact]
    public async Task SignedOut_CannotUseCollections()
    {
        using var client = await factory.CreateAnonymousClientAsync();

        using var list = await client.GetAsync("/api/collections");
        using var create = await client.PostAsync("/api/collections", new CollectionUpsertRequest { Name = "x" });

        await list.ShouldHaveStatusAsync(HttpStatusCode.Unauthorized);
        await create.ShouldHaveStatusAsync(HttpStatusCode.Unauthorized);
    }
}
