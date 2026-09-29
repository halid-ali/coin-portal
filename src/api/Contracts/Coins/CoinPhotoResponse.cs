using CoinPortal.Api.Data;

namespace CoinPortal.Api.Contracts.Coins;

/// <summary>
/// The client builds the image URL as /api/coins/{coinId}/photos/{side}/{size}?v={id};
/// the id changes on every upload, so cached images are never stale.
/// </summary>
public sealed record CoinPhotoResponse(CoinSide Side, Guid Id)
{
    public static CoinPhotoResponse From(CoinPhoto p) => new(p.Side, p.Id);
}
