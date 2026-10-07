using System.ComponentModel.DataAnnotations;
using CoinPortal.Api.Accounts;
using CoinPortal.Api.Data;
using CoinPortal.Api.Validation;

namespace CoinPortal.Api.Contracts.Auth;

/// <param name="Language">UI language at sign-up; saved as the user's preference and used for
/// the name of the first collection. Optional (older clients), English then.</param>
/// <param name="AcceptTerms">The sign-up form's box "I have read the privacy policy and accept the terms
/// of use"; required.</param>
public sealed record RegisterRequest(
    [Required, StringLength(100), NoControlCharacters] string FirstName,
    [Required, StringLength(100), NoControlCharacters] string LastName,
    [Required, RegularExpression("^[a-zA-Z0-9._-]{3,20}$",
        ErrorMessage = "Username must be 3-20 characters: letters, digits, '.', '_' or '-'.")]
    string UserName,
    [Required, EmailAddress, StringLength(256), NoControlCharacters] string Email,
    [Required, MinimumAge(18)] DateOnly? BirthDate,
    [Required, StringLength(100, MinimumLength = 8)] string Password,
    [SupportedLanguage] string? Language = null,
    [MustBeTrue(ErrorMessage = "The privacy policy and the terms of use must be accepted.")] bool AcceptTerms = false);

public sealed record LoginRequest(
    [Required] string UserNameOrEmail,
    [Required] string Password,
    bool RememberMe = false);

/// <param name="Language">Saved UI language, or null if the user never chose one.</param>
/// <param name="Theme">Saved color theme, or null if the user never chose one.</param>
/// <param name="Accent">Saved accent color, or null if the user never chose one.</param>
/// <param name="PreviousSignInAtUtc">The sign-in before the current session's, for the profile;
/// null if none is recorded (new account, or none since the field was added).</param>
/// <param name="Roles">Identity roles (AppRoles), e.g. ["Admin"]; empty for most users.</param>
/// <param name="EmailConfirmed">The address is verified (link from the e-mail); needed to share collections,
/// open another collection and hold more coins than <paramref name="UnverifiedMaxCoins"/>.</param>
/// <param name="UnverifiedMaxCoins">Coins the account may hold until the address is verified (site
/// setting); null once it is.</param>
/// <param name="UnverifiedDeletionDueUtc">When the account is deleted unless the address is verified;
/// null once it is, or when it never would be (lifetime 0, admins, locked accounts).</param>
public sealed record UserResponse(
    string Id, string UserName, string Email, bool EmailConfirmed, int? UnverifiedMaxCoins,
    DateTime? UnverifiedDeletionDueUtc,
    string FirstName, string LastName, DateOnly BirthDate, string? Language, ThemePreference? Theme,
    AccentColor? Accent, DateTime? PreviousSignInAtUtc, IReadOnlyList<string> Roles)
{
    public static UserResponse From(ApplicationUser u, IEnumerable<string> roles, UnverifiedLimits? limits) =>
        new(u.Id, u.UserName!, u.Email!, u.EmailConfirmed, limits?.MaxCoins, limits?.DeletionDueUtc,
            u.FirstName, u.LastName, u.BirthDate, u.PreferredLanguage, u.PreferredTheme, u.PreferredAccent,
            u.PreviousSignInAtUtc, roles.Order().ToList());
}

/// <param name="Token">The secret from the verification link (/verify-email?token=...).</param>
public sealed record VerifyEmailRequest([Required, StringLength(2000)] string Token);

/// <param name="UserNameOrEmail">Like the sign-in form's field.</param>
/// <param name="Language">The page's language: the e-mail's, if the account never chose one.</param>
public sealed record ForgotPasswordRequest(
    [Required, StringLength(256), NoControlCharacters] string UserNameOrEmail,
    [SupportedLanguage] string? Language = null);

/// <param name="Token">The secret from the reset link (/reset-password?token=...).</param>
public sealed record PasswordResetCheckRequest([Required, StringLength(2000)] string Token);

/// <summary>Whose password the link sets: shown on the page, the username may be forgotten too.</summary>
public sealed record PasswordResetCheckResponse(string UserName);

public sealed record ResetPasswordRequest(
    [Required, StringLength(2000)] string Token,
    [Required, StringLength(100, MinimumLength = 8)] string NewPassword);
