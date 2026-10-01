using CoinPortal.Api.Accounts;
using CoinPortal.Api.Authorization;
using CoinPortal.Api.Contracts.Settings;
using CoinPortal.Api.Data;
using CoinPortal.Api.Hosting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace CoinPortal.Api.Controllers;

/// <summary>
/// The signed-in user's own settings (settings page): UI language, color theme and accent color,
/// and the account itself (data export, deletion).
/// </summary>
[ApiController]
[Authorize]
[Route("api/[controller]")]
public class SettingsController(UserManager<ApplicationUser> userManager) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<UserSettingsResponse>> Get()
    {
        var user = await userManager.GetUserAsync(User);
        return user is null ? Unauthorized() : Ok(ToResponse(user));
    }

    [HttpPut]
    public async Task<ActionResult<UserSettingsResponse>> Update(UserSettingsRequest request)
    {
        var user = await userManager.GetUserAsync(User);
        if (user is null)
            return Unauthorized();

        user.PreferredLanguage = request.Language;
        user.PreferredTheme = request.Theme;
        user.PreferredAccent = request.Accent;

        var result = await userManager.UpdateAsync(user);
        if (!result.Succeeded)
        {
            foreach (var error in result.Errors)
                ModelState.AddModelError(error.Code, error.Description);
            return ValidationProblem(ModelState);
        }

        return Ok(ToResponse(user));
    }

    /// <summary>
    /// Everything the user stored, as a ZIP: account.json, collections.json, photos/ and covers/
    /// (see AccountExportContracts). A plain GET, so the browser downloads it itself.
    /// </summary>
    [HttpGet("export")]
    [EnableRateLimiting(RateLimitPolicies.Export)]
    [ProducesResponseType<FileStreamResult>(StatusCodes.Status200OK, "application/zip")]
    public async Task<IActionResult> Export([FromServices] AccountExport export, CancellationToken ct)
    {
        var user = await userManager.GetUserAsync(User);
        if (user is null)
            return Unauthorized();

        var zip = await export.CreateAsync(user, ct);
        return File(zip, "application/zip", AccountExport.FileName(user, DateTime.UtcNow));
    }

    /// <summary>
    /// Deletes the account and everything in it, at once and for good. Asks for the password; wrong
    /// ones count towards the lockout like sign-in attempts. Admins are removed from the
    /// configuration first (403 admin_account), like they cannot be locked.
    /// </summary>
    [HttpDelete("account")]
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status423Locked)]
    public async Task<IActionResult> DeleteAccount(DeleteAccountRequest request,
        [FromServices] SignInManager<ApplicationUser> signInManager,
        [FromServices] AccountDeletion deletion, CancellationToken ct)
    {
        var user = await userManager.GetUserAsync(User);
        if (user is null)
            return Unauthorized();

        if (await userManager.IsInRoleAsync(user, AppRoles.Admin))
            return this.CodedProblem("admin_account",
                "Administrators cannot delete their account; remove them from the configuration first.",
                StatusCodes.Status403Forbidden);

        var check = await signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);
        if (check.IsLockedOut)
            return Problem(title: "Account temporarily locked. Try again later.",
                           statusCode: StatusCodes.Status423Locked);
        if (!check.Succeeded)
            return this.CodedProblem("wrong_password", "The password is not correct.");

        await deletion.DeleteAsync(user, beforeSave: null, ct);
        await signInManager.SignOutAsync();
        return NoContent();
    }

    private static UserSettingsResponse ToResponse(ApplicationUser user) =>
        new(user.PreferredLanguage, user.PreferredTheme, user.PreferredAccent);
}
