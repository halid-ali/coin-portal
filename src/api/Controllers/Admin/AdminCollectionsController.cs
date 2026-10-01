using CoinPortal.Api.Contracts.Admin;
using CoinPortal.Api.Contracts.Coins;
using CoinPortal.Api.Contracts.Common;
using CoinPortal.Api.Data;
using CoinPortal.Api.Querying;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.EntityFrameworkCore;

namespace CoinPortal.Api.Controllers.Admin;

/// <summary>
/// Shared collections (public, unlisted) for moderation, and the ones an admin has hidden.
/// Hiding makes a collection Private (its share link stops working) and locks it, so the owner
/// cannot share it again until the lock is lifted. Other private collections are a 404 here.
/// </summary>
[Route("api/admin/collections")]
public class AdminCollectionsController(AppDbContext db) : AdminControllerBase
{
    // What the panel may see: shared, or hidden by an admin (it was shared until then)
    private IQueryable<Collection> Moderatable =>
        db.Collections.Where(c => c.Visibility != CollectionVisibility.Private || c.ModerationLockedAtUtc != null);

    [HttpGet]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<PagedResponse<AdminCollectionResponse>> List(
        [FromQuery] AdminCollectionQuery query, CancellationToken ct)
    {
        var collections = Moderatable.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim();
            collections = collections.Where(c => c.Name.Contains(term) || c.Owner.UserName!.Contains(term));
        }
        if (query.Visibility is { } visibility)
        {
            collections = collections.Where(c => c.Visibility == visibility);
        }
        if (query.Locked is { } locked)
        {
            collections = collections.Where(c => (c.ModerationLockedAtUtc != null) == locked);
        }

        var desc = query.Dir == SortDirection.Desc;
        var ordered = query.Sort switch
        {
            AdminCollectionSort.Name => desc ? collections.OrderByDescending(c => c.Name) : collections.OrderBy(c => c.Name),
            AdminCollectionSort.CoinCount => desc
                ? collections.OrderByDescending(c => c.Coins.Count)
                : collections.OrderBy(c => c.Coins.Count),
            _ => desc ? collections.OrderByDescending(c => c.UpdatedAtUtc) : collections.OrderBy(c => c.UpdatedAtUtc),
        };
        return await ordered.ThenBy(c => c.Id).ToPagedAsync(query.Page, query.PageSize,
            c => new AdminCollectionResponse(
                c.Id,
                c.Name,
                c.Description,
                c.OwnerId,
                c.Owner.UserName!,
                c.Owner.LockedAtUtc != null,
                c.Visibility,
                c.ShareToken,
                c.Coins.Count,
                c.CoverImageId,
                c.UpdatedAtUtc,
                c.ModerationLockedAtUtc), ct);
    }

    /// <summary>Hides the collection: Private, share link removed, locked against sharing.</summary>
    [HttpPut("{id:int}/lock")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Lock(int id,
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] AdminLockRequest? request, CancellationToken ct)
    {
        var collection = await Moderatable.Include(c => c.Owner).FirstOrDefaultAsync(c => c.Id == id, ct);
        if (collection is null)
        {
            return NotFound();
        }
        if (collection.ModerationLockedAtUtc is not null)
        {
            return NoContent();
        }

        collection.Visibility = CollectionVisibility.Private;
        collection.ShareToken = null;
        collection.ModerationLockedAtUtc = DateTime.UtcNow;
        Audit(db, AuditAction.CollectionHidden, collection: collection, note: request?.Note);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    /// <summary>Lifts the lock; the collection stays Private, sharing it again is the owner's choice.</summary>
    [HttpDelete("{id:int}/lock")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Unlock(int id,
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] AdminLockRequest? request, CancellationToken ct)
    {
        var collection = await Moderatable.Include(c => c.Owner).FirstOrDefaultAsync(c => c.Id == id, ct);
        if (collection is null)
        {
            return NotFound();
        }
        if (collection.ModerationLockedAtUtc is null)
        {
            return NoContent();
        }

        collection.ModerationLockedAtUtc = null;
        Audit(db, AuditAction.CollectionUnlocked, collection: collection, note: request?.Note);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
