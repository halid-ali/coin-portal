namespace CoinPortal.Api.Data;

/// <summary>
/// A country a coin can come from (CountrySeed). Display names are localized on the client from
/// the ISO code (Intl.DisplayNames, its own names for former countries); Name is an English
/// reference only.
/// </summary>
public class Country
{
    public const int CodeLength = 2;
    public const int NameMaxLength = 100;

    // ISO 3166-1 alpha-2 code, e.g. "DE"; a former country keeps its last code ("SU")
    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    /// <summary>Issues euro coins: only these countries can be chosen for a euro coin.</summary>
    public bool IsEuroIssuer { get; set; }
}
