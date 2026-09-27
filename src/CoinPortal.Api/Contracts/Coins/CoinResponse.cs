using CoinPortal.Api.Data;

namespace CoinPortal.Api.Contracts.Coins;

public sealed record CoinResponse(
    int Id,
    string Title,
    string? Description,
    Denomination Denomination,
    string CountryCode,
    int Year,
    string? MintMark,
    bool IsCommemorative,
    int Quantity,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc)
{
    public static CoinResponse From(Coin c) => new(
        c.Id, c.Title, c.Description, c.Denomination, c.CountryCode, c.Year,
        c.MintMark, c.IsCommemorative, c.Quantity, c.CreatedAtUtc, c.UpdatedAtUtc);
}