using System.ComponentModel.DataAnnotations;
using CoinPortal.Api.Validation;

namespace CoinPortal.Api.Contracts.Settings;

/// <param name="Language">Saved UI language, or null if the user never chose one.</param>
public sealed record UserSettingsResponse(string? Language);

/// <summary>Replaces the user's settings (PUT); every field is sent.</summary>
public sealed record UserSettingsRequest([Required, SupportedLanguage] string? Language);
