using CoinPortal.Api.Contracts.Auth;
using CoinPortal.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace CoinPortal.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(
    UserManager<ApplicationUser> userManager,
    SignInManager<ApplicationUser> signInManager) : ControllerBase
{
    [HttpPost("register")]
    public async Task<ActionResult<UserResponse>> Register(RegisterRequest request)
    {
        var user = new ApplicationUser
        {
            UserName = request.UserName.Trim(),
            Email = request.Email.Trim(),
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            BirthDate = request.BirthDate!.Value
        };

        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            // Map Identity errors (duplicate email/username, weak password) to a 400 response
            foreach (var error in result.Errors)
                ModelState.AddModelError(error.Code, error.Description);
            return ValidationProblem(ModelState);
        }

        // Sign the new user in right away
        await signInManager.SignInAsync(user, isPersistent: false);
        return Ok(UserResponse.From(user));
    }

    [HttpPost("login")]
    public async Task<ActionResult<UserResponse>> Login(LoginRequest request)
    {
        var key = request.UserNameOrEmail.Trim();
        var user = key.Contains('@')
            ? await userManager.FindByEmailAsync(key)
            : await userManager.FindByNameAsync(key);

        if (user is null)
            return InvalidCredentials();

        var result = await signInManager.PasswordSignInAsync(
            user, request.Password, request.RememberMe, lockoutOnFailure: true);

        if (result.IsLockedOut)
            return Problem(title: "Account temporarily locked. Try again later.",
                           statusCode: StatusCodes.Status423Locked);

        if (!result.Succeeded)
            return InvalidCredentials();

        return Ok(UserResponse.From(user));
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await signInManager.SignOutAsync();
        return NoContent();
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<UserResponse>> Me()
    {
        var user = await userManager.GetUserAsync(User);
        return user is null ? Unauthorized() : Ok(UserResponse.From(user));
    }

    // Same message for unknown user and wrong password (no account enumeration)
    private ObjectResult InvalidCredentials() =>
        Problem(title: "Invalid username/email or password.",
                statusCode: StatusCodes.Status401Unauthorized);
}