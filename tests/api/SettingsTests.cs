using System.Net;
using CoinPortal.Api.Contracts.Auth;
using CoinPortal.Api.Contracts.Settings;
using CoinPortal.Api.Data;
using CoinPortal.Api.Photos;
using CoinPortal.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace CoinPortal.Api.Tests;

public class SettingsTests(CoinPortalFactory factory)
{
    [Fact]
    public async Task NewUser_HasOnlyTheSignUpLanguage()
    {
        var alice = await factory.SignUpAsync("tr");

        var settings = await alice.Client.GetJsonAsync<UserSettingsResponse>("/api/settings");

        Assert.Equal(new UserSettingsResponse("tr", null, null), settings);
    }

    [Fact]
    public async Task Storage_CountsOwnPhotosAndCovers_AgainstTheQuota()
    {
        var alice = await factory.SignUpAsync();
        var bob = await factory.SignUpAsync();
        const long quota = CoinPortalFactory.UserQuotaMegabytes * PhotoQuota.BytesPerMegabyte;

        Assert.Equal(new StorageResponse(0, quota),
            await alice.Client.GetJsonAsync<StorageResponse>("/api/settings/storage"));

        var collection = await alice.FirstCollectionAsync();
        var coin = await alice.CreateCoinAsync(collection.Id);
        await alice.UploadPhotoAsync(coin.Id);
        await alice.UploadCoverAsync(collection.Id);
        var bobCoin = await bob.CreateCoinAsync((await bob.FirstCollectionAsync()).Id);
        await bob.UploadPhotoAsync(bobCoin.Id);
        var stored = await factory.WithDbAsync(async db =>
            await db.CoinPhotos.Where(p => p.CoinId == coin.Id).SumAsync(p => p.SizeBytes)
            + await db.Collections.Where(c => c.Id == collection.Id).SumAsync(c => c.CoverSizeBytes));

        // Photo and cover, not bob's
        Assert.True(stored > 0);
        Assert.Equal(new StorageResponse(stored, quota),
            await alice.Client.GetJsonAsync<StorageResponse>("/api/settings/storage"));
    }

    [Fact]
    public async Task Update_SavesEverySetting_AndMeShowsThem()
    {
        var alice = await factory.SignUpAsync();

        using var response = await alice.Client.PutAsync("/api/settings",
            new UserSettingsRequest("bg", ThemePreference.Dark, AccentColor.Teal));
        var me = await alice.Client.GetJsonAsync<UserResponse>("/api/auth/me");

        Assert.Equal(new UserSettingsResponse("bg", ThemePreference.Dark, AccentColor.Teal),
            await response.ReadJsonAsync<UserSettingsResponse>());
        Assert.Equal(("bg", ThemePreference.Dark, AccentColor.Teal), (me.Language, me.Theme, me.Accent));
    }

    [Fact]
    public async Task Update_NullKeepsASettingUnchosen()
    {
        // Changing only the theme must not turn the device language into an explicit choice
        var alice = await factory.SignUpAsync(language: null);

        using var response = await alice.Client.PutAsync("/api/settings",
            new UserSettingsRequest(null, ThemePreference.System, null));

        Assert.Equal(new UserSettingsResponse(null, ThemePreference.System, null),
            await response.ReadJsonAsync<UserSettingsResponse>());
    }

    [Theory]
    [InlineData("""{"language":"fr","theme":null,"accent":null}""")] // unsupported language
    [InlineData("""{"language":null,"theme":"Sepia","accent":null}""")] // unknown theme
    [InlineData("""{"language":null,"theme":2,"accent":null}""")] // enum as number
    [InlineData("""{"language":null,"theme":null,"accent":"Pink"}""")] // unknown accent
    public async Task Update_InvalidValue_IsRejected(string json)
    {
        var alice = await factory.SignUpAsync();

        using var response = await alice.Client.SendRawJsonAsync(HttpMethod.Put, "/api/settings", json);

        await response.ShouldHaveStatusAsync(HttpStatusCode.BadRequest);
        Assert.Equal(new UserSettingsResponse("en", null, null),
            await alice.Client.GetJsonAsync<UserSettingsResponse>("/api/settings"));
    }

    [Fact]
    public async Task SignedOut_HasNoSettings()
    {
        using var client = await factory.CreateAnonymousClientAsync();

        using var response = await client.GetAsync("/api/settings");

        await response.ShouldHaveStatusAsync(HttpStatusCode.Unauthorized);
    }
}
