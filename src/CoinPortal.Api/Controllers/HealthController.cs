using Microsoft.AspNetCore.Mvc;

namespace CoinPortal.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    // Simple liveness endpoint used to verify the dev proxy and later deployments
    [HttpGet]
    public IActionResult Get() =>
        Ok(new { status = "ok", serverTimeUtc = DateTime.UtcNow });
}