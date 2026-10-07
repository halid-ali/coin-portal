using System.Collections.Concurrent;
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

    /// <summary>Sending a verification e-mail again: per signed-in user, a mailbox must not be flooded.</summary>
    public const string Email = "email";
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

    public RateLimitRule Email { get; set; } = new() { PermitLimit = 3, WindowSeconds = 600 };

    /// <summary>
    /// Every change a signed-in user makes (POST, PUT, PATCH, DELETE), per user: a script cannot fill
    /// the database or keep the image decoder busy. Far above what a person clicks.
    /// </summary>
    public RateLimitRule Writes { get; set; } = new() { PermitLimit = 120 };
}

public static class AppRateLimiting
{
    public static IServiceCollection AddAppRateLimiting(this IServiceCollection services)
    {
        services.AddOptions<RateLimitOptions>().BindConfiguration(RateLimitOptions.SectionName)
            .Validate(o => new[] { o.Auth, o.Public, o.Photos, o.Export, o.Email, o.Writes }
                .All(r => r.PermitLimit > 0 && r.WindowSeconds > 0),
                "Every RateLimiting rule needs a PermitLimit and WindowSeconds above 0.")
            .ValidateOnStart();

        return services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.AddPolicy(RateLimitPolicies.Auth, http => PerClient(http, o => o.Auth, signedInExempt: false));
            options.AddPolicy(RateLimitPolicies.Public, http => PerClient(http, o => o.Public, signedInExempt: true));
            options.AddPolicy(RateLimitPolicies.Photos, http => PerClient(http, o => o.Photos, signedInExempt: true));
            options.AddPolicy(RateLimitPolicies.Export, http => PerUser(http, o => o.Export));
            options.AddPolicy(RateLimitPolicies.Email, http => PerUser(http, o => o.Email));
            // On top of the endpoint policies, for every request
            options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(WritesPerUser);
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

    private static RateLimitPartition<string> WritesPerUser(HttpContext http) =>
        http.User.Identity?.IsAuthenticated == true && !HttpMethods.IsGet(http.Request.Method)
            && !HttpMethods.IsHead(http.Request.Method) && !HttpMethods.IsOptions(http.Request.Method)
            ? PerUser(http, o => o.Writes)
            : RateLimitPartition.GetNoLimiter("");

    // Only on endpoints that require a signed-in user
    private static RateLimitPartition<string> PerUser(HttpContext http, Func<RateLimitOptions, RateLimitRule> rule)
    {
        var limit = rule(http.RequestServices.GetRequiredService<IOptions<RateLimitOptions>>().Value);
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

    // Minute of the last warning per policy and client: a flood of refused requests is one log line
    // a minute, not one per request (the log files have a size limit)
    private static readonly ConcurrentDictionary<string, long> LastWarning = new();

    private static bool ShouldLog(string key)
    {
        var minute = Environment.TickCount64 / 60_000;
        if (LastWarning.Count > 10_000)
        {
            LastWarning.Clear();
        }
        var previous = LastWarning.GetOrAdd(key, -1);
        return previous != minute && LastWarning.TryUpdate(key, minute, previous);
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

        // Without an endpoint policy the per-user write limit (the global limiter) refused it
        var policy = http.GetEndpoint()?.Metadata.GetMetadata<EnableRateLimitingAttribute>()?.PolicyName
            ?? "writes";
        var client = ClientKey(http);
        if (ShouldLog(policy + " " + client))
        {
            http.RequestServices.GetRequiredService<ILoggerFactory>()
                .CreateLogger(typeof(AppRateLimiting).FullName!)
                .LogWarning("Rate limit {Policy} exceeded by {Client} (logged once a minute per client)",
                    policy, client);
        }

        var problem = http.RequestServices.GetRequiredService<ProblemDetailsFactory>().CreateProblemDetails(
            http, StatusCodes.Status429TooManyRequests, "Too many requests. Try again later.");
        problem.Extensions["code"] = "rate_limited";
        await http.Response.WriteAsJsonAsync(problem, (System.Text.Json.JsonSerializerOptions?)null,
            "application/problem+json", cancellationToken);
    }
}
