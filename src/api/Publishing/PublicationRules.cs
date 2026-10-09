using System.Linq.Expressions;
using CoinPortal.Api.Data;

namespace CoinPortal.Api.Publishing;

/// <summary>
/// What a Public collection must hold: every coin photographed, and at least
/// <see cref="SiteSettings.MinPublicCoins"/> of them. The single definition of a photographed
/// coin; the publish check, the guards (<see cref="PublicationGuard"/>), the coin list filter and
/// the AddPublicationRules migration all follow it.
/// </summary>
public static class PublicationRules
{
    /// <summary>
    /// A euro coin counts as photographed with its national side: that side identifies the coin,
    /// the common side looks the same in every country. Any other coin needs both sides (front and
    /// back, stored as National and Common): there is no standard side that shows its value.
    /// </summary>
    public static readonly Expression<Func<Coin, bool>> IsPhotographed =
        c => c.Photos.Any(p => p.Side == CoinSide.National)
            && (c.Kind == CoinKind.Euro || c.Photos.Any(p => p.Side == CoinSide.Common));

    public static readonly Expression<Func<Coin, bool>> IsNotPhotographed =
        Expression.Lambda<Func<Coin, bool>>(Expression.Not(IsPhotographed.Body), IsPhotographed.Parameters);

    private static readonly Func<Coin, bool> IsPhotographedCompiled = IsPhotographed.Compile();

    /// <summary>The same rule for a coin in memory (its Photos loaded).</summary>
    public static bool HasPhotos(Coin coin) => IsPhotographedCompiled(coin);

    /// <summary>The same rule for a coin of this kind with these photo sides (about to be created or changed).</summary>
    public static bool HasPhotos(CoinKind kind, IEnumerable<CoinSide> sides) =>
        HasPhotos(new Coin { Kind = kind, Photos = sides.Select(side => new CoinPhoto { Side = side }).ToList() });
}

/// <summary>Where a collection stands against the rule (coin rows, not quantities).</summary>
public sealed record PublicationStatus(int CoinCount, int PhotographedCoinCount, int MinPublicCoins)
{
    public int UnphotographedCoinCount => CoinCount - PhotographedCoinCount;

    public bool CanBePublic => UnphotographedCoinCount == 0 && PhotographedCoinCount >= MinPublicCoins;
}
