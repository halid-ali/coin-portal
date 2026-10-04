using System.ComponentModel.DataAnnotations;
using CoinPortal.Api.Contracts.Coins;
using CoinPortal.Api.Data;
using CoinPortal.Api.Photos;

namespace CoinPortal.Api.Contracts.Admin;

// The panel is for moderation and operations: counts and shared content, never the content of
// private collections (see CollectionAccess).

/// <summary>Overview numbers of the whole site for the panel.</summary>
/// <param name="ActiveUsersLast30Days">Opened the app within the last 30 days (LastSeenAtUtc).</param>
/// <param name="NewUsersLast30Days">Registered within the last 30 days.</param>
/// <param name="LockedUserCount">Locked by an admin (not the temporary lockout).</param>
/// <param name="HiddenCollectionCount">Hidden and locked by an admin.</param>
/// <param name="StorageBytes">Stored image bytes: all sizes of all coin photos plus covers (the database's sizes, as the quota counts).</param>
/// <param name="DiskCheck">The last photo sweep since the app started; null before the first one.</param>
public sealed record AdminStatsResponse(
    int UserCount,
    int ActiveUsersLast30Days,
    int NewUsersLast30Days,
    int LockedUserCount,
    int CollectionCount,
    int PublicCollectionCount,
    int UnlistedCollectionCount,
    int HiddenCollectionCount,
    int CoinCount,
    int PhotoCount,
    long StorageBytes,
    AdminDiskCheckResponse? DiskCheck);

/// <summary>
/// What the photo sweep (PhotoSweeper) found on disk: the real size, folders it removed because
/// no row refers to them, and rows whose files are missing.
/// </summary>
/// <param name="RemovedImageCount">Image folders without a row, removed by this sweep.</param>
/// <param name="RemovedUnfinishedCount">Unfinished uploads removed by this sweep.</param>
/// <param name="MissingImageCount">Images with a row but no file.</param>
/// <param name="RemovalSkipped">Most images had no row (a wrong setting?): nothing was removed.</param>
public sealed record AdminDiskCheckResponse(
    DateTime CheckedAtUtc,
    int ImageCount,
    long DiskBytes,
    int RemovedImageCount,
    long RemovedBytes,
    int RemovedUnfinishedCount,
    int MissingImageCount,
    bool RemovalSkipped)
{
    public static AdminDiskCheckResponse From(PhotoSweepResult r) => new(r.CheckedAtUtc, r.ImageCount,
        r.DiskBytes, r.RemovedImageCount, r.RemovedBytes, r.RemovedUnfinishedCount, r.MissingImageCount,
        r.RemovalSkipped);
}

/// <summary>Active, temporarily locked out after failed sign-ins, or locked by an admin.</summary>
public enum AdminUserStatus
{
    Active,
    LockedOut,
    Locked,
}

public enum AdminUserSort
{
    CreatedAt,
    UserName,
    LastSeen,
    Storage,
}

/// <summary>Query string of GET /api/admin/users. Newest accounts first by default.</summary>
public class AdminUserQuery
{
    /// <summary>Part of the user name or email.</summary>
    [StringLength(100)]
    public string? Search { get; set; }

    [EnumDataType(typeof(AdminUserStatus))]
    public AdminUserStatus? Status { get; set; }

    [EnumDataType(typeof(AdminUserSort))]
    public AdminUserSort Sort { get; set; } = AdminUserSort.CreatedAt;

    [EnumDataType(typeof(SortDirection))]
    public SortDirection Dir { get; set; } = SortDirection.Desc;

    // Bounded: (page - 1) * pageSize must not overflow
    [Range(1, 100_000)]
    public int Page { get; set; } = 1;

    [Range(1, 100)]
    public int PageSize { get; set; } = 25;
}

/// <summary>A row of the user list.</summary>
public sealed record AdminUserResponse(
    string Id,
    string UserName,
    string Email,
    DateTime CreatedAtUtc,
    DateTime? LastSeenAtUtc,
    AdminUserStatus Status,
    bool IsAdmin,
    int CollectionCount,
    int CoinCount,
    long StorageBytes);

/// <param name="LockedOutUntilUtc">End of the temporary lockout, if one is running.</param>
/// <param name="QuotaBytes">The photo storage limit every user has.</param>
public sealed record AdminUserDetailResponse(
    string Id,
    string UserName,
    string Email,
    string FirstName,
    string LastName,
    DateTime CreatedAtUtc,
    DateTime? LastSignInAtUtc,
    DateTime? LastSeenAtUtc,
    AdminUserStatus Status,
    DateTime? LockedAtUtc,
    DateTime? LockedOutUntilUtc,
    bool IsAdmin,
    int CollectionCount,
    int PublicCollectionCount,
    int UnlistedCollectionCount,
    int CoinCount,
    int PhotoCount,
    long StorageBytes,
    long QuotaBytes);

/// <summary>Body of the lock and unlock requests (users and collections); may be omitted.</summary>
/// <param name="Note">The reason, kept in the audit log only.</param>
public sealed record AdminLockRequest([StringLength(AuditLogEntry.NoteMaxLength)] string? Note);

/// <param name="Note">The admin's reason, only kept in the audit log.</param>
public sealed record AdminDeleteUserRequest([StringLength(AuditLogEntry.NoteMaxLength)] string? Note);

public enum AdminCollectionSort
{
    UpdatedAt,
    Name,
    CoinCount,
}

/// <summary>
/// Query string of GET /api/admin/collections: shared collections (public, unlisted) and the
/// ones an admin has hidden. Recently changed first by default.
/// </summary>
public class AdminCollectionQuery
{
    /// <summary>Part of the collection name or the owner's user name.</summary>
    [StringLength(100)]
    public string? Search { get; set; }

    /// <summary>Private lists the hidden ones (no other private collection is listed).</summary>
    [EnumDataType(typeof(CollectionVisibility))]
    public CollectionVisibility? Visibility { get; set; }

    /// <summary>Only hidden (true) or only not hidden (false) collections.</summary>
    public bool? Locked { get; set; }

    [EnumDataType(typeof(AdminCollectionSort))]
    public AdminCollectionSort Sort { get; set; } = AdminCollectionSort.UpdatedAt;

    [EnumDataType(typeof(SortDirection))]
    public SortDirection Dir { get; set; } = SortDirection.Desc;

    // Bounded: (page - 1) * pageSize must not overflow
    [Range(1, 100_000)]
    public int Page { get; set; } = 1;

    [Range(1, 100)]
    public int PageSize { get; set; } = 25;
}

/// <param name="OwnerLocked">The owner is locked, so the collection is not visible to others now.</param>
/// <param name="OwnerIsAdmin">The owner is an admin too: content moderation applies to admins as well
/// (account actions do not), and the panel shows it before hiding.</param>
/// <param name="ShareToken">While Unlisted, so the panel can open /s/{ShareToken}.</param>
/// <param name="ModerationLockedAtUtc">When an admin hid it; null if not hidden.</param>
public sealed record AdminCollectionResponse(
    int Id,
    string Name,
    string? Description,
    string OwnerId,
    string OwnerUserName,
    bool OwnerLocked,
    bool OwnerIsAdmin,
    CollectionVisibility Visibility,
    string? ShareToken,
    int CoinCount,
    Guid? CoverImageId,
    DateTime UpdatedAtUtc,
    DateTime? ModerationLockedAtUtc);

/// <summary>Query string of GET /api/admin/audit. Newest first.</summary>
public class AdminAuditQuery
{
    [EnumDataType(typeof(AuditAction))]
    public AuditAction? Action { get; set; }

    /// <summary>Entries about this user (target).</summary>
    [StringLength(450)]
    public string? UserId { get; set; }

    /// <summary>Entries about this collection.</summary>
    [Range(1, int.MaxValue)]
    public int? CollectionId { get; set; }

    // Bounded: (page - 1) * pageSize must not overflow
    [Range(1, 100_000)]
    public int Page { get; set; } = 1;

    [Range(1, 100)]
    public int PageSize { get; set; } = 50;
}

/// <summary>
/// One audit entry. The user and collection names are null when the user they belonged to has
/// been deleted (the client shows "deleted user"); the ids stay.
/// </summary>
public sealed record AdminAuditEntryResponse(
    long Id,
    DateTime CreatedAtUtc,
    string ActorId,
    string? ActorUserName,
    AuditAction Action,
    string? TargetUserId,
    string? TargetUserName,
    int? TargetCollectionId,
    string? TargetCollectionName,
    string? Note);
