namespace CoinPortal.Api.Data;

/// <summary>What an admin did (the panel's audit log). Stored as int, sent as name.</summary>
public enum AuditAction
{
    UserLocked = 1,
    UserUnlocked = 2,
    CollectionHidden = 3,
    CollectionUnlocked = 4,
    UserDeleted = 5,
}

/// <summary>
/// One admin action. History must outlive what it is about, so there are no foreign keys: the
/// ids are kept with the names as they were at that moment (a deleted user or collection still
/// reads well, and no cascade path to the users table is added). When a user is deleted, their
/// names are removed (AccountDeletion): ActorUserName, TargetUserName and TargetCollectionName
/// become null and the panel shows "deleted user". The admin's free-text note is kept as written.
/// </summary>
public class AuditLogEntry
{
    public const int UserNameMaxLength = 256;
    public const int NoteMaxLength = 500;

    public long Id { get; set; }
    public DateTime CreatedAtUtc { get; set; }

    public string ActorId { get; set; } = string.Empty;
    public string? ActorUserName { get; set; }

    public AuditAction Action { get; set; }

    public string? TargetUserId { get; set; }
    public string? TargetUserName { get; set; }
    public int? TargetCollectionId { get; set; }
    public string? TargetCollectionName { get; set; }

    /// <summary>The admin's optional reason; only shown in the audit log.</summary>
    public string? Note { get; set; }
}
