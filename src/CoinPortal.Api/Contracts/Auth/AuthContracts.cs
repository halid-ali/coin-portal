using System.ComponentModel.DataAnnotations;
using CoinPortal.Api.Data;
using CoinPortal.Api.Validation;

namespace CoinPortal.Api.Contracts.Auth;

public sealed record RegisterRequest(
    [Required, StringLength(100)] string FirstName,
    [Required, StringLength(100)] string LastName,
    [Required, RegularExpression("^[a-zA-Z0-9._-]{3,30}$",
        ErrorMessage = "Username must be 3-30 characters: letters, digits, '.', '_' or '-'.")]
    string UserName,
    [Required, EmailAddress, StringLength(256)] string Email,
    [Required, MinimumAge(18)] DateOnly? BirthDate,
    [Required, StringLength(100, MinimumLength = 8)] string Password);

public sealed record LoginRequest(
    [Required] string UserNameOrEmail,
    [Required] string Password,
    bool RememberMe = false);

public sealed record UserResponse(
    string Id, string UserName, string Email,
    string FirstName, string LastName, DateOnly BirthDate)
{
    public static UserResponse From(ApplicationUser u) =>
        new(u.Id, u.UserName!, u.Email!, u.FirstName, u.LastName, u.BirthDate);
}