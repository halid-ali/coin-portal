using CoinPortal.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace CoinPortal.Api.Publishing;

/// <summary>
/// What one action does to a collection: adds a coin that is not photographed, or takes
/// photographed coins away (deleted, moved out).
/// </summary>
public sealed record CollectionChange(int CollectionId, bool AddsUnphotographed = false, int RemovesPhotographed = 0);

/// <summary>
/// Keeps Public collections within <see cref="PublicationRules"/>. An action that would break the
/// rule of a Public collection is refused (409 would_unpublish) unless the user confirmed it; then
/// the action goes ahead and the collection becomes Unlisted in the same save.
/// No lock: two requests of the same user at once can both pass the minimum (like the photo
/// quota). The photo part holds anyway, every check of it looks at the coin itself.
/// </summary>
public sealed class PublicationGuard(AppDbContext db)
{
    public Task<int> MinPublicCoinsAsync(CancellationToken ct) =>
        db.SiteSettings.AsNoTracking()
            .Where(s => s.Id == SiteSettings.SingletonId)
            .Select(s => s.MinPublicCoins)
            .SingleAsync(ct);

    public async Task<PublicationStatus> StatusAsync(int collectionId, CancellationToken ct)
    {
        var coins = db.Coins.Where(c => c.CollectionId == collectionId);
        return new PublicationStatus(
            await coins.CountAsync(ct),
            await coins.CountAsync(PublicationRules.IsPhotographed, ct),
            await MinPublicCoinsAsync(ct));
    }

    /// <summary>
    /// The Public collections these changes would break, tracked, so the caller can unpublish them
    /// (<see cref="Unpublish"/>) in its own save. Only a change that lowers the count is held
    /// against the minimum: a Public collection below a raised minimum stays Public until then.
    /// </summary>
    public async Task<List<Collection>> BrokenByAsync(IEnumerable<CollectionChange> changes, CancellationToken ct)
    {
        var relevant = changes.Where(c => c.AddsUnphotographed || c.RemovesPhotographed > 0).ToList();
        if (relevant.Count == 0)
        {
            return [];
        }

        var ids = relevant.Select(c => c.CollectionId).Distinct().ToList();
        var publicOnes = await db.Collections
            .Where(c => ids.Contains(c.Id) && c.Visibility == CollectionVisibility.Public)
            .ToListAsync(ct);

        List<Collection> broken = [];
        int? minPublicCoins = null;
        foreach (var collection in publicOnes)
        {
            var own = relevant.Where(c => c.CollectionId == collection.Id).ToList();
            if (own.Any(c => c.AddsUnphotographed))
            {
                broken.Add(collection);
                continue;
            }

            minPublicCoins ??= await MinPublicCoinsAsync(ct);
            var photographed = await db.Coins.Where(c => c.CollectionId == collection.Id)
                .CountAsync(PublicationRules.IsPhotographed, ct);
            if (photographed - own.Sum(c => c.RemovesPhotographed) < minPublicCoins)
            {
                broken.Add(collection);
            }
        }
        return broken;
    }

    /// <summary>Public → Unlisted: a new share link, the public address stops working.</summary>
    public static void Unpublish(IEnumerable<Collection> collections, DateTime now)
    {
        foreach (var collection in collections)
        {
            collection.SetVisibility(CollectionVisibility.Unlisted);
            collection.UpdatedAtUtc = now;
        }
    }
}
