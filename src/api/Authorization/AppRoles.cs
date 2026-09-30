namespace CoinPortal.Api.Authorization;

/// <summary>Identity roles. A role is granted by configuration only (see <see cref="AdminRoleSync"/>).</summary>
public static class AppRoles
{
    public const string Admin = "Admin";
}

/// <summary>Authorization policies; endpoints use [Authorize(Policy = ...)] rather than roles directly.</summary>
public static class AuthPolicies
{
    /// <summary>The moderation and operations panel (api/admin/*).</summary>
    public const string Admin = "Admin";
}
