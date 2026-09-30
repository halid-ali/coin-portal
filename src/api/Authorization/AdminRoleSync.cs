using CoinPortal.Api.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;

namespace CoinPortal.Api.Authorization;

/// <summary>
/// Makes the Admin role match the configuration (<see cref="AdminOptions.UserIds"/>): creates the
/// role, grants it to the listed users and takes it from everyone else. Runs at startup, so the
/// panel cannot hand out the role; changing admins means changing the configuration and restarting.
/// Signed-in users see the change when their cookie is next validated (SecurityStampValidator
/// interval in Program.cs), which rebuilds their role claims.
/// </summary>
public class AdminRoleSync(
    UserManager<ApplicationUser> userManager,
    RoleManager<IdentityRole> roleManager,
    IOptions<AdminOptions> options,
    ILogger<AdminRoleSync> logger)
{
    /// <summary>Syncs with the configured list.</summary>
    public Task SyncAsync() => SyncAsync(options.Value.UserIds);

    public async Task SyncAsync(IEnumerable<string> adminUserIds)
    {
        if (!await roleManager.RoleExistsAsync(AppRoles.Admin))
        {
            ThrowIfFailed(await roleManager.CreateAsync(new IdentityRole(AppRoles.Admin)), "create the Admin role");
        }

        var wanted = adminUserIds.Select(id => id.Trim()).Where(id => id.Length > 0)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        foreach (var user in await userManager.GetUsersInRoleAsync(AppRoles.Admin))
        {
            if (!wanted.Contains(user.Id))
            {
                ThrowIfFailed(await userManager.RemoveFromRoleAsync(user, AppRoles.Admin), "remove an admin");
                logger.LogInformation("Admin role removed from {UserName} ({UserId})", user.UserName, user.Id);
            }
        }

        foreach (var id in wanted)
        {
            var user = await userManager.FindByIdAsync(id);
            if (user is null)
            {
                logger.LogWarning("Configured admin {UserId} does not exist", id);
            }
            else if (!await userManager.IsInRoleAsync(user, AppRoles.Admin))
            {
                ThrowIfFailed(await userManager.AddToRoleAsync(user, AppRoles.Admin), "add an admin");
                logger.LogInformation("Admin role granted to {UserName} ({UserId})", user.UserName, user.Id);
            }
        }
    }

    private static void ThrowIfFailed(IdentityResult result, string action)
    {
        if (!result.Succeeded)
        {
            throw new InvalidOperationException(
                $"Could not {action}: {string.Join(" ", result.Errors.Select(e => e.Description))}");
        }
    }
}
