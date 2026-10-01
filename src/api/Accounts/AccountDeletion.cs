using CoinPortal.Api.Data;
using CoinPortal.Api.Photos;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace CoinPortal.Api.Accounts;

/// <summary>
/// Deletes a user with everything they own, for the user's own request (Settings) and an admin's.
/// The database cascades from the user row to collections, coins and photo rows (and Identity's
/// tables); the photo files go afterwards. The audit log keeps its entries, without the user's
/// names. Admins are never deleted here: callers check the role first.
/// </summary>
public class AccountDeletion(
    AppDbContext db, UserManager<ApplicationUser> userManager, IPhotoStorage photoStorage,
    ILogger<AccountDeletion> logger)
{
    /// <param name="beforeSave">Adds changes that are saved with the deletion (an admin's audit entry).</param>
    public async Task DeleteAsync(ApplicationUser user, Action? beforeSave, CancellationToken ct)
    {
        await using (var transaction = await db.Database.BeginTransactionAsync(ct))
        {
            // Names are personal data; the entries themselves stay (who did what, and when)
            await db.AuditLog.Where(e => e.TargetUserId == user.Id).ExecuteUpdateAsync(s => s
                .SetProperty(e => e.TargetUserName, (string?)null)
                .SetProperty(e => e.TargetCollectionName, (string?)null), ct);
            await db.AuditLog.Where(e => e.ActorId == user.Id)
                .ExecuteUpdateAsync(s => s.SetProperty(e => e.ActorUserName, (string?)null), ct);

            beforeSave?.Invoke();
            var result = await userManager.DeleteAsync(user);
            if (!result.Succeeded)
            {
                throw new InvalidOperationException(string.Join(" ", result.Errors.Select(e => e.Description)));
            }
            await transaction.CommitAsync(ct);
        }

        // Files after the database, like coin and photo deletion: a failure here leaves files
        // nobody can reach, never rows that point to missing files
        await photoStorage.DeleteOwnerAsync(user.Id);
        logger.LogInformation("Account {UserId} deleted", user.Id);
    }
}
