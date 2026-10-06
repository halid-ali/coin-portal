using System.Net;
using CoinPortal.Api.Contracts.Coins;
using CoinPortal.Api.Contracts.Collections;
using CoinPortal.Api.Contracts.Common;
using CoinPortal.Api.Contracts.Public;
using CoinPortal.Api.Data;
using CoinPortal.Api.Tests.Infrastructure;

namespace CoinPortal.Api.Tests;

/// <summary>
/// The read-only views for others (api/public): what each visibility reveals, and that anything
/// not visible is a 404.
/// </summary>
public class VisibilityTests(CoinPortalFactory factory)
{
    [Fact]
    public async Task PrivateCollection_IsInvisibleToOthers()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.FirstCollectionAsync();
        await alice.CreateCoinAsync(collection.Id);
        using var visitor = await factory.CreateAnonymousClientAsync();

        using var get = await visitor.GetAsync($"/api/public/collections/{collection.Id}");
        using var coins = await visitor.GetAsync($"/api/public/collections/{collection.Id}/coins");
        using var profile = await visitor.GetAsync($"/api/public/users/{alice.UserName}");
        var collectors = await visitor.GetJsonAsync<List<CollectorResponse>>("/api/public/collectors");
        var explore = await visitor.GetJsonAsync<PagedResponse<ExploreCoinResponse>>(
            $"/api/public/coins?owner={alice.UserName}");

        await get.ShouldHaveStatusAsync(HttpStatusCode.NotFound);
        await coins.ShouldHaveStatusAsync(HttpStatusCode.NotFound);
        await profile.ShouldHaveStatusAsync(HttpStatusCode.NotFound);
        Assert.DoesNotContain(collectors, c => c.UserName == alice.UserName);
        Assert.Empty(explore.Items);
    }

    [Fact]
    public async Task PublicCollection_IsVisibleSignedOut()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.FirstCollectionAsync();
        await alice.CreatePhotographedCoinAsync(collection.Id, "Visible");
        collection = await alice.PublishAsync(collection);
        var hidden = await alice.CreateCollectionAsync();
        await alice.CreateCoinAsync(hidden.Id, "Hidden");
        using var visitor = await factory.CreateAnonymousClientAsync();

        var get = await visitor.GetJsonAsync<PublicCollectionResponse>($"/api/public/collections/{collection.Id}");
        var coins = await visitor.GetJsonAsync<PagedResponse<CoinResponse>>(
            $"/api/public/collections/{collection.Id}/coins");
        var profile = await visitor.GetJsonAsync<PublicProfileResponse>(
            $"/api/public/users/{alice.UserName.ToUpperInvariant()}");
        var collector = (await visitor.GetJsonAsync<List<CollectorResponse>>("/api/public/collectors"))
            .Single(c => c.UserName == alice.UserName);
        var explore = await visitor.GetJsonAsync<PagedResponse<ExploreCoinResponse>>(
            $"/api/public/coins?owner={alice.UserName}");

        const int coinCount = CoinPortalFactory.MinPublicCoins;
        Assert.Equal(alice.UserName, get.OwnerUserName);
        Assert.Equal(coinCount, coins.Items.Count);
        Assert.Contains(coins.Items, c => c.Title == "Visible");
        Assert.Equal(alice.UserName, profile.UserName); // stored spelling, not the URL's
        Assert.Equal(collection.Id, Assert.Single(profile.Collections).Id);
        Assert.Equal((1, coinCount), (collector.CollectionCount, collector.CoinCount));
        Assert.Equal(coinCount, explore.Items.Count);
        Assert.DoesNotContain(explore.Items, c => c.Title == "Hidden");
    }

    [Fact]
    public async Task Explore_ListsCoinWithItsCollectionOwnerAndPhotos()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.FirstCollectionAsync();
        var coin = await alice.CreateCoinAsync(collection.Id, "Visible");
        // Uploaded in reverse order: the list keeps the side order
        var common = await alice.UploadPhotoAsync(coin.Id, CoinSide.Common);
        var national = await alice.UploadPhotoAsync(coin.Id, CoinSide.National);
        collection = await alice.PublishAsync(collection);
        using var visitor = await factory.CreateAnonymousClientAsync();

        var explore = await visitor.GetJsonAsync<PagedResponse<ExploreCoinResponse>>(
            $"/api/public/coins?owner={alice.UserName}");

        var item = Assert.Single(explore.Items, c => c.Id == coin.Id);
        Assert.Equal((coin.Id, collection.Id, collection.Name, alice.UserName),
            (item.Id, item.CollectionId, item.CollectionName, item.OwnerUserName));
        Assert.Equal([national, common], item.Photos);
    }

    [Fact]
    public async Task PublicResponses_CarryNoPersonalData()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.PublishAsync(await alice.FirstCollectionAsync());
        using var visitor = await factory.CreateAnonymousClientAsync();

        foreach (var url in new[]
                 {
                     $"/api/public/users/{alice.UserName}",
                     $"/api/public/collections/{collection.Id}",
                     $"/api/public/collections/{collection.Id}/coins",
                     $"/api/public/coins?owner={alice.UserName}",
                     "/api/public/collectors",
                 })
        {
            using var response = await visitor.GetAsync(url);
            await response.ShouldHaveStatusAsync(HttpStatusCode.OK);
            var body = await response.Content.ReadAsStringAsync();
            Assert.DoesNotContain(alice.User.Email, body, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain(alice.User.Id, body, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("1990-01-01", body);
            Assert.DoesNotContain("firstName", body, StringComparison.OrdinalIgnoreCase);
            // When coins were added or changed would tell when the owner was active
            Assert.DoesNotContain("AtUtc", body, StringComparison.OrdinalIgnoreCase);
        }
    }

    [Fact]
    public async Task UnlistedCollection_IsVisibleOnlyWithItsLink()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.SetVisibilityAsync(await alice.FirstCollectionAsync(), CollectionVisibility.Unlisted);
        await alice.CreateCoinAsync(collection.Id);
        using var visitor = await factory.CreateAnonymousClientAsync();
        var token = collection.ShareToken!;

        using var byId = await visitor.GetAsync($"/api/public/collections/{collection.Id}");
        using var coinsById = await visitor.GetAsync($"/api/public/collections/{collection.Id}/coins");
        using var profile = await visitor.GetAsync($"/api/public/users/{alice.UserName}");
        var shared = await visitor.GetJsonAsync<PublicCollectionResponse>($"/api/public/shared/{token}");
        var coins = await visitor.GetJsonAsync<PagedResponse<CoinResponse>>($"/api/public/shared/{token}/coins");
        using var wrongToken = await visitor.GetAsync($"/api/public/shared/{new string('A', token.Length)}");
        using var shortToken = await visitor.GetAsync($"/api/public/shared/{token[..^1]}");

        await byId.ShouldHaveStatusAsync(HttpStatusCode.NotFound);
        await coinsById.ShouldHaveStatusAsync(HttpStatusCode.NotFound);
        await profile.ShouldHaveStatusAsync(HttpStatusCode.NotFound);
        Assert.Equal(collection.Id, shared.Id);
        Assert.Single(coins.Items);
        await wrongToken.ShouldHaveStatusAsync(HttpStatusCode.NotFound);
        await shortToken.ShouldHaveStatusAsync(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ShareToken_ExistsOnlyWhileUnlisted_AndIsNewAfterwards()
    {
        var alice = await factory.SignUpAsync();
        var unlisted = await alice.SetVisibilityAsync(await alice.FirstCollectionAsync(), CollectionVisibility.Unlisted);
        using var visitor = await factory.CreateAnonymousClientAsync();

        var madePrivate = await alice.SetVisibilityAsync(unlisted, CollectionVisibility.Private);
        using var oldLink = await visitor.GetAsync($"/api/public/shared/{unlisted.ShareToken}");
        var unlistedAgain = await alice.SetVisibilityAsync(madePrivate, CollectionVisibility.Unlisted);
        var madePublic = await alice.PublishAsync(unlistedAgain);

        Assert.Null(madePrivate.ShareToken);
        await oldLink.ShouldHaveStatusAsync(HttpStatusCode.NotFound);
        Assert.NotNull(unlistedAgain.ShareToken);
        Assert.NotEqual(unlisted.ShareToken, unlistedAgain.ShareToken);
        Assert.Null(madePublic.ShareToken);
    }

    [Fact]
    public async Task RegeneratedShareToken_ReplacesTheOldLink()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.SetVisibilityAsync(await alice.FirstCollectionAsync(), CollectionVisibility.Unlisted);
        using var visitor = await factory.CreateAnonymousClientAsync();

        using var regenerate = await alice.Client.PostAsync($"/api/collections/{collection.Id}/share-token");
        var newToken = (await regenerate.ReadJsonAsync<ShareTokenResponse>()).ShareToken;
        using var oldLink = await visitor.GetAsync($"/api/public/shared/{collection.ShareToken}");
        using var newLink = await visitor.GetAsync($"/api/public/shared/{newToken}");

        await oldLink.ShouldHaveStatusAsync(HttpStatusCode.NotFound);
        await newLink.ShouldHaveStatusAsync(HttpStatusCode.OK);
    }

    [Fact]
    public async Task ShareLink_WithItsLettersInOtherCase_DoesNotOpen()
    {
        // The database's default collation ignores case; the column has a binary one (until
        // 2026-10-06 the link opened in any case)
        var alice = await factory.SignUpAsync();
        var collection = await alice.SetVisibilityAsync(await alice.FirstCollectionAsync(), CollectionVisibility.Unlisted);
        var coin = await alice.CreateCoinAsync(collection.Id);
        await alice.UploadPhotoAsync(coin.Id);
        await alice.UploadCoverAsync(collection.Id);
        var token = collection.ShareToken!;
        // 22 base64url characters without a letter are practically impossible
        var otherCase = new string(token.Select(c => char.IsUpper(c) ? char.ToLowerInvariant(c) : char.ToUpperInvariant(c))
            .ToArray());
        using var visitor = await factory.CreateAnonymousClientAsync();

        Assert.NotEqual(token, otherCase);
        await visitor.ExpectStatusAsync($"/api/public/shared/{token}", HttpStatusCode.OK);
        await visitor.ExpectStatusAsync($"/api/public/shared/{otherCase}", HttpStatusCode.NotFound);
        await visitor.ExpectStatusAsync($"/api/public/shared/{otherCase}/coins", HttpStatusCode.NotFound);
        await visitor.ExpectStatusAsync($"/api/coins/{coin.Id}/photos/National/Thumb?s={otherCase}", HttpStatusCode.NotFound);
        await visitor.ExpectStatusAsync($"/api/collections/{collection.Id}/cover?s={otherCase}", HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ShareToken_OfNonUnlistedCollection_IsRefused()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.FirstCollectionAsync();

        using var response = await alice.Client.PostAsync($"/api/collections/{collection.Id}/share-token");

        Assert.Equal("not_unlisted", await response.ReadProblemCodeAsync());
    }

    [Fact]
    public async Task Explore_HasNoAllOnOnePage()
    {
        using var visitor = await factory.CreateAnonymousClientAsync();

        using var all = await visitor.GetAsync("/api/public/coins?pageSize=0");
        using var tooLongOwner = await visitor.GetAsync($"/api/public/coins?owner={new string('a', 257)}");

        await all.ShouldHaveStatusAsync(HttpStatusCode.BadRequest);
        await tooLongOwner.ShouldHaveStatusAsync(HttpStatusCode.BadRequest);
    }
}
