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
}