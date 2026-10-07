using System.ComponentModel.DataAnnotations;

namespace CoinPortal.Api.Accounts;

/// <summary>
/// Configuration section "UserLimits": how much one account may hold. Far above a real
/// collection (the dev seed has about 110 coins per user), they stop a script from filling the
/// database. Photos have their own byte quota (the site setting UserQuotaMegabytes).
/// </summary>
public sealed class UserLimitOptions
{
    public const string SectionName = "UserLimits";

    [Range(1, 10_000)]
    public int MaxCollections { get; set; } = 50;

    [Range(1, 1_000_000)]
    public int MaxCoins { get; set; } = 10_000;
}
