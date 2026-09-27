using CoinPortal.Api.Contracts.Coins;
using CoinPortal.Api.Contracts.Collections;
using CoinPortal.Api.Contracts.Common;
using CoinPortal.Api.Contracts.Public;
using CoinPortal.Api.Data;
using CoinPortal.Api.Querying;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CoinPortal.Api.Controllers;

/// <summary>
/// Read-only views for everyone, signed in or not: public collections (profile pages, explore)
/// and collections opened with their share link. Private collections never appear here, and
/// anything not visible is a 404, so ids and user names cannot be probed.
/// </summary>
[ApiController]
[Route("api/public")]
[AllowAnonymous]
public class PublicController(AppDbContext db) : ControllerBase
{
    private IQueryable<Collection> PublicCollections =>
        db.Collections.AsNoTracking().Where(c => c.Visibility == CollectionVisibility.Public);

    /// <summary>Users with at least one public collection, by user name.</summary>
    [HttpGet("collectors")]
    public async Task<IReadOnlyList<CollectorResponse>> Collectors(CancellationToken ct) =>
        // Ordered before projecting: EF cannot sort on the constructed response
        await db.Users.AsNoTracking()
            .Where(u => PublicCollections.Any(c => c.OwnerId == u.Id))
            .OrderBy(u => u.UserName)
            .Select(u => new CollectorResponse(
                u.UserName!,
                PublicCollections.Count(c => c.OwnerId == u.Id),
                db.Coins.Count(coin => coin.OwnerId == u.Id
                    && coin.Collection.Visibility == CollectionVisibility.Public)))
            .ToListAsync(ct);

    /// <summary>Profile page: the user's public collections. 404 if there are none.</summary>
    [HttpGet("users/{userName}")]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PublicProfileResponse>> Profile(string userName, CancellationToken ct)
    {
        var collections = await Project(PublicCollections.Where(c => c.Owner.UserName == userName)
                .OrderBy(c => c.CreatedAtUtc).ThenBy(c => c.Id))
            .ToListAsync(ct);
        if (collections.Count == 0)
        {
            return NotFound();
        }
        // The stored spelling, not the one from the URL
        return new PublicProfileResponse(collections[0].OwnerUserName, collections);
    }

    [HttpGet("collections/{id:int}")]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PublicCollectionResponse>> GetCollection(int id, CancellationToken ct)
    {
        var collection = await Project(PublicCollections.Where(c => c.Id == id)).FirstOrDefaultAsync(ct);
        return collection is null ? NotFound() : collection;
    }

    [HttpGet("collections/{id:int}/coins")]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PagedResponse<CoinResponse>>> CollectionCoins(
        int id, [FromQuery] CoinListQuery query, CancellationToken ct)
    {
        if (!await PublicCollections.AnyAsync(c => c.Id == id, ct))
        {
            return NotFound();
        }
        return await CoinsOf(id).ToPagedAsync(query, CoinResponse.From, ct);
    }

    /// <summary>A collection opened with its share link (Unlisted only).</summary>
    [HttpGet("shared/{token}")]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PublicCollectionResponse>> Shared(string token, CancellationToken ct)
    {
        var collection = await Project(SharedCollections(token)).FirstOrDefaultAsync(ct);
        return collection is null ? NotFound() : collection;
    }

    [HttpGet("shared/{token}/coins")]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PagedResponse<CoinResponse>>> SharedCoins(
        string token, [FromQuery] CoinListQuery query, CancellationToken ct)
    {
        var id = await SharedCollections(token).Select(c => (int?)c.Id).FirstOrDefaultAsync(ct);
        if (id is null)
        {
            return NotFound();
        }
        return await CoinsOf(id.Value).ToPagedAsync(query, CoinResponse.From, ct);
    }

    /// <summary>Explore: coins of all public collections, optionally of one user.</summary>
    [HttpGet("coins")]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<PagedResponse<ExploreCoinResponse>> Explore([FromQuery] ExploreQuery query, CancellationToken ct)
    {
        var coins = db.Coins.AsNoTracking()
            .Include(c => c.Photos).Include(c => c.Owner).Include(c => c.Collection)
            .Where(c => c.Collection.Visibility == CollectionVisibility.Public);
        if (!string.IsNullOrWhiteSpace(query.Owner))
        {
            var owner = query.Owner.Trim();
            coins = coins.Where(c => c.Owner.UserName == owner);
        }
        return await coins.ToPagedAsync(query, ExploreCoinResponse.From, ct);
    }

    // Tokens are fixed-length base64url; anything else cannot match
    private IQueryable<Collection> SharedCollections(string token) =>
        db.Collections.AsNoTracking().Where(c =>
            c.Visibility == CollectionVisibility.Unlisted && c.ShareToken != null && c.ShareToken == token
            && token.Length == Collection.ShareTokenLength);

    private IQueryable<Coin> CoinsOf(int collectionId) =>
        db.Coins.AsNoTracking().Include(c => c.Photos).Where(c => c.CollectionId == collectionId);

    private static IQueryable<PublicCollectionResponse> Project(IQueryable<Collection> collections) =>
        collections.Select(c => new PublicCollectionResponse(
            c.Id,
            c.Name,
            c.Description,
            c.Owner.UserName!,
            c.Visibility,
            c.Coins.Count,
            c.CoverImageId,
            c.Coins.SelectMany(coin => coin.Photos)
                .OrderBy(p => p.Side).ThenByDescending(p => p.CreatedAtUtc)
                .Select(p => new CollectionCoverResponse(p.CoinId, p.Side, p.Id))
                .FirstOrDefault()));
}
