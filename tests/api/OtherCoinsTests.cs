using System.IO.Compression;
using System.Net;
using System.Text.Json;
using CoinPortal.Api.Contracts.Coins;
using CoinPortal.Api.Contracts.Collections;
using CoinPortal.Api.Contracts.Common;
using CoinPortal.Api.Contracts.Countries;
using CoinPortal.Api.Data;
using CoinPortal.Api.Tests.Infrastructure;

namespace CoinPortal.Api.Tests;

/// <summary>
/// Coins other than euro coins (roadmap 18): a face value in a currency, any country, any year, and
/// both sides photographed for a public collection. What euro coins keep is in EuroCoinTests.
/// </summary>
public class OtherCoinsTests(CoinPortalFactory factory)
{
    [Fact]
    public async Task OtherCoin_IsSavedWithItsValueAndCurrency_AndComesBackSo()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.FirstCollectionAsync();
        var request = TestUser.NewOtherCoin(collection.Id, faceValue: 0.5m, currency: "  penny  ", countryCode: "gb",
            year: 1967);

        using var response = await alice.Client.PostAsync("/api/coins", request);

        await response.ShouldHaveStatusAsync(HttpStatusCode.Created);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var coin = json.RootElement;
        Assert.Equal("Other", coin.GetProperty("kind").GetString());
        Assert.Equal(0.5m, coin.GetProperty("faceValue").GetDecimal());
        Assert.Equal("penny", coin.GetProperty("currency").GetString());
        Assert.Equal(JsonValueKind.Null, coin.GetProperty("denomination").ValueKind);
        Assert.Equal(("GB", 1967), (coin.GetProperty("countryCode").GetString(), coin.GetProperty("year").GetInt32()));

        var read = await alice.Client.GetJsonAsync<CoinResponse>($"/api/coins/{coin.GetProperty("id").GetInt32()}");
        Assert.Equal((CoinKind.Other, (Denomination?)null, (decimal?)0.5m, "penny"),
            (read.Kind, read.Denomination, read.FaceValue, read.Currency));
    }

    [Fact]
    public async Task EuroCoin_ComesBackAsEuro_WithoutValueOrCurrency()
    {
        var alice = await factory.SignUpAsync();
        var coin = await alice.CreateCoinAsync((await alice.FirstCollectionAsync()).Id);

        Assert.Equal((CoinKind.Euro, (Denomination?)Denomination.Euro2, (decimal?)null, (string?)null),
            (coin.Kind, coin.Denomination, coin.FaceValue, coin.Currency));
    }

    // The client maps the errors to its fields by these keys
    [Theory]
    [InlineData("noValue", "FaceValue")]
    [InlineData("zero", "FaceValue")]
    [InlineData("negative", "FaceValue")]
    [InlineData("tooLarge", "FaceValue")]
    [InlineData("tooManyDecimals", "FaceValue")]
    [InlineData("noCurrency", "Currency")]
    [InlineData("blankCurrency", "Currency")]
    [InlineData("longCurrency", "Currency")]
    [InlineData("controlCharacter", "Currency")]
    [InlineData("yearZero", "Year")]
    [InlineData("unknownCountry", "CountryCode")]
    public async Task OtherCoin_OutsideItsRules_IsRejected(string field, string key)
    {
        var alice = await factory.SignUpAsync();
        var request = TestUser.NewOtherCoin((await alice.FirstCollectionAsync()).Id);
        switch (field)
        {
            case "noValue": request.FaceValue = null; break;
            case "zero": request.FaceValue = 0; break;
            case "negative": request.FaceValue = -1; break;
            case "tooLarge": request.FaceValue = Coin.MaxFaceValue + 1; break;
            case "tooManyDecimals": request.FaceValue = 0.00001m; break;
            case "noCurrency": request.Currency = null; break;
            case "blankCurrency": request.Currency = "   "; break;
            case "longCurrency": request.Currency = new string('x', Coin.CurrencyMaxLength + 1); break;
            case "controlCharacter": request.Currency = "ku\u0007ruş"; break;
            case "yearZero": request.Year = 0; break;
            default: request.CountryCode = "XX"; break;
        }

        using var response = await alice.Client.PostAsync("/api/coins", request);

        Assert.Equal([key], await response.ReadValidationKeysAsync());
    }

    // Before the euro and from countries that never had it, including former countries
    [Theory]
    [InlineData("TR", 1975)]
    [InlineData("US", 1)]
    [InlineData("SU", 1961)]
    [InlineData("DD", 1971)]
    [InlineData("DE", 1950)]
    public async Task OtherCoin_TakesAnyCountryAndYear(string country, int year)
    {
        var alice = await factory.SignUpAsync();

        using var response = await alice.Client.PostAsync("/api/coins",
            TestUser.NewOtherCoin((await alice.FirstCollectionAsync()).Id, countryCode: country, year: year));

        await response.ShouldHaveStatusAsync(HttpStatusCode.Created);
    }

    [Fact]
    public async Task FieldsOfTheOtherKind_AreIgnored()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.FirstCollectionAsync();
        var euro = TestUser.NewCoin(collection.Id);
        euro.FaceValue = 2;
        euro.Currency = "Euro";
        var other = TestUser.NewOtherCoin(collection.Id);
        other.Denomination = Denomination.Euro2;

        using var euroResponse = await alice.Client.PostAsync("/api/coins", euro);
        using var otherResponse = await alice.Client.PostAsync("/api/coins", other);

        var savedEuro = await euroResponse.ReadJsonAsync<CoinResponse>();
        var savedOther = await otherResponse.ReadJsonAsync<CoinResponse>();
        Assert.Equal(((decimal?)null, (string?)null), (savedEuro.FaceValue, savedEuro.Currency));
        Assert.Null(savedOther.Denomination);
    }

    [Fact]
    public async Task ChangingTheKind_KeepsOnlyTheNewKindsFields()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.FirstCollectionAsync();
        var coin = await alice.CreateCoinAsync(collection.Id);
        var url = $"/api/coins/{coin.Id}";

        using (var toOther = await alice.Client.PutAsync(url, TestUser.NewOtherCoin(collection.Id)))
        {
            var other = await toOther.ReadJsonAsync<CoinResponse>();
            Assert.Equal((CoinKind.Other, (Denomination?)null, (decimal?)25m, "kuruş"),
                (other.Kind, other.Denomination, other.FaceValue, other.Currency));
        }
        // Back to euro: a non-euro country is refused again
        using (var refused = await alice.Client.PutAsync(url, TestUser.NewCoin(collection.Id, countryCode: "TR")))
        {
            Assert.Equal(["CountryCode"], await refused.ReadValidationKeysAsync());
        }
        using var toEuro = await alice.Client.PutAsync(url, TestUser.NewCoin(collection.Id, denomination: Denomination.Cent5));
        var euro = await toEuro.ReadJsonAsync<CoinResponse>();
        Assert.Equal((CoinKind.Euro, (Denomination?)Denomination.Cent5, (decimal?)null, (string?)null),
            (euro.Kind, euro.Denomination, euro.FaceValue, euro.Currency));
    }

    [Fact]
    public async Task Countries_ListEveryCountry_AndMarkTheEuroIssuers()
    {
        using var visitor = await factory.CreateAnonymousClientAsync();

        var countries = await visitor.GetJsonAsync<List<CountryResponse>>("/api/countries");

        Assert.Equal(253, countries.Count);
        Assert.Equal(25, countries.Count(c => c.EuroIssuer));
        Assert.True(countries.Single(c => c.Code == "DE").EuroIssuer);
        Assert.False(countries.Single(c => c.Code == "TR").EuroIssuer);
        Assert.Contains(countries, c => c.Code == "SU" && !c.EuroIssuer);
    }

    // An other coin counts as photographed with both sides: no side of it is the same everywhere
    [Fact]
    public async Task OtherCoin_NeedsBothSides_ForAPublicCollection()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.CreatePublicCollectionAsync();

        using (var frontOnly = await alice.Client.PostCoinWithPhotosAsync("/api/coins/with-photos",
                   TestUser.NewOtherCoin(collection.Id), national: TestImages.Png(200, 160)))
        {
            await ExpectWouldUnpublishAsync(frontOnly);
        }
        using var bothSides = await alice.Client.PostCoinWithPhotosAsync("/api/coins/with-photos",
            TestUser.NewOtherCoin(collection.Id), national: TestImages.Png(200, 160), common: TestImages.Png(200, 160));
        await bothSides.ShouldHaveStatusAsync(HttpStatusCode.Created);
        var coin = await bothSides.ReadJsonAsync<CoinResponse>();

        var after = await alice.Client.GetJsonAsync<CollectionResponse>($"/api/collections/{collection.Id}");
        Assert.Equal((CollectionVisibility.Public, after.CoinCount), (after.Visibility, after.PhotographedCoinCount));

        // The back is needed too: removing it asks first
        using var removeBack = await alice.Client.DeleteAsync($"/api/coins/{coin.Id}/photos/Common");
        await ExpectWouldUnpublishAsync(removeBack);
    }

    [Fact]
    public async Task OtherCoin_FilterByPhotos_CountsBothSides()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.FirstCollectionAsync();
        var frontOnly = await alice.CreateOtherCoinAsync(collection.Id, "Front only");
        await alice.UploadPhotoAsync(frontOnly.Id, CoinSide.National);
        var both = await alice.CreateOtherCoinAsync(collection.Id, "Both sides");
        await alice.UploadPhotoAsync(both.Id, CoinSide.National);
        await alice.UploadPhotoAsync(both.Id, CoinSide.Common);

        async Task<IEnumerable<string>> Titles(bool photographed) =>
            (await alice.Client.GetJsonAsync<PagedResponse<CoinResponse>>(
                $"/api/coins?collectionId={collection.Id}&photographed={photographed}")).Items.Select(c => c.Title);

        Assert.Equal(["Both sides"], await Titles(true));
        Assert.Equal(["Front only"], await Titles(false));
    }

    // Another kind needs other photos: a euro coin with its national side only stops counting
    [Fact]
    public async Task ChangingTheKind_OfAPhotographedCoin_InAPublicCollection_AsksFirst()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.CreatePublicCollectionAsync();
        var coin = (await alice.Client.GetJsonAsync<PagedResponse<CoinResponse>>(
            $"/api/coins?collectionId={collection.Id}")).Items[0];
        var url = $"/api/coins/{coin.Id}";

        using (var refused = await alice.Client.PutAsync(url, TestUser.NewOtherCoin(collection.Id)))
        {
            await ExpectWouldUnpublishAsync(refused);
        }
        Assert.Equal(CoinKind.Euro, (await alice.Client.GetJsonAsync<CoinResponse>(url)).Kind);

        using (var confirmed = await alice.Client.PutAsync($"{url}?unpublish=true", TestUser.NewOtherCoin(collection.Id)))
        {
            await confirmed.ShouldHaveStatusAsync(HttpStatusCode.OK);
        }
        var after = await alice.Client.GetJsonAsync<CollectionResponse>($"/api/collections/{collection.Id}");
        Assert.Equal(CollectionVisibility.Unlisted, after.Visibility);
    }

    [Fact]
    public async Task ChangingTheKind_ToEuro_KeepsAPublicCollectionPublic()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.CreateCollectionAsync();
        using var created = await alice.Client.PostCoinWithPhotosAsync("/api/coins/with-photos",
            TestUser.NewOtherCoin(collection.Id), national: TestImages.Png(200, 160), common: TestImages.Png(200, 160));
        var coin = await created.ReadJsonAsync<CoinResponse>();
        collection = await alice.PublishAsync(collection);

        using var toEuro = await alice.Client.PutAsync($"/api/coins/{coin.Id}", TestUser.NewCoin(collection.Id));

        await toEuro.ShouldHaveStatusAsync(HttpStatusCode.OK);
        Assert.Equal(CollectionVisibility.Public,
            (await alice.Client.GetJsonAsync<CollectionResponse>($"/api/collections/{collection.Id}")).Visibility);
    }

    [Fact]
    public async Task PublicListsAndExport_CarryTheKindValueAndCurrency()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.CreateCollectionAsync();
        using var created = await alice.Client.PostCoinWithPhotosAsync("/api/coins/with-photos",
            TestUser.NewOtherCoin(collection.Id), national: TestImages.Png(200, 160), common: TestImages.Png(200, 160));
        var coin = await created.ReadJsonAsync<CoinResponse>();
        await alice.PublishAsync(collection);
        using var visitor = await factory.CreateAnonymousClientAsync();

        foreach (var url in new[] { $"/api/public/collections/{collection.Id}/coins", $"/api/public/coins?owner={alice.UserName}" })
        {
            using var json = JsonDocument.Parse(await (await visitor.GetAsync(url)).Content.ReadAsStringAsync());
            var item = json.RootElement.GetProperty("items").EnumerateArray()
                .Single(e => e.GetProperty("id").GetInt32() == coin.Id);
            Assert.Equal(("Other", 25m, "kuruş"), (item.GetProperty("kind").GetString(),
                item.GetProperty("faceValue").GetDecimal(), item.GetProperty("currency").GetString()));
        }

        using var export = await alice.Client.GetAsync("/api/settings/export");
        using var zip = new ZipArchive(await export.Content.ReadAsStreamAsync());
        using var stream = zip.GetEntry("collections.json")!.Open();
        using var collections = await JsonDocument.ParseAsync(stream);
        var exported = collections.RootElement.EnumerateArray()
            .Single(c => c.GetProperty("id").GetInt32() == collection.Id)
            .GetProperty("coins").EnumerateArray().Single(c => c.GetProperty("id").GetInt32() == coin.Id);
        Assert.Equal(("Other", 25m, "kuruş"), (exported.GetProperty("kind").GetString(),
            exported.GetProperty("faceValue").GetDecimal(), exported.GetProperty("currency").GetString()));
    }

    private static async Task ExpectWouldUnpublishAsync(HttpResponseMessage response)
    {
        Assert.Equal("would_unpublish", await response.ReadProblemCodeAsync(HttpStatusCode.Conflict));
    }
}
