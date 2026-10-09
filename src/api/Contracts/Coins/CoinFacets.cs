using System.ComponentModel.DataAnnotations;
using CoinPortal.Api.Data;

namespace CoinPortal.Api.Contracts.Coins;

/// <summary>
/// What a coin list holds, for its filters: the coins of each kind (the All / Euro / Other buttons),
/// the currencies of its other coins (the denomination filter of other coins) and the countries of
/// the chosen kind (the country filter). The counts ignore the kind; the countries follow it.
/// Country codes are sorted by code: the client sorts them by their name in its language.
/// </summary>
public sealed record CoinFacetsResponse(
    int EuroCount,
    int OtherCount,
    IReadOnlyList<string> Currencies,
    IReadOnlyList<string> CountryCodes);

public class CoinFacetsQuery
{
    /// <summary>The kind whose countries are listed; omitted means every kind.</summary>
    [EnumDataType(typeof(CoinKind))]
    public CoinKind? Kind { get; set; }
}

/// <summary>The signed-in user's coins: of one collection, or of all (the coin form's currency suggestions).</summary>
public sealed class OwnCoinFacetsQuery : CoinFacetsQuery
{
    [Range(1, int.MaxValue)]
    public int? CollectionId { get; set; }
}
