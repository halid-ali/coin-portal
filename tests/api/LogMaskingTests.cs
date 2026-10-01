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
    public void ShareKeys_AreMaskedInLoggedAddresses(string address, string logged) =>
        Assert.Equal(logged, AppLogging.MaskShareKeys(address));
}
