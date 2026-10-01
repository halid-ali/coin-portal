using Microsoft.AspNetCore.Identity;

namespace CoinPortal.Api.Data;

// Application user; extends the default Identity user with profile fields
public class ApplicationUser : IdentityUser
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;

    // Date only, no time component (used for the 18+ age check)
    public DateOnly BirthDate { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    // UI language chosen by the user (SupportedLanguages); null means no choice was saved and
    // the client follows the device (its own saved choice or the browser language)
    public string? PreferredLanguage { get; set; }

    // Color theme chosen by the user; null means no choice was saved (see ThemePreference)
    public ThemePreference? PreferredTheme { get; set; }

    // Accent color chosen by the user; null means no choice was saved (see AccentColor)
    public AccentColor? PreferredAccent { get; set; }

    // How often LastSeenAtUtc is written at most: it shows activity, not every request
    public static readonly TimeSpan LastSeenPrecision = TimeSpan.FromHours(1);

    // Sign-in with a password or by registering; null until the first one after this field existed
    public DateTime? LastSignInAtUtc { get; set; }

    // The sign-in before the last one, shown to the user (an unknown one hints at a stolen password)
    public DateTime? PreviousSignInAtUtc { get; set; }

    // Last time the app was opened while signed in (GET me, see LastSeenPrecision). The cookie
    // lasts weeks, so this tells active users apart, not LastSignInAtUtc
    public DateTime? LastSeenAtUtc { get; set; }

    // Locked by an admin (until unlocked): cannot sign in (Identity LockoutEnd is set to the
    // maximum as well) and their shared collections are hidden (CollectionAccess). Not the
    // temporary lockout after failed sign-ins, which only sets LockoutEnd
    public DateTime? LockedAtUtc { get; set; }
}
