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

    public const int UnverifiedLifetimeDaysMin = 0;
    public const int UnverifiedLifetimeDaysMax = 365;

    /// <summary>Name of <see cref="UnverifiedLifetimeDays"/> in the audit log.</summary>
    public const string UnverifiedLifetimeDaysName = "UnverifiedLifetimeDays";

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

    /// <summary>
    /// Days after which an account whose e-mail address is still unverified is deleted
    /// (<see cref="Accounts.UnverifiedAccountCleanup"/>); 0: never.
    /// </summary>
    public int UnverifiedLifetimeDays { get; set; }

    /// <summary>
    /// The lifetime counts from the sign-up, but not from before this: set by the migration that
    /// added it (older accounts count from the release) and again when the lifetime is turned on
    /// after being 0.
    /// </summary>
    public DateTime UnverifiedLifetimeSinceUtc { get; set; }
}
