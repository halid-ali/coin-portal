using System.Net;
using CoinPortal.Api.Contracts.Coins;
using CoinPortal.Api.Contracts.Common;
using CoinPortal.Api.Data;
using CoinPortal.Api.Tests.Infrastructure;

namespace CoinPortal.Api.Tests;

/// <summary>
/// Lists with both kinds of coins: the kind and currency filters, the denomination sort, and the
/// facets that fill the filters (kind counts, currencies, countries of the chosen kind).
/// </summary>
public class CoinFacetsTests(CoinPortalFactory factory)
{
    /// <summary>Two euro coins and three other coins in one collection, one more other coin in a second.</summary>
    private async Task<(TestUser User, int CollectionId)> MixedCollectionAsync()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.FirstCollectionAsync();
        await alice.CreateCoinAsync(collection.Id, "2 € DE", "DE", 2006, Denomination.Euro2);
        await alice.CreateCoinAsync(collection.Id, "10 cent AT", "AT", 2006, Denomination.Cent10);
        await CreateOtherAsync(alice, collection.Id, "25 kuruş TR", 25, "kuruş", "TR");
        await CreateOtherAsync(alice, collection.Id, "5 Mark DD", 5, "Mark", "DD");
        await CreateOtherAsync(alice, collection.Id, "1 Mark DD", 1, "mark", "DD");
        var second = await alice.CreateCollectionAsync();
        await CreateOtherAsync(alice, second.Id, "1 dolar US", 1, "dolar", "US");
        return (alice, collection.Id);
    }

    private static async Task CreateOtherAsync(TestUser user, int collectionId, string title, decimal value,
        string currency, string country)
    {
        using var response = await user.Client.PostAsync("/api/coins",
            TestUser.NewOtherCoin(collectionId, title, value, currency, country, 1975));
        await response.ShouldHaveStatusAsync(HttpStatusCode.Created);
    }

    [Fact]
    public async Task OwnFacets_CountTheKinds_AndListCurrenciesAndTheChosenKindsCountries()
    {
        var (alice, collectionId) = await MixedCollectionAsync();

        var all = await alice.Client.GetJsonAsync<CoinFacetsResponse>($"/api/coins/facets?collectionId={collectionId}");
        var euro = await alice.Client.GetJsonAsync<CoinFacetsResponse>($"/api/coins/facets?collectionId={collectionId}&kind=Euro");
        var other = await alice.Client.GetJsonAsync<CoinFacetsResponse>($"/api/coins/facets?collectionId={collectionId}&kind=Other");
        var everywhere = await alice.Client.GetJsonAsync<CoinFacetsResponse>("/api/coins/facets");

        Assert.Equal((2, 3), (all.EuroCount, all.OtherCount));
        // "Mark" and "mark" are one currency: the database ignores case
        Assert.Equal(["kuruş", "mark"], all.Currencies.Select(c => c.ToLowerInvariant()));
        Assert.Equal(["AT", "DD", "DE", "TR"], all.CountryCodes);
        Assert.Equal(["AT", "DE"], euro.CountryCodes);
        Assert.Equal(["DD", "TR"], other.CountryCodes);
        // The counts ignore the kind
        Assert.Equal((2, 3), (other.EuroCount, other.OtherCount));
        // Without a collection: all of the user's coins, the coin form's currency suggestions
        Assert.Equal((2, 4), (everywhere.EuroCount, everywhere.OtherCount));
        Assert.Contains("dolar", everywhere.Currencies);
    }

    [Fact]
    public async Task OwnFacets_OfAnEmptyCollection_AreEmpty()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.FirstCollectionAsync();

        var facets = await alice.Client.GetJsonAsync<CoinFacetsResponse>($"/api/coins/facets?collectionId={collection.Id}");

        Assert.Equal((0, 0, 0, 0), (facets.EuroCount, facets.OtherCount, facets.Currencies.Count, facets.CountryCodes.Count));
    }

    [Fact]
    public async Task OwnFacets_OfAnotherUsersCollection_LookMissing_AndAKindMustBeKnown()
    {
        var (_, collectionId) = await MixedCollectionAsync();
        var bob = await factory.SignUpAsync();

        await bob.Client.ExpectStatusAsync($"/api/coins/facets?collectionId={collectionId}", HttpStatusCode.NotFound);
        await bob.Client.ExpectStatusAsync("/api/coins/facets?kind=Gold", HttpStatusCode.BadRequest);
        await bob.Client.ExpectStatusAsync("/api/coins/facets?collectionId=0", HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task PublicFacets_FollowTheVisibility_LikeTheirLists()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.CreateCollectionAsync();
        using (var created = await alice.Client.PostCoinWithPhotosAsync("/api/coins/with-photos",
                   TestUser.NewOtherCoin(collection.Id), national: TestImages.Png(200, 160), common: TestImages.Png(200, 160)))
        {
            await created.ShouldHaveStatusAsync(HttpStatusCode.Created);
        }
        using var visitor = await factory.CreateAnonymousClientAsync();
        var url = $"/api/public/collections/{collection.Id}/facets";

        // Private: nothing to see, also not in explore
        await visitor.ExpectStatusAsync(url, HttpStatusCode.NotFound);
        var hidden = await visitor.GetJsonAsync<CoinFacetsResponse>($"/api/public/coins/facets?owner={alice.UserName}");
        Assert.Equal((0, 0), (hidden.EuroCount, hidden.OtherCount));

        var shared = await alice.SetVisibilityAsync(collection, CollectionVisibility.Unlisted);
        var byLink = await visitor.GetJsonAsync<CoinFacetsResponse>($"/api/public/shared/{shared.ShareToken}/facets");
        Assert.Equal((0, 1, "TR"), (byLink.EuroCount, byLink.OtherCount, Assert.Single(byLink.CountryCodes)));

        await alice.PublishAsync(collection);
        var published = await visitor.GetJsonAsync<CoinFacetsResponse>(url);
        var explored = await visitor.GetJsonAsync<CoinFacetsResponse>($"/api/public/coins/facets?owner={alice.UserName}");
        var euroOnly = await visitor.GetJsonAsync<CoinFacetsResponse>($"/api/public/coins/facets?owner={alice.UserName}&kind=Euro");
        // PublishAsync added photographed euro coins up to the minimum; the other coin counted already
        Assert.Equal((CoinPortalFactory.MinPublicCoins - 1, 1), (published.EuroCount, published.OtherCount));
        Assert.Equal((published.EuroCount, published.OtherCount), (explored.EuroCount, explored.OtherCount));
        Assert.Equal(["kuruş"], explored.Currencies);
        Assert.Equal(["DE"], euroOnly.CountryCodes);
        await visitor.ExpectStatusAsync($"/api/public/shared/{shared.ShareToken}/facets", HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task List_FiltersByKindAndCurrency()
    {
        var (alice, collectionId) = await MixedCollectionAsync();

        async Task<IEnumerable<string>> Titles(string filter) =>
            (await alice.Client.GetJsonAsync<PagedResponse<CoinResponse>>(
                $"/api/coins?collectionId={collectionId}&sort=Title&{filter}")).Items.Select(c => c.Title);

        Assert.Equal(["10 cent AT", "2 € DE"], await Titles("kind=Euro"));
        Assert.Equal(["1 Mark DD", "25 kuruş TR", "5 Mark DD"], await Titles("kind=Other"));
        Assert.Equal(["1 Mark DD", "5 Mark DD"], await Titles("currency=MARK"));
        Assert.Empty(await Titles("kind=Euro&currency=Mark"));
        await alice.Client.ExpectStatusAsync("/api/coins?kind=Gold", HttpStatusCode.BadRequest);
        await alice.Client.ExpectStatusAsync($"/api/coins?currency={new string('x', Coin.CurrencyMaxLength + 1)}",
            HttpStatusCode.BadRequest);
    }

    // Euro coins first in both directions; the direction applies within each kind
    [Theory]
    [InlineData("sort=Denomination", "10 cent AT,2 € DE,25 kuruş TR,1 Mark DD,5 Mark DD")]
    [InlineData("sort=Denomination&dir=Desc", "2 € DE,10 cent AT,5 Mark DD,1 Mark DD,25 kuruş TR")]
    public async Task List_SortsByDenomination_EuroFirst_ThenCurrencyAndValue(string query, string expected)
    {
        var (alice, collectionId) = await MixedCollectionAsync();

        var page = await alice.Client.GetJsonAsync<PagedResponse<CoinResponse>>(
            $"/api/coins?collectionId={collectionId}&{query}");

        Assert.Equal(expected, string.Join(",", page.Items.Select(c => c.Title)));
    }
}
