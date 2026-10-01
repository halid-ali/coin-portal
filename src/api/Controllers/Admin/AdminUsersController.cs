using CoinPortal.Api.Authorization;
using CoinPortal.Api.Contracts.Admin;
using CoinPortal.Api.Contracts.Coins;
using CoinPortal.Api.Contracts.Common;
using CoinPortal.Api.Data;
using CoinPortal.Api.Photos;
using CoinPortal.Api.Querying;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.EntityFrameworkCore;

namespace CoinPortal.Api.Controllers.Admin;

/// <summary>
/// Users for the panel: list, details (account data and counts, no content) and the admin lock.
/// A locked user cannot sign in and their shared collections are hidden until unlocked.
/// Admins cannot be locked here; they are removed from the configuration (Admin:UserIds).
/// </summary>
[Route("api/admin/users")]
public class AdminUsersController(
    AppDbContext db, UserManager<ApplicationUser> userManager, PhotoQuota photoQuota) : AdminControllerBase
{
    [HttpGet]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<PagedResponse<AdminUserResponse>> List([FromQuery] AdminUserQuery query, CancellationToken ct)
    {
        var rows = await RowsAsync(ct);
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim();
            rows = rows.Where(r => r.UserName.Contains(term) || r.Email.Contains(term));
        }
        if (query.Status is { } status)
        {
            rows = rows.Where(r => r.Status == status);
        }

        var desc = query.Dir == SortDirection.Desc;
        var ordered = query.Sort switch
        {
            AdminUserSort.UserName => desc ? rows.OrderByDescending(r => r.UserName) : rows.OrderBy(r => r.UserName),
            AdminUserSort.LastSeen => desc ? rows.OrderByDescending(r => r.LastSeenAtUtc) : rows.OrderBy(r => r.LastSeenAtUtc),
            AdminUserSort.Storage => desc ? rows.OrderByDescending(r => r.StorageBytes) : rows.OrderBy(r => r.StorageBytes),
            _ => desc ? rows.OrderByDescending(r => r.CreatedAtUtc) : rows.OrderBy(r => r.CreatedAtUtc),
        };
        // Id keeps paging stable when the sort key is equal
        return await ordered.ThenBy(r => r.Id).ToPagedAsync(query.Page, query.PageSize,
            r => new AdminUserResponse(r.Id, r.UserName, r.Email, r.CreatedAtUtc, r.LastSeenAtUtc, r.Status,
                r.IsAdmin, r.CollectionCount, r.CoinCount, r.StorageBytes), ct);
    }

    [HttpGet("{id}")]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AdminUserDetailResponse>> Get(string id, CancellationToken ct)
    {
        var row = await (await RowsAsync(ct)).FirstOrDefaultAsync(r => r.Id == id, ct);
        return row is null ? NotFound() : row.ToDetail(photoQuota.LimitBytes);
    }

    /// <summary>Locks the user until unlocked; their sessions end within the cookie validation interval.</summary>
    [HttpPut("{id}/lock")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Lock(string id,
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] AdminLockRequest? request)
    {
        var user = await userManager.FindByIdAsync(id);
        if (user is null)
        {
            return NotFound();
        }
        if (await userManager.IsInRoleAsync(user, AppRoles.Admin))
        {
            return this.CodedProblem("cannot_lock_admin",
                "Administrators cannot be locked; remove them from the configuration instead.");
        }
        if (user.LockedAtUtc is not null)
        {
            return NoContent();
        }

        user.LockedAtUtc = DateTime.UtcNow;
        user.LockoutEnabled = true;
        user.LockoutEnd = DateTimeOffset.MaxValue;
        Audit(db, AuditAction.UserLocked, user, note: request?.Note);
        // Saves the user and the audit entry together; the new stamp invalidates the user's cookies
        ThrowIfFailed(await userManager.UpdateSecurityStampAsync(user));
        return NoContent();
    }

    /// <summary>Lifts the admin lock, and a temporary lockout after failed sign-ins as well.</summary>
    [HttpDelete("{id}/lock")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Unlock(string id,
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] AdminLockRequest? request)
    {
        var user = await userManager.FindByIdAsync(id);
        if (user is null)
        {
            return NotFound();
        }
        if (user.LockedAtUtc is null && !(user.LockoutEnd > DateTimeOffset.UtcNow))
        {
            return NoContent();
        }

        user.LockedAtUtc = null;
        user.LockoutEnd = null;
        user.AccessFailedCount = 0;
        Audit(db, AuditAction.UserUnlocked, user, note: request?.Note);
        ThrowIfFailed(await userManager.UpdateAsync(user));
        return NoContent();
    }

    private async Task<IQueryable<UserRow>> RowsAsync(CancellationToken ct)
    {
        var adminRoleId = await db.Roles.Where(r => r.Name == AppRoles.Admin).Select(r => r.Id)
            .FirstOrDefaultAsync(ct);
        var now = DateTimeOffset.UtcNow;
        return db.Users.AsNoTracking().Select(u => new UserRow
        {
            Id = u.Id,
            UserName = u.UserName!,
            Email = u.Email!,
            FirstName = u.FirstName,
            LastName = u.LastName,
            CreatedAtUtc = u.CreatedAtUtc,
            LastSignInAtUtc = u.LastSignInAtUtc,
            LastSeenAtUtc = u.LastSeenAtUtc,
            LockedAtUtc = u.LockedAtUtc,
            LockoutEnd = u.LockoutEnd,
            Status = u.LockedAtUtc != null ? AdminUserStatus.Locked
                : u.LockoutEnd > now ? AdminUserStatus.LockedOut
                : AdminUserStatus.Active,
            IsAdmin = db.UserRoles.Any(r => r.UserId == u.Id && r.RoleId == adminRoleId),
            CollectionCount = db.Collections.Count(c => c.OwnerId == u.Id),
            PublicCollectionCount = db.Collections.Count(c => c.OwnerId == u.Id
                && c.Visibility == CollectionVisibility.Public),
            UnlistedCollectionCount = db.Collections.Count(c => c.OwnerId == u.Id
                && c.Visibility == CollectionVisibility.Unlisted),
            CoinCount = db.Coins.Count(c => c.OwnerId == u.Id),
            PhotoCount = db.CoinPhotos.Count(p => p.Coin.OwnerId == u.Id),
            // Same sum as PhotoQuota: photos and covers
            StorageBytes = (db.CoinPhotos.Where(p => p.Coin.OwnerId == u.Id).Sum(p => (long?)p.SizeBytes) ?? 0)
                + (db.Collections.Where(c => c.OwnerId == u.Id).Sum(c => (long?)c.CoverSizeBytes) ?? 0),
        });
    }

    private static void ThrowIfFailed(IdentityResult result)
    {
        if (!result.Succeeded)
        {
            throw new InvalidOperationException(string.Join(" ", result.Errors.Select(e => e.Description)));
        }
    }

    // Member-init projection, so EF can filter and sort on it (it cannot on a record constructor)
    private sealed class UserRow
    {
        public required string Id { get; init; }
        public required string UserName { get; init; }
        public required string Email { get; init; }
        public required string FirstName { get; init; }
        public required string LastName { get; init; }
        public DateTime CreatedAtUtc { get; init; }
        public DateTime? LastSignInAtUtc { get; init; }
        public DateTime? LastSeenAtUtc { get; init; }
        public DateTime? LockedAtUtc { get; init; }
        public DateTimeOffset? LockoutEnd { get; init; }
        public AdminUserStatus Status { get; init; }
        public bool IsAdmin { get; init; }
        public int CollectionCount { get; init; }
        public int PublicCollectionCount { get; init; }
        public int UnlistedCollectionCount { get; init; }
        public int CoinCount { get; init; }
        public int PhotoCount { get; init; }
        public long StorageBytes { get; init; }

        public AdminUserDetailResponse ToDetail(long quotaBytes) => new(Id, UserName, Email, FirstName, LastName,
            CreatedAtUtc, LastSignInAtUtc, LastSeenAtUtc, Status, LockedAtUtc,
            Status == AdminUserStatus.LockedOut ? LockoutEnd?.UtcDateTime : null,
            IsAdmin, CollectionCount, PublicCollectionCount, UnlistedCollectionCount, CoinCount, PhotoCount,
            StorageBytes, quotaBytes);
    }
}
