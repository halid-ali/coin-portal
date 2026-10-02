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
