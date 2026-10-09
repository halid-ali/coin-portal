using System.ComponentModel.DataAnnotations;
using System.Linq.Expressions;
using CoinPortal.Api.Contracts.Coins;
using CoinPortal.Api.Data;

namespace CoinPortal.Api.Contracts.Public;

// Public responses carry the user name only: never names, email, birth date or ids of users.

/// <summary>A collection as others see it (public, or opened with its share link).</summary>
public sealed record PublicCollectionResponse(
    int Id,
    string Name,
    string? Description,
    string OwnerUserName,
    CollectionVisibility Visibility,
    int CoinCount,
    Guid? CoverImageId);

public sealed record PublicProfileResponse(string UserName, IReadOnlyList<PublicCollectionResponse> Collections);

/// <summary>A user with at least one public collection, for the explore user filter.</summary>
public sealed record CollectorResponse(string UserName, int CollectionCount, int CoinCount);

/// <summary>Query string of the explore facets: the kind plus the owner, like the list.</summary>
public sealed class ExploreFacetsQuery : CoinFacetsQuery
{
    [StringLength(256)]
    public string? Owner { get; set; }
}

/// <summary>Query string of the explore list: the coin filters plus the owner.</summary>
public class ExploreQuery : CoinListQuery, IValidatableObject
{
    /// <summary>Exact user name; omitted means all public collections.</summary>
    [StringLength(256)]
    public string? Owner { get; set; }

    // Explore spans all public collections and works signed out: no "everything on one page"
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (PageSize == 0)
        {
            yield return new ValidationResult("Explore is paged; choose a page size of 1 to 100.", [nameof(PageSize)]);
        }
    }
}

/// <summary>A coin in the explore list, with where it comes from.</summary>
public sealed record ExploreCoinResponse(
    int Id,
    int CollectionId,
    string CollectionName,
    string OwnerUserName,
    string Title,
    string? Description,
    CoinKind Kind,
    Denomination? Denomination,
    decimal? FaceValue,
    string? Currency,
    string CountryCode,
    int Year,
    string? MintMark,
    bool IsCommemorative,
    int Quantity,
    IReadOnlyList<CoinPhotoResponse> Photos)
{
    // Translated to SQL: only the owner's user name and the collection's name are read, not the
    // whole user row (password hash, email) of every listed coin
    public static readonly Expression<Func<Coin, ExploreCoinResponse>> Projection = c => new(
        c.Id, c.CollectionId, c.Collection.Name, c.Owner.UserName!, c.Title, c.Description,
        c.Kind, c.Denomination, c.FaceValue, c.Currency, c.CountryCode, c.Year, c.MintMark, c.IsCommemorative, c.Quantity,
        c.Photos.OrderBy(p => p.Side).Select(p => new CoinPhotoResponse(p.Side, p.Id)).ToList());
}

/// <summary>
/// A coin of a public or shared collection: what the owner sees minus when it was added or
/// changed, which would tell others when the owner was active.
/// </summary>
public sealed record PublicCoinResponse(
    int Id,
    int CollectionId,
    string Title,
    string? Description,
    CoinKind Kind,
    Denomination? Denomination,
    decimal? FaceValue,
    string? Currency,
    string CountryCode,
    int Year,
    string? MintMark,
    bool IsCommemorative,
    int Quantity,
    IReadOnlyList<CoinPhotoResponse> Photos)
{
    // Photos must be loaded (Include)
    public static PublicCoinResponse From(Coin c) => new(
        c.Id, c.CollectionId, c.Title, c.Description, c.Kind, c.Denomination, c.FaceValue, c.Currency, c.CountryCode, c.Year,
        c.MintMark, c.IsCommemorative, c.Quantity,
        c.Photos.OrderBy(p => p.Side).Select(CoinPhotoResponse.From).ToList());
}
