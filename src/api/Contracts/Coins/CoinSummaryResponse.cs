namespace CoinPortal.Api.Contracts.Coins;

/// <summary>Counts over all of the user's collections (home page).</summary>
public sealed record CoinSummaryResponse(int CoinCount, int CountryCount, int CommemorativeCount);
