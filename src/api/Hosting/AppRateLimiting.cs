using System.Globalization;
using System.Net;
using System.Net.Sockets;
using System.Security.Claims;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;

namespace CoinPortal.Api.Hosting;

/// <summary>Rate limiter policy names, for [EnableRateLimiting(...)].</summary>
public static class RateLimitPolicies
{
    /// <summary>Sign-in and sign-up: password guessing across accounts, mass sign-ups.</summary>
    public const string Auth = "auth";

    /// <summary>Signed-out reads (PublicController): scrapers. Signed-in users are not limited.</summary>
    public const string Public = "public";

    /// <summary>Signed-out photo and cover downloads; higher, a page of thumbnails is many requests.</summary>
    public const string Photos = "photos";

    /// <summary>The data export (a ZIP of up to 300 MB): per signed-in user, not per address.</summary>
    public const string Export = "export";
}

/// <summary>Requests one client may send in a window.</summary>
public sealed class RateLimitRule
{
    public int PermitLimit { get; set; }

    public int WindowSeconds { get; set; } = 60;
}

/// <summary>
/// Configuration section "RateLimiting". Limits are per client IP address (IPv6: per /64 network)
/// and in memory, so a restart resets them.
/// </summary>
public sealed class RateLimitOptions
{
    public const string SectionName = "RateLimiting";

    public RateLimitRule Auth { get; set; } = new() { PermitLimit = 10 };

    public RateLimitRule Public { get; set; } = new() { PermitLimit = 120 };

    public RateLimitRule Photos { get; set; } = new() { PermitLimit = 600 };

    public RateLimitRule Export { get; set; } = new() { PermitLimit = 3, WindowSeconds = 600 };
}

public static class AppRateLimiting
{
    public static IServiceCollection AddAppRateLimiting(this IServiceCollection services)
    {
        services.AddOptions<RateLimitOptions>().BindConfiguration(RateLimitOptions.SectionName);

        return services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.AddPolicy(RateLimitPolicies.Auth, http => PerClient(http, o => o.Auth, signedInExempt: false));
            options.AddPolicy(RateLimitPolicies.Public, http => PerClient(http, o => o.Public, signedInExempt: true));
            options.AddPolicy(RateLimitPolicies.Photos, http => PerClient(http, o => o.Photos, signedInExempt: true));
            options.AddPolicy(RateLimitPolicies.Export, PerUser);
            options.OnRejected = OnRejectedAsync;
        });
    }

    private static RateLimitPartition<string> PerClient(
        HttpContext http, Func<RateLimitOptions, RateLimitRule> rule, bool signedInExempt)
    {
        // Signed-in users answer for what they do (an admin can lock them); an owner opening a big
        // collection of their own must not hit the limit
        if (signedInExempt && http.User.Identity?.IsAuthenticated == true)
        {
            return RateLimitPartition.GetNoLimiter("signed-in");
        }

        var limit = rule(http.RequestServices.GetRequiredService<IOptions<RateLimitOptions>>().Value);
        return RateLimitPartition.GetFixedWindowLimiter(ClientKey(http), _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = limit.PermitLimit,
            Window = TimeSpan.FromSeconds(limit.WindowSeconds),
            QueueLimit = 0,
        });
    }

    // Only on endpoints that require a signed-in user
    private static RateLimitPartition<string> PerUser(HttpContext http)
    {
        var limit = http.RequestServices.GetRequiredService<IOptions<RateLimitOptions>>().Value.Export;
        var userId = http.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? ClientKey(http);
        return RateLimitPartition.GetFixedWindowLimiter(userId, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = limit.PermitLimit,
            Window = TimeSpan.FromSeconds(limit.WindowSeconds),
            QueueLimit = 0,
        });
    }

    /// <summary>The client's IP address; for IPv6 its /64 network, which one subscriber usually gets whole.</summary>
    private static string ClientKey(HttpContext http)
    {
        var ip = http.Connection.RemoteIpAddress;
        if (ip is null)
        {
            return "unknown";
        }
        if (ip.IsIPv4MappedToIPv6)
        {
            ip = ip.MapToIPv4();
        }
        if (ip.AddressFamily == AddressFamily.InterNetworkV6)
        {
            var bytes = ip.GetAddressBytes();
            Array.Clear(bytes, 8, 8);
            ip = new IPAddress(bytes);
        }
        return ip.ToString();
    }

    // 429 ProblemDetails with a code (the client shows its own message) and Retry-After
    private static async ValueTask OnRejectedAsync(OnRejectedContext context, CancellationToken cancellationToken)
    {
        var http = context.HttpContext;
        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
        {
            http.Response.Headers.RetryAfter =
                ((int)Math.Ceiling(retryAfter.TotalSeconds)).ToString(CultureInfo.InvariantCulture);
        }

        var policy = http.GetEndpoint()?.Metadata.GetMetadata<EnableRateLimitingAttribute>()?.PolicyName;
        http.RequestServices.GetRequiredService<ILoggerFactory>()
            .CreateLogger(typeof(AppRateLimiting).FullName!)
            .LogWarning("Rate limit {Policy} exceeded by {Client}", policy, ClientKey(http));

        var problem = http.RequestServices.GetRequiredService<ProblemDetailsFactory>().CreateProblemDetails(
            http, StatusCodes.Status429TooManyRequests, "Too many requests. Try again later.");
        problem.Extensions["code"] = "rate_limited";
        await http.Response.WriteAsJsonAsync(problem, (System.Text.Json.JsonSerializerOptions?)null,
            "application/problem+json", cancellationToken);
    }
}
