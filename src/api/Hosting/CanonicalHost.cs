using Microsoft.AspNetCore.Http.Extensions;
using Microsoft.Extensions.Options;

namespace CoinPortal.Api.Hosting;

/// <summary>
/// Configuration section "CanonicalHost": the site's one public address. Empty (the default, also
/// in development and tests) leaves every host name alone; on the server it is set in web.config
/// (<c>CanonicalHost__Host</c>).
/// </summary>
public sealed class CanonicalHostOptions
{
    public const string SectionName = "CanonicalHost";

    /// <summary>A bare host name such as <c>example.com</c>: no scheme, port or path.</summary>
    public string? Host { get; set; }
}

/// <summary>
/// Requests for any other host name (the hosting provider's own address, www.) are redirected
/// permanently to https://{CanonicalHost:Host}, with the path and query kept: old links and
/// bookmarks keep working, and the sign-in cookie lives on one host. 308 keeps the method, so a
/// form posted to an old address is not silently turned into a GET. Let's Encrypt's HTTP
/// challenges are left alone, each host name renews its certificate on its own name.
/// </summary>
public static class CanonicalHost
{
    public static IServiceCollection AddAppCanonicalHost(this IServiceCollection services)
    {
        services.AddOptions<CanonicalHostOptions>()
            .BindConfiguration(CanonicalHostOptions.SectionName)
            .Validate(o => string.IsNullOrEmpty(o.Host) || Uri.CheckHostName(o.Host) == UriHostNameType.Dns,
                "CanonicalHost:Host must be a bare host name, e.g. example.com.")
            .ValidateOnStart();
        return services;
    }

    public static IApplicationBuilder UseAppCanonicalHost(this WebApplication app)
    {
        var host = app.Services.GetRequiredService<IOptions<CanonicalHostOptions>>().Value.Host;
        if (string.IsNullOrEmpty(host))
        {
            return app;
        }

        var canonical = new HostString(host);
        return app.Use((context, next) =>
        {
            var request = context.Request;
            if (string.Equals(request.Host.Host, host, StringComparison.OrdinalIgnoreCase)
                || request.Path.StartsWithSegments("/.well-known/acme-challenge"))
            {
                return next(context);
            }

            context.Response.StatusCode = StatusCodes.Status308PermanentRedirect;
            context.Response.Headers.Location =
                UriHelper.BuildAbsolute("https", canonical, request.PathBase, request.Path, request.QueryString);
            return Task.CompletedTask;
        });
    }
}
