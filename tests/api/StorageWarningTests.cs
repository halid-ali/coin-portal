using System.Net;
using CoinPortal.Api.Data;
using CoinPortal.Api.Email;
using CoinPortal.Api.Photos;
using CoinPortal.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CoinPortal.Api.Tests;

/// <summary>
/// The e-mails at 75 % and 90 % of the photo storage (Photos.StorageWarnings, user decisions
/// 2026-10-10). The quota is <see cref="CoinPortalFactory.UserQuotaMegabytes"/> (300 MB): 75 % is
/// 225 MB, 90 % 270 MB, the resets 70 % (210 MB) and 85 % (255 MB). The use is set by making one
/// photo as big as needed. The quota changing: SiteSettingsTests.
/// </summary>
public class StorageWarningTests(CoinPortalFactory factory)
{
    private const long MB = PhotoQuota.BytesPerMegabyte;
    private const long Quota = CoinPortalFactory.UserQuotaMegabytes * MB;

    [Theory]
    [InlineData(0, StorageWarningLevel.None)]
    [InlineData(225 * MB - 1, StorageWarningLevel.None)]
    [InlineData(225 * MB, StorageWarningLevel.Filling)]
    [InlineData(270 * MB - 1, StorageWarningLevel.Filling)]
    [InlineData(270 * MB, StorageWarningLevel.NearlyFull)]
    [InlineData(400 * MB, StorageWarningLevel.NearlyFull)]
    public void LevelOf_FollowsTheShares(long used, StorageWarningLevel expected) =>
        Assert.Equal(expected, StorageWarnings.LevelOf(used, Quota));

    [Theory]
    [InlineData(StorageWarningLevel.NearlyFull, 255 * MB, StorageWarningLevel.NearlyFull)]
    [InlineData(StorageWarningLevel.NearlyFull, 255 * MB - 1, StorageWarningLevel.Filling)]
    [InlineData(StorageWarningLevel.NearlyFull, 210 * MB - 1, StorageWarningLevel.None)]
    [InlineData(StorageWarningLevel.Filling, 210 * MB, StorageWarningLevel.Filling)]
    [InlineData(StorageWarningLevel.Filling, 210 * MB - 1, StorageWarningLevel.None)]
    [InlineData(StorageWarningLevel.None, 260 * MB, StorageWarningLevel.None)]
    public void Kept_ForgetsAWarningOnlyWellBelowItsShare(StorageWarningLevel sent, long used,
        StorageWarningLevel expected) =>
        Assert.Equal(expected, StorageWarnings.Kept(sent, used, Quota));

    [Fact]
    public async Task PhotoUpload_PastSeventyFivePercent_MailsOnce_InTheUsersLanguage()
    {
        var alice = await factory.SignUpAsync(language: "tr");
        var (coin, _) = await CoinWithBigPhotoAsync(alice, 230);

        await alice.UploadPhotoAsync(coin.Id, CoinSide.Common);

        var mail = await WaitForWarningAsync(alice);
        Assert.Equal("CoinVitrine: fotoğraf alanının %75'i doldu", mail.Subject);
        Assert.Contains("230 MB / 300 MB", mail.Body);
        Assert.Contains("/settings/account", mail.Body);
        Assert.Contains("Fotoğraf alanına bak", mail.HtmlBody);
        Assert.Equal(StorageWarningLevel.Filling, await LevelAsync(alice));

        // Once: another upload and another check send nothing new
        await alice.UploadCoverAsync((await alice.FirstCollectionAsync()).Id);
        Assert.False(await CheckAsync(alice));
        Assert.Single(Warnings(alice));
    }

    [Fact]
    public async Task CoverUpload_PastNinetyPercent_SendsOnlyTheNearlyFullWarning()
    {
        var alice = await factory.SignUpAsync();
        await CoinWithBigPhotoAsync(alice, 280);

        await alice.UploadCoverAsync((await alice.FirstCollectionAsync()).Id);

        var mail = await WaitForWarningAsync(alice);
        Assert.Equal("CoinVitrine: your photo storage is nearly full", mail.Subject);
        Assert.DoesNotContain("once more", mail.Body);
        Assert.Equal(StorageWarningLevel.NearlyFull, await LevelAsync(alice));
        Assert.False(await CheckAsync(alice));
        Assert.Single(Warnings(alice));
    }

    [Fact]
    public async Task NewCoinWithPhotos_PastSeventyFivePercent_Mails()
    {
        var alice = await factory.SignUpAsync();
        var (coin, _) = await CoinWithBigPhotoAsync(alice, 240);

        await alice.CreatePhotographedCoinAsync(coin.CollectionId);

        var mail = await WaitForWarningAsync(alice);
        Assert.Equal("CoinVitrine: 75% of your photo storage is used", mail.Subject);
        Assert.Contains("We will write once more when 90% is used.", mail.Body);
    }

    [Fact]
    public async Task Warning_ComesAgain_OnlyAfterTheUseFellWellBelow()
    {
        var alice = await factory.SignUpAsync();
        var (_, big) = await CoinWithBigPhotoAsync(alice, 230);
        Assert.True(await CheckAsync(alice));

        // Down to 72 % and up again: still the same warning, nothing new
        await ResizeAsync(big, 216);
        Assert.False(await CheckAsync(alice));
        Assert.Equal(StorageWarningLevel.Filling, await LevelAsync(alice));
        await ResizeAsync(big, 230);
        Assert.False(await CheckAsync(alice));

        // Up to 90 %: the next warning
        await ResizeAsync(big, 275);
        Assert.True(await CheckAsync(alice));
        Assert.Equal(StorageWarningLevel.NearlyFull, await LevelAsync(alice));

        // Below 85 % the 90 % warning is forgotten, below 70 % the 75 % one too
        await ResizeAsync(big, 250);
        Assert.False(await CheckAsync(alice));
        Assert.Equal(StorageWarningLevel.Filling, await LevelAsync(alice));
        await ResizeAsync(big, 200);
        Assert.False(await CheckAsync(alice));
        Assert.Equal(StorageWarningLevel.None, await LevelAsync(alice));

        await ResizeAsync(big, 230);
        Assert.True(await CheckAsync(alice));
        Assert.Equal(["CoinVitrine: 75% of your photo storage is used", "CoinVitrine: your photo storage is nearly full",
                "CoinVitrine: 75% of your photo storage is used"],
            Warnings(alice).Select(m => m.Subject));
    }

    [Fact]
    public async Task Deleting_ChecksTheStorage_AndResetsTheWarning()
    {
        var alice = await factory.SignUpAsync();
        var (coin, big) = await CoinWithBigPhotoAsync(alice, 230);
        await alice.UploadPhotoAsync(coin.Id, CoinSide.Common);
        await WaitForWarningAsync(alice);
        await ResizeAsync(big, 100);

        using (var delete = await alice.Client.DeleteAsync($"/api/coins/{coin.Id}/photos/Common"))
        {
            await delete.ShouldHaveStatusAsync(HttpStatusCode.NoContent);
        }

        await WaitUntilAsync(async () => await LevelAsync(alice) == StorageWarningLevel.None);
    }

    [Fact]
    public async Task FailedSend_IsTriedAgainAtTheNextCheck()
    {
        var alice = await factory.SignUpAsync();
        await CoinWithBigPhotoAsync(alice, 230);
        factory.Mail.FailWhen = m => m.ToAddress == alice.User.Email;
        try
        {
            Assert.False(await CheckAsync(alice));
            Assert.Equal(StorageWarningLevel.None, await LevelAsync(alice));
        }
        finally
        {
            factory.Mail.FailWhen = _ => false;
        }

        Assert.True(await CheckAsync(alice));
        Assert.Single(Warnings(alice));
        Assert.Equal(StorageWarningLevel.Filling, await LevelAsync(alice));
    }

    [Fact]
    public async Task UnverifiedAndLockedAccounts_GetNoWarning()
    {
        var unverified = await factory.SignUpAsync(confirmEmail: false);
        var locked = await factory.SignUpAsync();
        await CoinWithBigPhotoAsync(unverified, 280);
        await CoinWithBigPhotoAsync(locked, 280);
        await factory.WithDbAsync(db => db.Users.Where(u => u.Id == locked.User.Id)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.LockedAtUtc, DateTime.UtcNow)));

        Assert.False(await CheckAsync(unverified));
        Assert.False(await CheckAsync(locked));

        Assert.Empty(Warnings(unverified));
        Assert.Empty(Warnings(locked));
        Assert.Equal(StorageWarningLevel.None, await LevelAsync(unverified));
        Assert.Equal(StorageWarningLevel.None, await LevelAsync(locked));
    }

    /// <summary>
    /// A coin whose national side photo takes <paramref name="megabytes"/>: only its row, written
    /// directly, so no upload queues a check of its own (the sizes count, not the files).
    /// </summary>
    private async Task<(Contracts.Coins.CoinResponse Coin, Guid Photo)> CoinWithBigPhotoAsync(TestUser user,
        int megabytes)
    {
        var coin = await user.CreateCoinAsync((await user.FirstCollectionAsync()).Id);
        var photo = new CoinPhoto
        {
            Id = Guid.NewGuid(),
            CoinId = coin.Id,
            Side = CoinSide.National,
            SizeBytes = megabytes * MB,
            CreatedAtUtc = DateTime.UtcNow,
        };
        await factory.WithDbAsync(async db =>
        {
            db.CoinPhotos.Add(photo);
            return await db.SaveChangesAsync();
        });
        return (coin, photo.Id);
    }

    private Task ResizeAsync(Guid photoId, long megabytes) =>
        factory.WithDbAsync(db => db.CoinPhotos.Where(p => p.Id == photoId)
            .ExecuteUpdateAsync(s => s.SetProperty(p => p.SizeBytes, megabytes * MB)));

    private Task<bool> CheckAsync(TestUser user) =>
        factory.Services.GetRequiredService<StorageWarnings>().CheckAsync(user.User.Id, CancellationToken.None);

    private Task<StorageWarningLevel> LevelAsync(TestUser user) =>
        factory.WithDbAsync(db => db.Users.Where(u => u.Id == user.User.Id)
            .Select(u => u.StorageWarningLevel).SingleAsync());

    private List<MailMessage> Warnings(TestUser user) =>
        factory.Mail.To(user.User.Email).Where(m => m.Body.Contains("/settings/account")).ToList();

    private async Task<MailMessage> WaitForWarningAsync(TestUser user)
    {
        await WaitUntilAsync(() => Task.FromResult(Warnings(user).Count > 0));
        return Warnings(user).Single();
    }

    private static async Task WaitUntilAsync(Func<Task<bool>> done)
    {
        var until = DateTime.UtcNow.AddSeconds(10);
        while (!await done())
        {
            Assert.True(DateTime.UtcNow < until, "Timed out waiting for the storage check.");
            await Task.Delay(20);
        }
    }
}
