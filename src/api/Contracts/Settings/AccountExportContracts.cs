using CoinPortal.Api.Data;

namespace CoinPortal.Api.Contracts.Settings;

// The files of the data export (GET api/settings/export, a ZIP): account.json, collections.json
// and the images under photos/ and covers/. Paths in the JSON are relative to the ZIP's root.

/// <summary>account.json: everything stored about the user except security data (password hash, stamps).</summary>
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
    DateTime? LastSeenAtUtc);

/// <param name="Cover">Path of the cover image in the ZIP, or null.</param>
public sealed record CollectionExport(
    int Id,
    string Name,
    string? Description,
    CollectionVisibility Visibility,
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
