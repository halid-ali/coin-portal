using System.Net;
using CoinPortal.Api.Contracts.Coins;
using CoinPortal.Api.Contracts.Common;
using CoinPortal.Api.Data;
using CoinPortal.Api.Tests.Infrastructure;

namespace CoinPortal.Api.Tests;

public class CoinsTests(CoinPortalFactory factory)
{
    [Fact]
    public async Task OtherUsersCoin_LooksMissing()
    {
        var alice = await factory.SignUpAsync();
        var bob = await factory.SignUpAsync();
        var coin = await alice.CreateCoinAsync((await alice.FirstCollectionAsync()).Id);
        var bobsCollection = await bob.FirstCollectionAsync();
        var url = $"/api/coins/{coin.Id}";

        using var get = await bob.Client.GetAsync(url);
        using var put = await bob.Client.PutAsync(url, TestUser.NewCoin(bobsCollection.Id, "Taken over"));
        using var delete = await bob.Client.DeleteAsync(url);
        var bobsCoins = await bob.Client.GetJsonAsync<PagedResponse<CoinResponse>>("/api/coins");

        await get.ShouldHaveStatusAsync(HttpStatusCode.NotFound);
        await put.ShouldHaveStatusAsync(HttpStatusCode.NotFound);
        await delete.ShouldHaveStatusAsync(HttpStatusCode.NotFound);
        Assert.Empty(bobsCoins.Items);
        Assert.Equal("Test coin", (await alice.Client.GetJsonAsync<CoinResponse>(url)).Title);
    }

    [Fact]
    public async Task Create_InAnotherUsersCollection_IsRejected()
    {
        var alice = await factory.SignUpAsync();
        var bob = await factory.SignUpAsync();
        var bobsCollection = await bob.FirstCollectionAsync();

        using var response = await alice.Client.PostAsync("/api/coins", TestUser.NewCoin(bobsCollection.Id));

        Assert.Contains("CollectionId", await response.ReadValidationKeysAsync(), StringComparer.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Update_ToAnotherOwnCollection_MovesTheCoin()
    {
        var alice = await factory.SignUpAsync();
        var first = await alice.FirstCollectionAsync();
        var second = await alice.CreateCollectionAsync();
        var coin = await alice.CreateCoinAsync(first.Id);

        using var response = await alice.Client.PutAsync($"/api/coins/{coin.Id}", TestUser.NewCoin(second.Id));

        Assert.Equal(second.Id, (await response.ReadJsonAsync<CoinResponse>()).CollectionId);
    }

    [Fact]
    public async Task Create_NormalizesAndTrims()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.FirstCollectionAsync();
        var request = TestUser.NewCoin(collection.Id, "  Brandenburger Tor  ", countryCode: "de");
        request.Description = "   ";
        request.MintMark = " A ";

        using var response = await alice.Client.PostAsync("/api/coins", request);

        await response.ShouldHaveStatusAsync(HttpStatusCode.Created);
        var coin = await response.ReadJsonAsync<CoinResponse>();
        Assert.Equal("Brandenburger Tor", coin.Title);
        Assert.Equal("DE", coin.CountryCode);
        Assert.Null(coin.Description);
        Assert.Equal("A", coin.MintMark);
    }

    [Theory]
    [InlineData("XX", 2006)] // not a euro issuer
    [InlineData("DE", 1998)] // before the euro
    public async Task Create_InvalidCountryOrYear_IsRejected(string countryCode, int year)
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.FirstCollectionAsync();

        using var response = await alice.Client.PostAsync("/api/coins",
            TestUser.NewCoin(collection.Id, countryCode: countryCode, year: year));

        await response.ShouldHaveStatusAsync(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Create_YearAfterNextYear_IsRejected()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.FirstCollectionAsync();
        var nextYear = DateTime.UtcNow.Year + 1;

        using var nextYearResponse = await alice.Client.PostAsync("/api/coins",
            TestUser.NewCoin(collection.Id, year: nextYear));
        using var laterResponse = await alice.Client.PostAsync("/api/coins",
            TestUser.NewCoin(collection.Id, year: nextYear + 1));

        // Mints release next year's coins in December
        await nextYearResponse.ShouldHaveStatusAsync(HttpStatusCode.Created);
        Assert.Contains("Year", await laterResponse.ReadValidationKeysAsync(), StringComparer.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Enums_AreNamesOnTheWire_AndNumbersAreRejected()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.FirstCollectionAsync();
        const string template =
            """{"collectionId":COLLECTION,"title":"Wire","denomination":VALUE,"countryCode":"DE","year":2006}""";

        using var byName = await alice.Client.SendRawJsonAsync(HttpMethod.Post, "/api/coins",
            template.Replace("COLLECTION", collection.Id.ToString()).Replace("VALUE", "\"Euro2\""));
        using var byNumber = await alice.Client.SendRawJsonAsync(HttpMethod.Post, "/api/coins",
            template.Replace("COLLECTION", collection.Id.ToString()).Replace("VALUE", "200"));

        await byName.ShouldHaveStatusAsync(HttpStatusCode.Created);
        Assert.Contains("\"denomination\":\"Euro2\"", await byName.Content.ReadAsStringAsync());
        await byNumber.ShouldHaveStatusAsync(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task List_FiltersSearchAndPages()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.FirstCollectionAsync();
        await alice.CreateCoinAsync(collection.Id, "Brandenburger Tor", "DE", 2015);
        await alice.CreateCoinAsync(collection.Id, "Kölner Dom", "DE", 2011);
        await alice.CreateCoinAsync(collection.Id, "Mozart", "AT", 2006, Denomination.Cent10);

        var german = await alice.Client.GetJsonAsync<PagedResponse<CoinResponse>>("/api/coins?countryCode=de");
        var search = await alice.Client.GetJsonAsync<PagedResponse<CoinResponse>>("/api/coins?search=BRANDENBURGER");
        var cents = await alice.Client.GetJsonAsync<PagedResponse<CoinResponse>>("/api/coins?denomination=Cent10");
        var secondPage = await alice.Client.GetJsonAsync<PagedResponse<CoinResponse>>("/api/coins?pageSize=2&page=2");
        var all = await alice.Client.GetJsonAsync<PagedResponse<CoinResponse>>("/api/coins?pageSize=0");

        Assert.Equal(2, german.TotalCount);
        Assert.Equal("Brandenburger Tor", Assert.Single(search.Items).Title);
        Assert.Equal("Mozart", Assert.Single(cents.Items).Title);
        Assert.Single(secondPage.Items);
        Assert.Equal(2, secondPage.TotalPages);
        Assert.Equal(3, all.Items.Count);
    }

    [Fact]
    public async Task List_SortsByTheClientsCountryOrder()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.FirstCollectionAsync();
        foreach (var country in new[] { "AT", "BE", "DE" })
        {
            await alice.CreateCoinAsync(collection.Id, countryCode: country);
        }

        // E.g. sorted by the Turkish names: Almanya, Belçika, Avusturya
        var asc = await alice.Client.GetJsonAsync<PagedResponse<CoinResponse>>(
            "/api/coins?sort=Country&countryOrder=DE,BE,AT");
        var desc = await alice.Client.GetJsonAsync<PagedResponse<CoinResponse>>(
            "/api/coins?sort=Country&dir=Desc&countryOrder=DE,BE,AT");

        Assert.Equal(["DE", "BE", "AT"], asc.Items.Select(c => c.CountryCode));
        Assert.Equal(["AT", "BE", "DE"], desc.Items.Select(c => c.CountryCode));
    }

    [Fact]
    public async Task List_InvalidQuery_IsRejected()
    {
        var alice = await factory.SignUpAsync();

        using var pageSize = await alice.Client.GetAsync("/api/coins?pageSize=101");
        using var sort = await alice.Client.GetAsync("/api/coins?sort=Quantity");
        using var countryOrder = await alice.Client.GetAsync("/api/coins?countryOrder=DE;BE");

        await pageSize.ShouldHaveStatusAsync(HttpStatusCode.BadRequest);
        await sort.ShouldHaveStatusAsync(HttpStatusCode.BadRequest);
        await countryOrder.ShouldHaveStatusAsync(HttpStatusCode.BadRequest);
    }
}
