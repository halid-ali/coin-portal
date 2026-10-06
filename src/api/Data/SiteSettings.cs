namespace CoinPortal.Api.Data;

/// <summary>
/// Site-wide settings an admin changes in the panel ("General settings"). Exactly one row
/// (<see cref="SingletonId"/>), inserted by the migration that added the table.
/// </summary>
public class SiteSettings
{
    public const int SingletonId = 1;

    public const int MinPublicCoinsMin = 1;
    public const int MinPublicCoinsMax = 100;

    /// <summary>Name of <see cref="MinPublicCoins"/> in the audit log.</summary>
    public const string MinPublicCoinsName = "MinPublicCoins";

    public const int UnverifiedMaxCoinsMin = 0;
    public const int UnverifiedMaxCoinsMax = 10_000;

    /// <summary>Name of <see cref="UnverifiedMaxCoins"/> in the audit log.</summary>
    public const string UnverifiedMaxCoinsName = "UnverifiedMaxCoins";

    public int Id { get; set; }

    /// <summary>
    /// How many photographed coins a collection needs to become Public
    /// (<see cref="Publishing.PublicationRules"/>).
    /// </summary>
    public int MinPublicCoins { get; set; }

    /// <summary>
    /// How many coins an account may hold before its e-mail address is confirmed
    /// (<see cref="Accounts.UnverifiedAccounts"/>); 0: none. Lowering it removes nothing.
    /// </summary>
    public int UnverifiedMaxCoins { get; set; }
}
