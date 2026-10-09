namespace CoinPortal.Api.Data;

/// <summary>
/// A euro coin (one of the eight euro denominations, a euro issuer, 1999 or later) or any other
/// coin (a face value in a currency the user writes, any country, any year). The kind decides
/// which value fields are set and what counts as photographed (PublicationRules).
/// </summary>
public enum CoinKind
{
    Euro = 1,
    Other = 2
}
