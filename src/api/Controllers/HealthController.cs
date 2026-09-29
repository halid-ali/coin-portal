using System.Reflection;
using Microsoft.AspNetCore.Mvc;

namespace CoinPortal.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    // Release version from the Git tag (MinVer), e.g. "0.1.0+a1b2c3d"; used to verify deployments
    private static readonly string Version =
        typeof(HealthController).Assembly
            .GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion ?? "unknown";

    // Simple liveness endpoint used to verify the dev proxy and later deployments
    [HttpGet]
    public IActionResult Get() =>
        Ok(new { status = "ok", version = Version, serverTimeUtc = DateTime.UtcNow });
}
