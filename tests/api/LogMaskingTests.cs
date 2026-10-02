using CoinPortal.Api.Hosting;

namespace CoinPortal.Api.Tests;

public class LogMaskingTests
{
    [Theory]
    [InlineData("/s/AbC123xyz", "/s/***")]
    [InlineData("/s/AbC123xyz?view=grid", "/s/***?view=grid")]
    [InlineData("/api/public/shared/AbC123xyz/coins?page=2", "/api/public/shared/***/coins?page=2")]
    [InlineData("/api/coins/5/photos/National/thumb?v=abc&s=AbC123xyz", "/api/coins/5/photos/National/thumb?v=abc&s=***")]
    [InlineData("/api/collections/3/cover?s=AbC123xyz&v=abc", "/api/collections/3/cover?s=***&v=abc")]
    [InlineData("/collections/5?sort=year&size=20", "/collections/5?sort=year&size=20")]
    [InlineData("/settings/profile", "/settings/profile")]
    // Search terms and the explore filter are personal data
    [InlineData("/api/admin/users?search=alice@example.com&page=2", "/api/admin/users?search=***&page=2")]
    [InlineData("/api/coins?collectionId=3&search=Belçika", "/api/coins?collectionId=3&search=***")]
    [InlineData("/api/public/coins?owner=ayse.yilmaz", "/api/public/coins?owner=***")]
    [InlineData("/explore?sort=year&size=20", "/explore?sort=year&size=20")]
    public void SecretsAndSearchTerms_AreMaskedInLoggedAddresses(string address, string logged) =>
        Assert.Equal(logged, AppLogging.MaskLoggedAddress(address));
}
