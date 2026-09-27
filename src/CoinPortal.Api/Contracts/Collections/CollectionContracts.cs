using System.ComponentModel.DataAnnotations;
using CoinPortal.Api.Data;

namespace CoinPortal.Api.Contracts.Collections;

/// <summary>Used for both create (POST) and update (PUT).</summary>
public class CollectionUpsertRequest
{
    [Required, StringLength(Collection.NameMaxLength)]
    public string Name { get; set; } = string.Empty;

    [StringLength(Collection.DescriptionMaxLength)]
    public string? Description { get; set; }

    /// <summary>Omitted keeps the current value (Private for a new collection).</summary>
    [EnumDataType(typeof(CollectionVisibility))]
    public CollectionVisibility? Visibility { get; set; }
}

/// <summary>
/// Photo shown on the collection card: a national side if any coin has one, otherwise a common
/// side; the most recent first. Image URL as for coin photos (/api/coins/{coinId}/photos/...).
/// </summary>
public sealed record CollectionCoverResponse(int CoinId, CoinSide Side, Guid Id);

/// <param name="CoverImageId">Uploaded cover (GET /api/collections/{id}/cover?v={CoverImageId}); wins over <paramref name="Cover"/>.</param>
/// <param name="Cover">Latest coin photo, used when there is no uploaded cover.</param>
/// <param name="ShareToken">Owner only: the secret of the share link /s/{ShareToken} while Unlisted.</param>
public sealed record CollectionResponse(
    int Id,
    string Name,
    string? Description,
    CollectionVisibility Visibility,
    string? ShareToken,
    int CoinCount,
    Guid? CoverImageId,
    CollectionCoverResponse? Cover,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc);

public sealed record CollectionCoverImageResponse(int CollectionId, Guid CoverImageId);

public sealed record ShareTokenResponse(string ShareToken);
