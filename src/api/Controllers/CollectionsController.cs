using System.Globalization;
using CoinPortal.Api.Accounts;
using CoinPortal.Api.Contracts.Collections;
using CoinPortal.Api.Data;
using CoinPortal.Api.Photos;
using CoinPortal.Api.Publishing;
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
/// last_collection, has_coins, collection_limit, invalid_target, not_unlisted, moderation_locked,
/// public_requirements, would_unpublish and email_not_confirmed (ProblemDetails "code").
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
public class CollectionsController(
    AppDbContext db,
    UserManager<ApplicationUser> userManager,
    IPhotoStorage photoStorage,
    PublicationGuard publication,
    UnverifiedAccounts unverified,
    IOptions<UserLimitOptions> limits) : ControllerBase
{
    private string CurrentUserId => userManager.GetUserId(User)!;

    /// <summary>Oldest first, so the default collection leads.</summary>
    [HttpGet]
    public async Task<IReadOnlyList<CollectionResponse>> List(CancellationToken ct)
    {
        var userId = CurrentUserId;
        var minPublicCoins = await publication.MinPublicCoinsAsync(ct);
        // Order before projecting: EF cannot sort on the constructed response
        return await Project(db.Collections.Where(c => c.OwnerId == userId)
                .OrderBy(c => c.CreatedAtUtc).ThenBy(c => c.Id), minPublicCoins)
            .ToListAsync(ct);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CollectionResponse>> Get(int id, CancellationToken ct)
    {
        var userId = CurrentUserId;
        var minPublicCoins = await publication.MinPublicCoinsAsync(ct);
        var collection = await Project(db.Collections.Where(c => c.Id == id && c.OwnerId == userId), minPublicCoins)
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
        // The collection from sign-up is the only one until the address is confirmed
        if (!await EmailConfirmedAsync(ct))
        {
            return this.EmailNotConfirmed();
        }
        // A new collection has no coins yet
        if (request.Visibility == CollectionVisibility.Public)
        {
            return this.PublicRequirementsNotMet(
                new PublicationStatus(0, 0, await publication.MinPublicCoinsAsync(ct)));
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

        // A new way of sharing needs a verified address; what is shared already stays (accounts
        // from before verification existed)
        if (request.Visibility is CollectionVisibility.Public or CollectionVisibility.Unlisted
            && request.Visibility != collection.Visibility && !await EmailConfirmedAsync(ct))
        {
            return this.EmailNotConfirmed();
        }

        // Checked when it becomes Public; one that is Public already keeps it (a raised minimum
        // applies at its next change that lowers the count, PublicationGuard)
        if (request.Visibility == CollectionVisibility.Public && collection.Visibility != CollectionVisibility.Public)
        {
            var status = await publication.StatusAsync(collection.Id, ct);
            if (!status.CanBePublic)
            {
                return this.PublicRequirementsNotMet(status);
            }
        }

        if (!await TryApplyAsync(collection, request, DateTime.UtcNow, ct) || !await TrySaveAsync(ct))
        {
            return ValidationProblem(ModelState);
        }

        return await ProjectOneAsync(collection.Id, ct);
    }

    /// <summary>
    /// Makes the collection Public, nothing else: the name and description stay as they are (a page
    /// opened before a rename in another tab cannot write the old ones back). An Unlisted
    /// collection loses its share link. Refused with the current counts (400 public_requirements)
    /// while the rule is not met; a collection that is Public already is returned unchanged.
    /// </summary>
    [HttpPost("{id:int}/publish")]
    [ProducesResponseType<CollectionResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CollectionResponse>> Publish(int id, CancellationToken ct)
    {
        var collection = await FindOwnedAsync(id, ct);
        if (collection is null)
        {
            return NotFound();
        }
        if (collection.ModerationLockedAtUtc is not null)
        {
            return this.CodedProblem("moderation_locked", "An administrator has hidden this collection.",
                StatusCodes.Status403Forbidden);
        }

        if (collection.Visibility != CollectionVisibility.Public)
        {
            if (!await EmailConfirmedAsync(ct))
            {
                return this.EmailNotConfirmed();
            }
            var status = await publication.StatusAsync(collection.Id, ct);
            if (!status.CanBePublic)
            {
                return this.PublicRequirementsNotMet(status);
            }
            collection.SetVisibility(CollectionVisibility.Public);
            collection.UpdatedAtUtc = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
        }

        return await ProjectOneAsync(collection.Id, ct);
    }

    /// <summary>
    /// Deletes a collection. With <paramref name="moveTo"/> its coins move to that collection of
    /// the same user first; with <paramref name="deleteCoins"/> the coins and their photos are
    /// deleted too. A collection with coins and neither is refused (409 has_coins): a page opened
    /// before coins were added cannot delete them by accident. The name confirmation is the
    /// client's job. The last collection of a user cannot be deleted. Moving coins without photos
    /// into a Public collection breaks its rule (409 would_unpublish); with
    /// <paramref name="unpublish"/> the target becomes Unlisted.
    /// </summary>
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(int id, [FromQuery] int? moveTo, [FromQuery] bool deleteCoins,
        [FromQuery] bool unpublish, CancellationToken ct)
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
                var broken = await publication.BrokenByAsync(
                    [new CollectionChange(target, AddsUnphotographed: await coins.AnyAsync(PublicationRules.IsNotPhotographed, ct))],
                    ct);
                if (broken.Count > 0 && !unpublish)
                {
                    return this.WouldUnpublish(broken);
                }
                publication.Unpublish(broken, DateTime.UtcNow);
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

    private Task<bool> EmailConfirmedAsync(CancellationToken ct) => unverified.IsConfirmedAsync(CurrentUserId, ct);

    private Task<Collection?> FindOwnedAsync(int id, CancellationToken ct)
    {
        var userId = CurrentUserId;
        return db.Collections.FirstOrDefaultAsync(c => c.Id == id && c.OwnerId == userId, ct);
    }

    private async Task<CollectionResponse> ProjectOneAsync(int id, CancellationToken ct) =>
        await Project(db.Collections.Where(c => c.Id == id), await publication.MinPublicCoinsAsync(ct)).FirstAsync(ct);

    // Coin counts in the same query
    private static IQueryable<CollectionResponse> Project(IQueryable<Collection> collections, int minPublicCoins) =>
        collections.Select(c => new CollectionResponse(
            c.Id,
            c.Name,
            c.Description,
            c.Visibility,
            c.ModerationLockedAtUtc != null,
            c.ShareToken,
            c.Coins.Count,
            c.Coins.AsQueryable().Count(PublicationRules.IsPhotographed),
            minPublicCoins,
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
            collection.SetVisibility(visibility);
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
