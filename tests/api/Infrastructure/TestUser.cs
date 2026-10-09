using CoinPortal.Api.Contracts.Auth;
using CoinPortal.Api.Contracts.Coins;
using CoinPortal.Api.Contracts.Collections;
using CoinPortal.Api.Data;

namespace CoinPortal.Api.Tests.Infrastructure;

/// <summary>A signed-up user with a client signed in as them, plus shortcuts for common setup.</summary>
public sealed record TestUser(ApiClient Client, UserResponse User)
{
    public const string Password = "Testpass123";

    public string UserName => User.UserName;

    /// <summary>Signs out and in again: the new cookie carries the current roles.</summary>
    public async Task<TestUser> SignInAgainAsync()
    {
        await Client.LogoutAsync();
        using var response = await Client.LoginAsync(UserName, Password);
        return this with { User = await response.ReadJsonAsync<UserResponse>() };
    }

    public static RegisterRequest NewRegisterRequest(string? language = "en")
    {
        // 13 characters, within the 3-20 limit
        var userName = "u" + Guid.NewGuid().ToString("N")[..12];
        return new RegisterRequest("Test", "User", userName, $"{userName}@example.test",
            new DateOnly(1990, 1, 1), Password, language, AcceptTerms: true);
    }

    /// <summary>The collection every user gets at sign-up.</summary>
    public async Task<CollectionResponse> FirstCollectionAsync() =>
        (await Client.GetJsonAsync<List<CollectionResponse>>("/api/collections"))[0];

    public async Task<CollectionResponse> CreateCollectionAsync(string? name = null,
        CollectionVisibility? visibility = null)
    {
        using var response = await Client.PostAsync("/api/collections", new CollectionUpsertRequest
        {
            Name = name ?? "Collection " + Guid.NewGuid().ToString("N")[..8],
            Visibility = visibility,
        });
        return await response.ReadJsonAsync<CollectionResponse>();
    }

    public async Task<CollectionResponse> SetVisibilityAsync(CollectionResponse collection,
        CollectionVisibility visibility)
    {
        using var response = await Client.PutAsync($"/api/collections/{collection.Id}", new CollectionUpsertRequest
        {
            Name = collection.Name,
            Description = collection.Description,
            Visibility = visibility,
        });
        return await response.ReadJsonAsync<CollectionResponse>();
    }

    public async Task<CoinResponse> CreateCoinAsync(int collectionId, string title = "Test coin",
        string countryCode = "DE", int year = 2006, Denomination denomination = Denomination.Euro2)
    {
        using var response = await Client.PostAsync("/api/coins",
            NewCoin(collectionId, title, countryCode, year, denomination));
        return await response.ReadJsonAsync<CoinResponse>();
    }

    /// <summary>A coin created with a national side photo, so it counts for a public collection.</summary>
    public async Task<CoinResponse> CreatePhotographedCoinAsync(int collectionId, string title = "Photographed coin",
        string countryCode = "DE", int year = 2006, Denomination denomination = Denomination.Euro2)
    {
        using var response = await Client.PostCoinWithPhotosAsync("/api/coins/with-photos",
            NewCoin(collectionId, title, countryCode, year, denomination), national: TestImages.Png(200, 160));
        return await response.ReadJsonAsync<CoinResponse>();
    }

    /// <summary>
    /// Makes the collection Public: first adds photographed coins up to the minimum
    /// (<see cref="CoinPortalFactory.MinPublicCoins"/>). Its other coins must have photos already.
    /// </summary>
    public async Task<CollectionResponse> PublishAsync(CollectionResponse collection)
    {
        var current = await Client.GetJsonAsync<CollectionResponse>($"/api/collections/{collection.Id}");
        for (var i = current.PhotographedCoinCount; i < current.MinPublicCoins; i++)
        {
            await CreatePhotographedCoinAsync(collection.Id, $"Photographed coin {i + 1}");
        }
        return await SetVisibilityAsync(current, CollectionVisibility.Public);
    }

    /// <summary>A new collection made Public (<see cref="PublishAsync"/>).</summary>
    public async Task<CollectionResponse> CreatePublicCollectionAsync(string? name = null) =>
        await PublishAsync(await CreateCollectionAsync(name));

    /// <summary>Uploads a photo of one side (a 200x160 PNG unless given) and returns it.</summary>
    public async Task<CoinPhotoResponse> UploadPhotoAsync(int coinId, CoinSide side = CoinSide.National,
        byte[]? image = null)
    {
        using var response = await Client.PutFileAsync($"/api/coins/{coinId}/photos/{side}",
            image ?? TestImages.Png(200, 160));
        return (await response.ReadJsonAsync<CoinResponse>()).Photos.Single(p => p.Side == side);
    }

    /// <summary>Uploads a cover (a 640x360 PNG unless given) and returns its id.</summary>
    public async Task<Guid> UploadCoverAsync(int collectionId, byte[]? image = null)
    {
        using var response = await Client.PutFileAsync($"/api/collections/{collectionId}/cover",
            image ?? TestImages.Png(640, 360));
        return (await response.ReadJsonAsync<CollectionCoverImageResponse>()).CoverImageId;
    }

    /// <summary>A coin other than a euro coin: a face value in a currency, from any country.</summary>
    public static CoinUpsertRequest NewOtherCoin(int collectionId, string title = "25 kuruş · Türkiye · 1975",
        decimal faceValue = 25, string currency = "kuruş", string countryCode = "TR", int year = 1975) => new()
        {
            CollectionId = collectionId,
            Title = title,
            Kind = CoinKind.Other,
            FaceValue = faceValue,
            Currency = currency,
            CountryCode = countryCode,
            Year = year,
        };

    public async Task<CoinResponse> CreateOtherCoinAsync(int collectionId, string title = "25 kuruş · Türkiye · 1975")
    {
        using var response = await Client.PostAsync("/api/coins", NewOtherCoin(collectionId, title));
        return await response.ReadJsonAsync<CoinResponse>();
    }

    public static CoinUpsertRequest NewCoin(int collectionId, string title = "Test coin",
        string countryCode = "DE", int year = 2006, Denomination denomination = Denomination.Euro2) => new()
        {
            CollectionId = collectionId,
            Title = title,
            CountryCode = countryCode,
            Year = year,
            Denomination = denomination,
        };
}
