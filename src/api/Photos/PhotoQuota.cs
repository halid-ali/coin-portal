using CoinPortal.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace CoinPortal.Api.Photos;

/// <summary>
/// Per-user storage limit (the site setting <see cref="SiteSettings.UserQuotaMegabytes"/>) over coin
/// photos and collection covers together. Sizes come from the database, not from the disk.
/// </summary>
public class PhotoQuota(AppDbContext db)
{
    public const long BytesPerMegabyte = 1024L * 1024;

    /// <summary>The limit every user has now.</summary>
    public async Task<long> LimitBytesAsync(CancellationToken ct) =>
        await db.SiteSettings
            .Where(s => s.Id == SiteSettings.SingletonId)
            .Select(s => s.UserQuotaMegabytes)
            .SingleAsync(ct) * BytesPerMegabyte;

    /// <summary>What the user's photos and covers take; the image being replaced does not count.</summary>
    public async Task<long> UsedBytesAsync(string ownerId, Guid? replacedImageId, CancellationToken ct)
    {
        var photos = await db.CoinPhotos
            .Where(p => p.Coin.OwnerId == ownerId && p.Id != replacedImageId)
            .SumAsync(p => (long?)p.SizeBytes, ct) ?? 0;
        var covers = await db.Collections
            .Where(c => c.OwnerId == ownerId && c.CoverImageId != null && c.CoverImageId != replacedImageId)
            .SumAsync(c => (long?)c.CoverSizeBytes, ct) ?? 0;
        return photos + covers;
    }

    /// <summary>
    /// Null if <paramref name="newBytes"/> still fit, otherwise the limit (for the error). The image
    /// being replaced (<paramref name="replacedImageId"/>) does not count.
    /// </summary>
    public async Task<long?> ExceededLimitAsync(string ownerId, long newBytes, Guid? replacedImageId,
        CancellationToken ct)
    {
        var limit = await LimitBytesAsync(ct);
        return await UsedBytesAsync(ownerId, replacedImageId, ct) + newBytes <= limit ? null : limit;
    }
}
