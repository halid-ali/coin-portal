using CoinPortal.Api.Contracts.Auth;
using CoinPortal.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.EntityFrameworkCore;

namespace CoinPortal.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(
    AppDbContext db,
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
            BirthDate = request.BirthDate!.Value,
            PreferredLanguage = request.Language
        };

        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            // Map Identity errors (duplicate email/username, weak password) to a 400 response
            foreach (var error in result.Errors)
                ModelState.AddModelError(error.Code, error.Description);
            return ValidationProblem(ModelState);
        }

        // Every user starts with one collection, so coins can be added right away
        var now = DateTime.UtcNow;
        db.Collections.Add(new Collection
        {
            OwnerId = user.Id,
            Name = Collection.DefaultNameFor(request.Language),
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        });
        await db.SaveChangesAsync();

        // Sign the new user in right away
        await signInManager.SignInAsync(user, isPersistent: false);
        await RecordSignInAsync(user);
        return Ok(UserResponse.From(user, []));
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

        // Without a code: the temporary lockout after failed attempts
        if (result.IsLockedOut)
            return user.LockedAtUtc is null
                ? Problem(title: "Account temporarily locked. Try again later.",
                          statusCode: StatusCodes.Status423Locked)
                : this.CodedProblem("account_locked", "This account has been locked by an administrator.",
                                    StatusCodes.Status423Locked);

        if (!result.Succeeded)
            return InvalidCredentials();

        await RecordSignInAsync(user);
        return Ok(await ToResponseAsync(user));
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
        if (user is null)
            return Unauthorized();

        // The client asks at startup, so this is "last time the app was opened"
        var now = DateTime.UtcNow;
        if (user.LastSeenAtUtc is not { } seen || now - seen >= ApplicationUser.LastSeenPrecision)
        {
            await db.Users.Where(u => u.Id == user.Id)
                .ExecuteUpdateAsync(s => s.SetProperty(u => u.LastSeenAtUtc, now));
        }

        return Ok(await ToResponseAsync(user));
    }

    /// <summary>
    /// Issues a readable XSRF-TOKEN cookie. Tokens are bound to the current user,
    /// so the client calls this at startup and after every login/logout.
    /// </summary>
    [HttpGet("antiforgery")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public IActionResult GetAntiforgeryToken([FromServices] IAntiforgery antiforgery)
    {
        var tokens = antiforgery.GetAndStoreTokens(HttpContext);

        Response.Cookies.Append("XSRF-TOKEN", tokens.RequestToken!, new CookieOptions
        {
            HttpOnly = false, // Angular must be able to read it
            SameSite = SameSiteMode.Strict,
            Secure = Request.IsHttps,
            Path = "/",
            IsEssential = true
        });

        return NoContent();
    }

    // The last sign-in becomes the previous one, in one UPDATE (the right-hand sides read the old
    // row). Written directly, not with UserManager, so Identity's concurrency stamp stays as it is
    private async Task RecordSignInAsync(ApplicationUser user)
    {
        var now = DateTime.UtcNow;
        await db.Users.Where(u => u.Id == user.Id).ExecuteUpdateAsync(s => s
            .SetProperty(u => u.PreviousSignInAtUtc, u => u.LastSignInAtUtc)
            .SetProperty(u => u.LastSignInAtUtc, now)
            .SetProperty(u => u.LastSeenAtUtc, now));
        await db.Entry(user).ReloadAsync();
    }

    // Roles from the database, not the cookie: current even before the cookie is refreshed
    private async Task<UserResponse> ToResponseAsync(ApplicationUser user) =>
        UserResponse.From(user, await userManager.GetRolesAsync(user));

    // Same message for unknown user and wrong password (no account enumeration)
    private ObjectResult InvalidCredentials() =>
        Problem(title: "Invalid username/email or password.",
                statusCode: StatusCodes.Status401Unauthorized);
}
