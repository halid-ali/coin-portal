namespace CoinPortal.Api.Data;

/// <summary>
/// A euro coin issuing country. Display names are localized on the client
/// from the ISO code (Intl.DisplayNames); Name is an English reference only.
/// </summary>
public class Country
{
    public const int CodeLength = 2;
    public const int NameMaxLength = 100;

    // ISO 3166-1 alpha-2 code, e.g. "DE"
    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;
}