using System.ComponentModel.DataAnnotations;
using CoinPortal.Api.Data;
using CoinPortal.Api.Validation;

namespace CoinPortal.Api.Contracts.Auth;

/// <param name="Language">UI language at sign-up; saved as the user's preference and used for
/// the name of the first collection. Optional (older clients), English then.</param>
public sealed record RegisterRequest(
    [Required, StringLength(100)] string FirstName,
    [Required, StringLength(100)] string LastName,
    [Required, RegularExpression("^[a-zA-Z0-9._-]{3,20}$",
        ErrorMessage = "Username must be 3-20 characters: letters, digits, '.', '_' or '-'.")]
    string UserName,
    [Required, EmailAddress, StringLength(256)] string Email,
    [Required, MinimumAge(18)] DateOnly? BirthDate,
    [Required, StringLength(100, MinimumLength = 8)] string Password,
    [SupportedLanguage] string? Language = null);

public sealed record LoginRequest(
    [Required] string UserNameOrEmail,
    [Required] string Password,
    bool RememberMe = false);

/// <param name="Language">Saved UI language, or null if the user never chose one.</param>
/// <param name="Theme">Saved color theme, or null if the user never chose one.</param>
/// <param name="Accent">Saved accent color, or null if the user never chose one.</param>
public sealed record UserResponse(
    string Id, string UserName, string Email,
    string FirstName, string LastName, DateOnly BirthDate, string? Language, ThemePreference? Theme,
    AccentColor? Accent)
{
    public static UserResponse From(ApplicationUser u) =>
        new(u.Id, u.UserName!, u.Email!, u.FirstName, u.LastName, u.BirthDate, u.PreferredLanguage,
            u.PreferredTheme, u.PreferredAccent);
}
