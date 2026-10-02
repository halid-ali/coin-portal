using Microsoft.AspNetCore.HttpsPolicy;
using Microsoft.Net.Http.Headers;

namespace CoinPortal.Api.Hosting;

/// <summary>
/// Response headers that browsers act on: no framing (clickjacking), no MIME sniffing, the
/// referrer only as an origin to other sites (share links carry their key in the path), no
/// powerful browser features, HSTS outside development, and no caching of API data, which is
/// often personal (a proxy or CDN in front of the site must never keep it).
/// </summary>
public static class SecurityHeaders
{
    public static IServiceCollection AddAppSecurityHeaders(this IServiceCollection services)
    {
        services.AddOptions<HstsOptions>().Configure<IConfiguration>((options, config) =>
        {
            // Short at first, so a wrong HTTPS setup is undone within days; a year once the site
            // and its certificate are settled (Hsts:MaxAgeDays). Localhost is excluded by default
            options.MaxAge = TimeSpan.FromDays(config.GetValue("Hsts:MaxAgeDays", 30));
            options.IncludeSubDomains = false;
            options.Preload = false;
        });
        return services;
    }

    public static IApplicationBuilder UseAppSecurityHeaders(this WebApplication app)
    {
        if (!app.Environment.IsDevelopment())
        {
            app.UseHsts();
        }

        return app.Use((context, next) =>
        {
            context.Response.OnStarting(() =>
            {
                var headers = context.Response.Headers;
                headers.XContentTypeOptions = "nosniff";
                headers.XFrameOptions = "DENY";
                headers.ContentSecurityPolicy = "frame-ancestors 'none'";
                headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
                headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()";

                // Images set their own (immutable, versioned URLs); everything else under /api stays
                // out of every cache
                if (context.Request.Path.StartsWithSegments("/api") && !headers.ContainsKey(HeaderNames.CacheControl))
                {
                    headers.CacheControl = "no-store";
                }
                return Task.CompletedTask;
            });
            return next(context);
        });
    }
}
