using Microsoft.AspNetCore.HttpsPolicy;
using Microsoft.Net.Http.Headers;

namespace CoinPortal.Api.Hosting;

/// <summary>
/// Response headers that browsers act on: no framing (clickjacking), no MIME sniffing, the
/// referrer only as an origin to other sites (share links carry their key in the path), no
/// powerful browser features, site isolation (Cross-Origin-*-Policy), HSTS outside development,
/// and no caching of API data, which is
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
                // Site isolation (Spectre): no window of another site shares the browsing context,
                // no other site embeds our responses, and pages load only resources that allow it.
                // The site loads nothing from other origins, so none of the three blocks anything
                headers["Cross-Origin-Opener-Policy"] = "same-origin";
                headers["Cross-Origin-Resource-Policy"] = "same-origin";
                headers["Cross-Origin-Embedder-Policy"] = "require-corp";

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
