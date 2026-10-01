using CoinPortal.Api.Contracts.Admin;
using CoinPortal.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CoinPortal.Api.Controllers.Admin;

/// <summary>Site-wide numbers for the panel's overview. Counts only, no content.</summary>
[Route("api/admin/stats")]
public class AdminStatsController(AppDbContext db) : AdminControllerBase
{
    [HttpGet]
    public async Task<AdminStatsResponse> Get(CancellationToken ct)
    {
        var since = DateTime.UtcNow.AddDays(-30);
        var collections = await db.Collections
            .GroupBy(c => c.Visibility)
            .Select(g => new { Visibility = g.Key, Count = g.Count() })
            .ToListAsync(ct);
        int CountOf(CollectionVisibility v) => collections.Where(c => c.Visibility == v).Sum(c => c.Count);

        return new AdminStatsResponse(
            UserCount: await db.Users.CountAsync(ct),
            ActiveUsersLast30Days: await db.Users.CountAsync(u => u.LastSeenAtUtc >= since, ct),
            NewUsersLast30Days: await db.Users.CountAsync(u => u.CreatedAtUtc >= since, ct),
            LockedUserCount: await db.Users.CountAsync(u => u.LockedAtUtc != null, ct),
            CollectionCount: collections.Sum(c => c.Count),
            PublicCollectionCount: CountOf(CollectionVisibility.Public),
            UnlistedCollectionCount: CountOf(CollectionVisibility.Unlisted),
            HiddenCollectionCount: await db.Collections.CountAsync(c => c.ModerationLockedAtUtc != null, ct),
            CoinCount: await db.Coins.CountAsync(ct),
            PhotoCount: await db.CoinPhotos.CountAsync(ct),
            StorageBytes: await db.CoinPhotos.SumAsync(p => p.SizeBytes, ct)
                + await db.Collections.SumAsync(c => c.CoverSizeBytes, ct));
    }
}
