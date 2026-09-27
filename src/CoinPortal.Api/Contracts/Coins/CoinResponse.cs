using CoinPortal.Api.Data;

namespace CoinPortal.Api.Contracts.Coins;

public sealed record CoinResponse(
    int Id,
    int CollectionId,
    string Title,
    string? Description,
    Denomination Denomination,
    string CountryCode,
    int Year,
    string? MintMark,
    bool IsCommemorative,
    int Quantity,
    IReadOnlyList<CoinPhotoResponse> Photos,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc)
{
    // Photos must be loaded (Include) for them to appear
    public static CoinResponse From(Coin c) => new(
        c.Id, c.CollectionId, c.Title, c.Description, c.Denomination, c.CountryCode, c.Year,
        c.MintMark, c.IsCommemorative, c.Quantity,
        c.Photos.OrderBy(p => p.Side).Select(CoinPhotoResponse.From).ToList(),
        c.CreatedAtUtc, c.UpdatedAtUtc);
}
