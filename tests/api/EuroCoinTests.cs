using System.IO.Compression;
using System.Net;
using System.Text.Json;
using CoinPortal.Api.Contracts.Coins;
using CoinPortal.Api.Contracts.Collections;
using CoinPortal.Api.Contracts.Common;
using CoinPortal.Api.Contracts.Public;
using CoinPortal.Api.Data;
using CoinPortal.Api.Tests.Infrastructure;

namespace CoinPortal.Api.Tests;

/// <summary>
/// What a euro coin is and does today, written down before coins other than euro coins arrive
/// (roadmap 18): the requests, rules and JSON the client and existing data rely on. These tests
/// stay as they are; the new kind of coin gets tests of its own.
/// </summary>
public class EuroCoinTests(CoinPortalFactory factory)
{
    private static readonly string[] EuroIssuers =
    [
        "AD", "AT", "BE", "BG", "CY", "DE", "EE", "ES", "FI", "FR", "GR", "HR", "IE",
        "IT", "LT", "LU", "LV", "MC", "MT", "NL", "PT", "SI", "SK", "SM", "VA",
    ];

    [Fact]
    public async Task EveryDenomination_IsAccepted_AndComesBackByItsName()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.FirstCollectionAsync();

        foreach (var denomination in Enum.GetValues<Denomination>())
        {
            var coin = await alice.CreateCoinAsync(collection.Id, denomination.ToString(), denomination: denomination);
            Assert.Equal(denomination, coin.Denomination);
        }

        // Face value order, 1 cent to 2 euro
        var sorted = await alice.Client.GetJsonAsync<PagedResponse<CoinResponse>>("/api/coins?sort=Denomination");
        Assert.Equal(["Cent1", "Cent2", "Cent5", "Cent10", "Cent20", "Cent50", "Euro1", "Euro2"],
            sorted.Items.Select(c => c.Title));
    }

    [Theory]
    [InlineData("Cent3")]
    [InlineData("Euro5")]
    [InlineData("")]
    public async Task UnknownDenomination_IsRejected(string name)
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.FirstCollectionAsync();

        using var response = await alice.Client.SendRawJsonAsync(HttpMethod.Post, "/api/coins",
            $$"""{"collectionId":{{collection.Id}},"title":"Wire","denomination":"{{name}}","countryCode":"DE","year":2006}""");

        Assert.Contains("$.denomination", await response.ReadValidationKeysAsync());
        Assert.Empty((await alice.Client.GetJsonAsync<PagedResponse<CoinResponse>>("/api/coins")).Items);
    }

    [Fact]
    public async Task EveryEuroIssuer_IsAccepted()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.FirstCollectionAsync();

        foreach (var country in EuroIssuers)
        {
            var coin = await alice.CreateCoinAsync(collection.Id, countryCode: country.ToLowerInvariant());
            Assert.Equal(country, coin.CountryCode);
        }
    }

    // Real countries, but not euro issuers
    [Theory]
    [InlineData("TR")]
    [InlineData("US")]
    [InlineData("GB")]
    [InlineData("CH")]
    public async Task CountryOutsideTheEuro_IsRejected(string country)
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.FirstCollectionAsync();

        using var response = await alice.Client.PostAsync("/api/coins", TestUser.NewCoin(collection.Id, countryCode: country));

        Assert.Equal(["CountryCode"], await response.ReadValidationKeysAsync());
    }

    [Fact]
    public async Task FirstEuroYear_IsAccepted()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.FirstCollectionAsync();

        using var response = await alice.Client.PostAsync("/api/coins", TestUser.NewCoin(collection.Id, year: 1999));

        await response.ShouldHaveStatusAsync(HttpStatusCode.Created);
        Assert.Equal(1999, (await response.ReadJsonAsync<CoinResponse>()).Year);
    }

    // The client maps the errors to its fields by these keys
    [Theory]
    [InlineData("denomination", "Denomination")]
    [InlineData("countryCode", "CountryCode")]
    [InlineData("year", "Year")]
    public async Task MissingIdentifyingField_IsRejected(string field, string key)
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.FirstCollectionAsync();
        var fields = new Dictionary<string, object>
        {
            ["collectionId"] = collection.Id,
            ["title"] = "Wire",
            ["denomination"] = "Euro2",
            ["countryCode"] = "DE",
            ["year"] = 2006,
        };
        fields.Remove(field);

        using var response = await alice.Client.SendRawJsonAsync(HttpMethod.Post, "/api/coins",
            JsonSerializer.Serialize(fields));

        Assert.Equal([key], await response.ReadValidationKeysAsync());
    }

    [Fact]
    public async Task Update_ReplacesEveryField_AndReadingReturnsThem()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.FirstCollectionAsync();
        var coin = await alice.CreateCoinAsync(collection.Id);
        var url = $"/api/coins/{coin.Id}";

        using var response = await alice.Client.PutAsync(url, new CoinUpsertRequest
        {
            CollectionId = collection.Id,
            Title = "50 cent · İtalya · 2002",
            Description = "Roma",
            Denomination = Denomination.Cent50,
            CountryCode = "IT",
            Year = 2002,
            MintMark = "R",
            IsCommemorative = true,
            Quantity = 3,
        });

        await response.ShouldHaveStatusAsync(HttpStatusCode.OK);
        var expected = ("50 cent · İtalya · 2002", "Roma", Denomination.Cent50, "IT", 2002, "R", true, 3);
        static (string, string?, Denomination, string, int, string?, bool, int) Fields(CoinResponse c) =>
            (c.Title, c.Description, c.Denomination, c.CountryCode, c.Year, c.MintMark, c.IsCommemorative, c.Quantity);
        Assert.Equal(expected, Fields(await response.ReadJsonAsync<CoinResponse>()));
        Assert.Equal(expected, Fields(await alice.Client.GetJsonAsync<CoinResponse>(url)));
        var listed = await alice.Client.GetJsonAsync<PagedResponse<CoinResponse>>("/api/coins");
        Assert.Equal(expected, Fields(Assert.Single(listed.Items)));
    }

    // The field names and values the client reads, wherever a coin is shown. Checked as a subset:
    // a new field does not break this test, a renamed or changed one does.
    [Fact]
    public async Task CoinJson_HasTheFieldsTheClientReads_Everywhere()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.CreateCollectionAsync();
        var request = TestUser.NewCoin(collection.Id, "Brandenburger Tor", "DE", 2015, Denomination.Euro2);
        request.Description = "Bremen";
        request.MintMark = "A";
        request.IsCommemorative = true;
        request.Quantity = 2;
        CoinResponse coin;
        using (var created = await alice.Client.PostCoinWithPhotosAsync("/api/coins/with-photos", request,
                   national: TestImages.Png(200, 160)))
        {
            coin = await created.ReadJsonAsync<CoinResponse>();
        }
        await alice.PublishAsync(collection);
        using var visitor = await factory.CreateAnonymousClientAsync();

        async Task<JsonElement> ItemOf(ApiClient client, string url)
        {
            using var json = JsonDocument.Parse(await (await client.GetAsync(url)).Content.ReadAsStringAsync());
            return json.RootElement.GetProperty("items").EnumerateArray()
                .Single(e => e.GetProperty("id").GetInt32() == coin.Id).Clone();
        }

        using (var single = JsonDocument.Parse(await (await alice.Client.GetAsync($"/api/coins/{coin.Id}")).Content.ReadAsStringAsync()))
        {
            AssertCoinJson(single.RootElement, coin, collection.Id);
        }
        AssertCoinJson(await ItemOf(alice.Client, $"/api/coins?collectionId={collection.Id}"), coin, collection.Id);
        AssertCoinJson(await ItemOf(visitor, $"/api/public/collections/{collection.Id}/coins"), coin, collection.Id);
        var explored = await ItemOf(visitor, $"/api/public/coins?owner={alice.UserName}");
        AssertCoinJson(explored, coin, collection.Id);
        Assert.Equal(alice.UserName, explored.GetProperty("ownerUserName").GetString());
    }

    private static void AssertCoinJson(JsonElement json, CoinResponse coin, int collectionId)
    {
        Assert.Equal(coin.Id, json.GetProperty("id").GetInt32());
        Assert.Equal(collectionId, json.GetProperty("collectionId").GetInt32());
        Assert.Equal("Brandenburger Tor", json.GetProperty("title").GetString());
        Assert.Equal("Bremen", json.GetProperty("description").GetString());
        Assert.Equal("Euro2", json.GetProperty("denomination").GetString());
        Assert.Equal("DE", json.GetProperty("countryCode").GetString());
        Assert.Equal(2015, json.GetProperty("year").GetInt32());
        Assert.Equal("A", json.GetProperty("mintMark").GetString());
        Assert.True(json.GetProperty("isCommemorative").GetBoolean());
        Assert.Equal(2, json.GetProperty("quantity").GetInt32());
        var photo = Assert.Single(json.GetProperty("photos").EnumerateArray());
        Assert.Equal("National", photo.GetProperty("side").GetString());
        Assert.Equal(coin.Photos[0].Id.ToString(), photo.GetProperty("id").GetString());
    }

    [Fact]
    public async Task EditingAPhotographedCoin_InAPublicCollection_NeedsNoConfirmation()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.CreatePublicCollectionAsync();
        var coin = (await alice.Client.GetJsonAsync<PagedResponse<CoinResponse>>(
            $"/api/coins?collectionId={collection.Id}")).Items[0];

        using var response = await alice.Client.PutAsync($"/api/coins/{coin.Id}",
            TestUser.NewCoin(collection.Id, "Renamed", "AT", 2011, Denomination.Cent20));

        await response.ShouldHaveStatusAsync(HttpStatusCode.OK);
        var after = await alice.Client.GetJsonAsync<CollectionResponse>($"/api/collections/{collection.Id}");
        Assert.Equal(CollectionVisibility.Public, after.Visibility);
    }

    [Fact]
    public async Task PublicLists_FilterAndSortByDenominationAndCountry()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.CreateCollectionAsync();
        await alice.CreatePhotographedCoinAsync(collection.Id, "A", "DE", 2015, Denomination.Euro1);
        await alice.CreatePhotographedCoinAsync(collection.Id, "B", "AT", 2006, Denomination.Euro2);
        await alice.CreatePhotographedCoinAsync(collection.Id, "C", "DE", 2015, Denomination.Cent10);
        await alice.PublishAsync(collection);
        using var visitor = await factory.CreateAnonymousClientAsync();
        var collectionUrl = $"/api/public/collections/{collection.Id}/coins";
        var exploreUrl = $"/api/public/coins?owner={alice.UserName}";

        async Task<string> Titles(string url) =>
            string.Join(",", (await visitor.GetJsonAsync<PagedResponse<PublicCoinResponse>>(url)).Items.Select(c => c.Title));

        foreach (var url in new[] { collectionUrl + "?", exploreUrl + "&" })
        {
            Assert.Equal("C,A,B", await Titles(url + "sort=Denomination"));
            Assert.Equal("B,A,C", await Titles(url + "sort=Denomination&dir=Desc"));
            Assert.Equal("A,C", await Titles(url + "countryCode=DE&sort=Title"));
            Assert.Equal("C", await Titles(url + "countryCode=DE&denomination=Cent10"));
            Assert.Equal("", await Titles(url + "countryCode=AT&denomination=Cent10"));
        }
    }

    [Fact]
    public async Task Export_HoldsEveryFieldOfTheCoin()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.FirstCollectionAsync();
        var request = TestUser.NewCoin(collection.Id, "Mozart", "AT", 2006, Denomination.Cent10);
        request.Description = "Salzburg";
        request.MintMark = "W";
        request.IsCommemorative = true;
        request.Quantity = 4;
        using (var created = await alice.Client.PostAsync("/api/coins", request))
        {
            await created.ShouldHaveStatusAsync(HttpStatusCode.Created);
        }

        using var response = await alice.Client.GetAsync("/api/settings/export");
        using var zip = new ZipArchive(await response.Content.ReadAsStreamAsync());
        using var stream = zip.GetEntry("collections.json")!.Open();
        using var json = await JsonDocument.ParseAsync(stream);

        var coin = json.RootElement.EnumerateArray()
            .Single(c => c.GetProperty("id").GetInt32() == collection.Id)
            .GetProperty("coins").EnumerateArray().Single();
        Assert.Equal(("Mozart", "Salzburg", "Cent10", "AT", 2006, "W", true, 4),
            (coin.GetProperty("title").GetString(), coin.GetProperty("description").GetString(),
                coin.GetProperty("denomination").GetString(), coin.GetProperty("countryCode").GetString(),
                coin.GetProperty("year").GetInt32(), coin.GetProperty("mintMark").GetString(),
                coin.GetProperty("isCommemorative").GetBoolean(), coin.GetProperty("quantity").GetInt32()));
    }
}
