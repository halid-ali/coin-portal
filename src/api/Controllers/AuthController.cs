using CoinPortal.Api.Accounts;
using CoinPortal.Api.Contracts.Auth;
using CoinPortal.Api.Data;
using CoinPortal.Api.Email;
using CoinPortal.Api.Hosting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.EntityFrameworkCore;

namespace CoinPortal.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(
    AppDbContext db,
    UserManager<ApplicationUser> userManager,
    SignInManager<ApplicationUser> signInManager,
    IPasswordHasher<ApplicationUser> passwordHasher,
    EmailVerification emailVerification,
    EmailVerificationTokens verificationTokens,
    UnverifiedAccounts unverified,
    ILogger<AuthController> logger) : ControllerBase
{
    [HttpPost("register")]
    [EnableRateLimiting(RateLimitPolicies.Auth)]
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

        // The user and their first collection together or not at all: a failure in between would
        // leave an account without a collection (and a sign-up that "failed" but took the name).
        // Run by the execution strategy, which repeats the whole unit after a transient error
        var errors = await db.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
        {
            // A repeat starts clean: nothing left over from the failed attempt
            db.ChangeTracker.Clear();
            await using var transaction = await db.Database.BeginTransactionAsync();
            var result = await userManager.CreateAsync(user, request.Password);
            if (!result.Succeeded)
            {
                return result.Errors.ToList();
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
            await transaction.CommitAsync();
            return new List<IdentityError>();
        });
        if (errors.Count > 0)
        {
            // Map Identity errors (duplicate email/username, weak password) to a 400 response
            foreach (var error in errors)
                ModelState.AddModelError(error.Code, error.Description);
            return ValidationProblem(ModelState);
        }

        // Sign the new user in right away, kept like a sign-in with "remember me" (its default):
        // signing up is almost always done on one's own device
        await signInManager.SignInAsync(user, isPersistent: true);
        await RecordSignInAsync(user);

        // The account exists either way: a mail server that is down must not fail the sign-up, the
        // user can ask for the link again from the notice in the client
        try
        {
            await emailVerification.SendAsync(user, HttpContext.RequestAborted);
        }
        catch (Exception e) when (e is not OperationCanceledException)
        {
            logger.LogError(e, "Verification e-mail not sent at sign-up: {UserId}", user.Id);
        }
        return Ok(UserResponse.From(user, [], await unverified.MaxCoinsForAsync(user, HttpContext.RequestAborted)));
    }

    /// <summary>
    /// Confirms the e-mail address with the secret of a verification link. Signed out as well:
    /// the link may be opened on another device. Confirmed already: 204 again.
    /// </summary>
    [HttpPost("verify-email")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> VerifyEmail(VerifyEmailRequest request)
    {
        // Forged, damaged, expired, or for an address the account no longer has: all look the same
        if (verificationTokens.Read(request.Token) is not { } claim
            || await userManager.FindByIdAsync(claim.UserId) is not { } user
            || !string.Equals(user.Email, claim.Email, StringComparison.OrdinalIgnoreCase))
        {
            return this.CodedProblem("invalid_token", "The link is invalid or has expired.");
        }

        if (!user.EmailConfirmed)
        {
            // Not ConfirmEmailAsync: that checks Identity's own token. The security stamp stays,
            // no session ends
            user.EmailConfirmed = true;
            var result = await userManager.UpdateAsync(user);
            if (!result.Succeeded)
            {
                throw new InvalidOperationException(string.Join("; ", result.Errors.Select(e => e.Code)));
            }
        }
        return NoContent();
    }

    /// <summary>Sends the verification link again; nothing to do when the address is confirmed.</summary>
    [Authorize]
    [HttpPost("verify-email/resend")]
    [EnableRateLimiting(RateLimitPolicies.Email)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> ResendVerificationEmail(CancellationToken ct)
    {
        var user = await userManager.GetUserAsync(User);
        if (user is null)
            return Unauthorized();
        if (user.EmailConfirmed)
            return NoContent();

        try
        {
            await emailVerification.SendAsync(user, ct);
        }
        catch (Exception e) when (e is not OperationCanceledException)
        {
            logger.LogError(e, "Verification e-mail not sent: {UserId}", user.Id);
            return this.CodedProblem("email_not_sent", "The e-mail could not be sent. Try again later.",
                StatusCodes.Status503ServiceUnavailable);
        }
        return NoContent();
    }

    [HttpPost("login")]
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    public async Task<ActionResult<UserResponse>> Login(LoginRequest request)
    {
        var key = request.UserNameOrEmail.Trim();
        var user = key.Contains('@')
            ? await userManager.FindByEmailAsync(key)
            : await userManager.FindByNameAsync(key);

        if (user is null)
        {
            // The same hashing work as a real check: the response time does not tell that the
            // account does not exist
            passwordHasher.VerifyHashedPassword(new ApplicationUser(), DummyPasswordHash(), request.Password);
            return InvalidCredentials();
        }

        // A lock is only reported to someone who knows the password; anyone else gets the usual
        // 401, so failed attempts cannot reveal the account or its lock. Not counted as failures.
        if (await userManager.IsLockedOutAsync(user))
            return await userManager.CheckPasswordAsync(user, request.Password)
                ? LockedOut(user)
                : InvalidCredentials();

        var result = await signInManager.PasswordSignInAsync(
            user, request.Password, request.RememberMe, lockoutOnFailure: true);

        // Not locked a moment ago: this failed attempt started the lockout (or one ran in
        // parallel), so the password was not accepted
        if (!result.Succeeded)
            return InvalidCredentials();

        await RecordSignInAsync(user);
        return Ok(await ToResponseAsync(user));
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        // Deleting the cookie alone would leave any copy of it valid until it expires. A new
        // security stamp ends every session of the user, on other devices too, within the cookie
        // validation interval (SecurityStampValidatorOptions)
        if (await userManager.GetUserAsync(User) is { } user)
        {
            await userManager.UpdateSecurityStampAsync(user);
        }
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
    [EnableRateLimiting(RateLimitPolicies.Public)]
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
        UserResponse.From(user, await userManager.GetRolesAsync(user),
            await unverified.MaxCoinsForAsync(user, HttpContext.RequestAborted));

    // Without a code: the temporary lockout after failed attempts
    private ObjectResult LockedOut(ApplicationUser user) =>
        user.LockedAtUtc is null
            ? Problem(title: "Account temporarily locked. Try again later.",
                      statusCode: StatusCodes.Status423Locked)
            : this.CodedProblem("account_locked", "This account has been locked by an administrator.",
                                StatusCodes.Status423Locked);

    private static string? dummyPasswordHash;

    // A hash of a random password, made once by the configured hasher (same algorithm and cost)
    private string DummyPasswordHash() =>
        dummyPasswordHash ??= passwordHasher.HashPassword(new ApplicationUser(), Guid.NewGuid().ToString());

    // Same message for unknown user and wrong password (no account enumeration)
    private ObjectResult InvalidCredentials() =>
        Problem(title: "Invalid username/email or password.",
                statusCode: StatusCodes.Status401Unauthorized);
}
