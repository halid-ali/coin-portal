using System.Globalization;
using CoinPortal.Api.Accounts;
using CoinPortal.Api.Contracts.Collections;
using CoinPortal.Api.Data;
using CoinPortal.Api.Photos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace CoinPortal.Api.Controllers;

/// <summary>
/// The signed-in user's collections. Other users' collections are reported as 404.
/// Errors that the client words itself carry a code: DuplicateName (validation key),
/// last_collection, has_coins, collection_limit, invalid_target, not_unlisted and moderation_locked (ProblemDetails "code").
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
public class CollectionsController(
    AppDbContext db,
    UserManager<ApplicationUser> userManager,
    IPhotoStorage photoStorage,
    IOptions<UserLimitOptions> limits) : ControllerBase
{
    private string CurrentUserId => userManager.GetUserId(User)!;

    /// <summary>Oldest first, so the default collection leads.</summary>
    [HttpGet]
    public async Task<IReadOnlyList<CollectionResponse>> List(CancellationToken ct)
    {
        var userId = CurrentUserId;
        // Order before projecting: EF cannot sort on the constructed response
        return await Project(db.Collections.Where(c => c.OwnerId == userId)
                .OrderBy(c => c.CreatedAtUtc).ThenBy(c => c.Id))
            .ToListAsync(ct);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CollectionResponse>> Get(int id, CancellationToken ct)
    {
        var userId = CurrentUserId;
        var collection = await Project(db.Collections.Where(c => c.Id == id && c.OwnerId == userId))
            .FirstOrDefaultAsync(ct);
        return collection is null ? NotFound() : collection;
    }

    [HttpPost]
    [ProducesResponseType<CollectionResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CollectionResponse>> Create(CollectionUpsertRequest request, CancellationToken ct)
    {
        var userId = CurrentUserId;
        if (await db.Collections.CountAsync(c => c.OwnerId == userId, ct) >= limits.Value.MaxCollections)
        {
            return this.CodedProblem("collection_limit", "You have reached the maximum number of collections.");
        }

        var now = DateTime.UtcNow;
        var collection = new Collection { OwnerId = userId, CreatedAtUtc = now };
        if (!await TryApplyAsync(collection, request, now, ct))
        {
            return ValidationProblem(ModelState);
        }

        db.Collections.Add(collection);
        if (!await TrySaveAsync(ct))
        {
            return ValidationProblem(ModelState);
        }

        return CreatedAtAction(nameof(Get), new { id = collection.Id }, await ProjectOneAsync(collection.Id, ct));
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CollectionResponse>> Update(
        int id, CollectionUpsertRequest request, CancellationToken ct)
    {
        var collection = await FindOwnedAsync(id, ct);
        if (collection is null)
        {
            return NotFound();
        }

        // Hidden by an admin: name and description may change, sharing may not
        if (collection.ModerationLockedAtUtc is not null
            && request.Visibility is { } visibility && visibility != CollectionVisibility.Private)
        {
            return this.CodedProblem("moderation_locked", "An administrator has hidden this collection.",
                StatusCodes.Status403Forbidden);
        }

        if (!await TryApplyAsync(collection, request, DateTime.UtcNow, ct) || !await TrySaveAsync(ct))
        {
            return ValidationProblem(ModelState);
        }

        return await ProjectOneAsync(collection.Id, ct);
    }

    /// <summary>
    /// Deletes a collection. With <paramref name="moveTo"/> its coins move to that collection of
    /// the same user first; with <paramref name="deleteCoins"/> the coins and their photos are
    /// deleted too. A collection with coins and neither is refused (409 has_coins): a page opened
    /// before coins were added cannot delete them by accident. The name confirmation is the
    /// client's job. The last collection of a user cannot be deleted.
    /// </summary>
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(int id, [FromQuery] int? moveTo, [FromQuery] bool deleteCoins,
        CancellationToken ct)
    {
        var userId = CurrentUserId;
        var collection = await FindOwnedAsync(id, ct);
        if (collection is null)
        {
            return NotFound();
        }
        // Moving the coins of a hidden collection elsewhere would publish them again; deleting
        // them with the collection is allowed
        if (moveTo is not null && collection.ModerationLockedAtUtc is not null)
        {
            return this.CodedProblem("moderation_locked", "An administrator has hidden this collection.",
                StatusCodes.Status403Forbidden);
        }

        List<Guid> photoIds = [];
        // Run by the execution strategy, which repeats the whole unit after a transient error
        var refused = await db.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
        {
            photoIds = [];
            await using var transaction = await db.Database.BeginTransactionAsync(ct);

            // The user's collections stay locked until the commit: two deletions at the same time
            // cannot both pass the "not the last one" check, and the move target cannot vanish
            var ownIds = await db.Database
                .SqlQuery<int>($"SELECT Id AS Value FROM Collections WITH (UPDLOCK, HOLDLOCK) WHERE OwnerId = {userId}")
                .ToListAsync(ct);
            if (ownIds.Count <= 1)
            {
                return this.CodedProblem("last_collection", "The only collection cannot be deleted.");
            }
            if (moveTo is { } targetId && (targetId == id || !ownIds.Contains(targetId)))
            {
                return this.CodedProblem("invalid_target", "Choose another collection of yours to move the coins to.");
            }

            var coins = db.Coins.Where(c => c.CollectionId == id);
            if (moveTo is null && !deleteCoins && await coins.AnyAsync(ct))
            {
                return this.CodedProblem("has_coins", "The collection has coins: move them or delete them too.",
                    StatusCodes.Status409Conflict);
            }
            if (moveTo is { } target)
            {
                await coins.ExecuteUpdateAsync(s => s.SetProperty(c => c.CollectionId, target), ct);
            }
            else
            {
                photoIds = await db.CoinPhotos.Where(p => p.Coin.CollectionId == id).Select(p => p.Id).ToListAsync(ct);
                // Photo rows go with the coins (database cascade)
                await coins.ExecuteDeleteAsync(ct);
            }

            db.Collections.Remove(collection);
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
            return (IActionResult?)null;
        });
        if (refused is not null)
        {
            return refused;
        }

        // Files only after the rows are gone
        foreach (var photoId in photoIds)
        {
            await photoStorage.DeleteAsync(userId, photoId);
        }
        if (collection.CoverImageId is { } coverId)
        {
            await photoStorage.DeleteAsync(userId, coverId);
        }

        return NoContent();
    }

    /// <summary>
    /// New secret for the share link of an Unlisted collection; the old link stops working.
    /// </summary>
    [HttpPost("{id:int}/share-token")]
    [ProducesResponseType<ShareTokenResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ShareTokenResponse>> RegenerateShareToken(int id, CancellationToken ct)
    {
        var collection = await FindOwnedAsync(id, ct);
        if (collection is null)
        {
            return NotFound();
        }
        if (collection.Visibility != CollectionVisibility.Unlisted)
        {
            return this.CodedProblem("not_unlisted", "Only collections shared by link have a share link.");
        }

        collection.ShareToken = Collection.NewShareToken();
        collection.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return new ShareTokenResponse(collection.ShareToken);
    }

    // The token exists exactly while the collection is Unlisted
    private static void SetVisibility(Collection collection, CollectionVisibility visibility)
    {
        collection.Visibility = visibility;
        if (visibility != CollectionVisibility.Unlisted)
        {
            collection.ShareToken = null;
        }
        else
        {
            collection.ShareToken ??= Collection.NewShareToken();
        }
    }

    private Task<Collection?> FindOwnedAsync(int id, CancellationToken ct)
    {
        var userId = CurrentUserId;
        return db.Collections.FirstOrDefaultAsync(c => c.Id == id && c.OwnerId == userId, ct);
    }

    private Task<CollectionResponse> ProjectOneAsync(int id, CancellationToken ct) =>
        Project(db.Collections.Where(c => c.Id == id)).FirstAsync(ct);

    // Coin count in the same query
    private static IQueryable<CollectionResponse> Project(IQueryable<Collection> collections) =>
        collections.Select(c => new CollectionResponse(
            c.Id,
            c.Name,
            c.Description,
            c.Visibility,
            c.ModerationLockedAtUtc != null,
            c.ShareToken,
            c.Coins.Count,
            c.CoverImageId,
            c.CreatedAtUtc,
            c.UpdatedAtUtc));

    // Returns false after adding a model error
    private async Task<bool> TryApplyAsync(Collection collection, CollectionUpsertRequest request, DateTime now,
        CancellationToken ct)
    {
        var name = request.Name.Trim();
        if (name.Length == 0)
        {
            ModelState.AddModelError(nameof(CollectionUpsertRequest.Name), "The name is required.");
            return false;
        }

        // Compared in code: the database collation ignores case but not Turkish casing
        // ("LİSTE" vs "liste"). A user has only a few collections.
        var ownerId = collection.OwnerId;
        var otherNames = await db.Collections
            .Where(c => c.OwnerId == ownerId && c.Id != collection.Id)
            .Select(c => c.Name)
            .ToListAsync(ct);
        if (otherNames.Any(other => SameName(other, name)))
        {
            AddDuplicateNameError();
            return false;
        }

        collection.Name = name;
        collection.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        if (request.Visibility is { } visibility)
        {
            SetVisibility(collection, visibility);
        }
        collection.UpdatedAtUtc = now;
        return true;
    }

    // The unique index catches a duplicate created at the same moment
    private async Task<bool> TrySaveAsync(CancellationToken ct)
    {
        try
        {
            await db.SaveChangesAsync(ct);
            return true;
        }
        catch (DbUpdateException e) when (e.InnerException is SqlException { Number: 2601 or 2627 })
        {
            AddDuplicateNameError();
            return false;
        }
    }

    private static readonly CultureInfo Turkish = CultureInfo.GetCultureInfo("tr-TR");

    // Equal if equal in Turkish (İ/i, I/ı) or culture-independent casing
    private static bool SameName(string a, string b) =>
        string.Compare(a, b, Turkish, CompareOptions.IgnoreCase) == 0
        || string.Equals(a, b, StringComparison.InvariantCultureIgnoreCase);

    private void AddDuplicateNameError() =>
        ModelState.AddModelError("DuplicateName", "You already have a collection with this name.");
}
