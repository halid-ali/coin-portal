using CoinPortal.Api.Data;
using CoinPortal.Api.Validation;

namespace CoinPortal.Api.Contracts.Settings;

/// <param name="Language">Saved UI language, or null if the user never chose one.</param>
/// <param name="Theme">Saved color theme, or null if the user never chose one.</param>
/// <param name="Accent">Saved accent color, or null if the user never chose one.</param>
public sealed record UserSettingsResponse(string? Language, ThemePreference? Theme, AccentColor? Accent);

/// <summary>
/// Replaces the user's settings (PUT); every field is sent. Null keeps a setting "not chosen",
/// so changing one setting does not turn the other into an explicit choice.
/// </summary>
public sealed record UserSettingsRequest(
    [SupportedLanguage] string? Language,
    ThemePreference? Theme,
    AccentColor? Accent);
