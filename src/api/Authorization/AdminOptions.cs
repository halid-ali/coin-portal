namespace CoinPortal.Api.Authorization;

/// <summary>
/// Configuration section "Admin". Hosting sets it with environment variables, e.g.
/// Admin__UserIds__0=&lt;user id&gt;.
/// </summary>
public class AdminOptions
{
    public const string SectionName = "Admin";

    /// <summary>
    /// Ids of the users who hold the Admin role; everyone else loses it at startup. Ids, not user
    /// names: a name that is free (never registered, or its account deleted) could be registered by
    /// anyone and would then be made an admin.
    /// </summary>
    public string[] UserIds { get; set; } = [];
}
