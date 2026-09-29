using CoinPortal.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace CoinPortal.Api.Photos;

/// <summary>
/// Per-user storage limit (PhotoStorage:UserQuotaBytes) over coin photos and collection covers
/// together. Sizes come from the database, not from the disk.
/// </summary>
public class PhotoQuota(AppDbContext db, IOptions<PhotoOptions> options)
{
    public long LimitBytes => options.Value.UserQuotaBytes;

    /// <summary>
    /// True if <paramref name="newBytes"/> still fit. The image being replaced
    /// (<paramref name="replacedImageId"/>) does not count.
    /// </summary>
    public async Task<bool> FitsAsync(string ownerId, long newBytes, Guid? replacedImageId, CancellationToken ct)
    {
        var photos = await db.CoinPhotos
            .Where(p => p.Coin.OwnerId == ownerId && p.Id != replacedImageId)
            .SumAsync(p => (long?)p.SizeBytes, ct) ?? 0;
        var covers = await db.Collections
            .Where(c => c.OwnerId == ownerId && c.CoverImageId != null && c.CoverImageId != replacedImageId)
            .SumAsync(c => (long?)c.CoverSizeBytes, ct) ?? 0;
        return photos + covers + newBytes <= LimitBytes;
    }
}
