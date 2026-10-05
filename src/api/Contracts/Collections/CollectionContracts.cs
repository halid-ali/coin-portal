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

    /// <summary>
    /// Omitted keeps the current value (Private for a new collection). Public needs the
    /// PublicationRules (400 public_requirements otherwise), so a new collection cannot start Public.
    /// </summary>
    [EnumDataType(typeof(CollectionVisibility))]
    public CollectionVisibility? Visibility { get; set; }
}

/// <param name="CoverImageId">Uploaded cover (GET /api/collections/{id}/cover?v={CoverImageId}); null = the client's default picture.</param>
/// <param name="ShareToken">Owner only: the secret of the share link /s/{ShareToken} while Unlisted.</param>
/// <param name="ModerationLocked">Hidden by an admin: Private, and the visibility cannot change.</param>
/// <param name="PhotographedCoinCount">Coins with the photos a public collection needs (PublicationRules); CoinCount minus this is what is missing.</param>
/// <param name="MinPublicCoins">Photographed coins a collection needs to become Public (site setting, the same for every collection).</param>
public sealed record CollectionResponse(
    int Id,
    string Name,
    string? Description,
    CollectionVisibility Visibility,
    bool ModerationLocked,
    string? ShareToken,
    int CoinCount,
    int PhotographedCoinCount,
    int MinPublicCoins,
    Guid? CoverImageId,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc);

public sealed record CollectionCoverImageResponse(int CollectionId, Guid CoverImageId);

public sealed record ShareTokenResponse(string ShareToken);
