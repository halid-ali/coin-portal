using CoinPortal.Api.Authorization;
using CoinPortal.Api.Contracts.Admin;
using CoinPortal.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CoinPortal.Api.Controllers.Admin;

/// <summary>Site-wide numbers for the panel's overview. Counts only, no content.</summary>
[ApiController]
[Route("api/admin/stats")]
[Authorize(Policy = AuthPolicies.Admin)]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
[ProducesResponseType(StatusCodes.Status403Forbidden)]
public class AdminStatsController(AppDbContext db) : ControllerBase
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
            NewUsersLast30Days: await db.Users.CountAsync(u => u.CreatedAtUtc >= since, ct),
            CollectionCount: collections.Sum(c => c.Count),
            PublicCollectionCount: CountOf(CollectionVisibility.Public),
            UnlistedCollectionCount: CountOf(CollectionVisibility.Unlisted),
            CoinCount: await db.Coins.CountAsync(ct),
            PhotoCount: await db.CoinPhotos.CountAsync(ct),
            StorageBytes: await db.CoinPhotos.SumAsync(p => p.SizeBytes, ct)
                + await db.Collections.SumAsync(c => c.CoverSizeBytes, ct));
    }
}
