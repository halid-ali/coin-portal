using CoinPortal.Api.Data;

namespace CoinPortal.Api.Contracts.Settings;

// The files of the data export (GET api/settings/export, a ZIP): account.json, collections.json,
// moderation.json and the images under photos/ and covers/. Paths in the JSON are relative to the ZIP's root.

/// <summary>account.json: everything stored about the user except security data (password hash, stamps).</summary>
/// <param name="MissingImages">
/// Images the account has whose file was not found on the server: the paths they would have in the
/// ZIP. Normally empty; otherwise the export is incomplete.
/// </param>
public sealed record AccountExportFile(
    DateTime ExportedAtUtc,
    string UserName,
    string Email,
    string FirstName,
    string LastName,
    DateOnly BirthDate,
    DateTime CreatedAtUtc,
    string? Language,
    ThemePreference? Theme,
    AccentColor? Accent,
    DateTime? LastSignInAtUtc,
    DateTime? PreviousSignInAtUtc,
    DateTime? LastSeenAtUtc,
    IReadOnlyList<string> MissingImages);

/// <param name="Cover">Path of the cover image in the ZIP, or null.</param>
/// <param name="ShareToken">The secret of the share link (link-only collections).</param>
/// <param name="HiddenByAdminAtUtc">When an administrator hid it, while it stays hidden.</param>
public sealed record CollectionExport(
    int Id,
    string Name,
    string? Description,
    CollectionVisibility Visibility,
    string? ShareToken,
    DateTime? HiddenByAdminAtUtc,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc,
    string? Cover,
    IReadOnlyList<CoinExport> Coins);

/// <param name="Photos">Path of each side's photo in the ZIP (largest size), keyed by side.</param>
public sealed record CoinExport(
    int Id,
    string Title,
    string? Description,
    Denomination Denomination,
    string CountryCode,
    int Year,
    string? MintMark,
    bool IsCommemorative,
    int Quantity,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc,
    IReadOnlyDictionary<CoinSide, string> Photos);

/// <summary>
/// moderation.json: what administrators did to the user's account or collections (the audit log
/// entries about them), with the reason they wrote; not who did it.
/// </summary>
public sealed record ModerationExport(
    DateTime CreatedAtUtc,
    AuditAction Action,
    int? CollectionId,
    string? CollectionName,
    string? Note);
