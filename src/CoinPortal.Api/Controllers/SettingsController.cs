using CoinPortal.Api.Contracts.Settings;
using CoinPortal.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace CoinPortal.Api.Controllers;

/// <summary>The signed-in user's own settings (settings page). UI language, color theme and accent color.</summary>
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

    private static UserSettingsResponse ToResponse(ApplicationUser user) =>
        new(user.PreferredLanguage, user.PreferredTheme, user.PreferredAccent);
}
