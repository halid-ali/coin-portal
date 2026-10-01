using System.Text.RegularExpressions;
using Microsoft.AspNetCore.StaticFiles;

namespace CoinPortal.Api.Hosting;

/// <summary>
/// Serves the Angular client from wwwroot (a publish puts the build there, see the .csproj). Paths
/// the client routes itself (/collections/5, /s/{key}) get index.html. Without a client build
/// (development: ng serve serves it) only the API part applies.
/// </summary>
public static partial class SpaHosting
{
    private static readonly StaticFileOptions FileOptions = new() { OnPrepareResponse = SetCacheHeaders };

    public static IApplicationBuilder UseSpaStaticFiles(this WebApplication app) =>
        HasClient(app) ? app.UseStaticFiles(FileOptions) : app;

    public static void MapSpaFallback(this WebApplication app)
    {
        // Unknown API addresses stay a 404 instead of answering with the app's page
        app.MapFallback("api/{**path}", () => Results.NotFound());

        if (HasClient(app))
        {
            app.MapFallbackToFile("index.html", FileOptions);
        }
    }

    private static bool HasClient(WebApplication app) =>
        app.Environment.WebRootFileProvider.GetFileInfo("index.html").Exists;

    // Built files carry a content hash in their name (main-ABCD1234.js): a new build gets new names,
    // so they can be cached for good. Everything else, index.html above all, is revalidated on each
    // use, so a new release reaches users on their next visit
    private static void SetCacheHeaders(StaticFileResponseContext context) =>
        context.Context.Response.Headers.CacheControl = HashedName().IsMatch(context.File.Name)
            ? "public, max-age=31536000, immutable"
            : "no-cache";

    [GeneratedRegex(@"-[A-Z0-9]{8}\.[a-z0-9]+$")]
    private static partial Regex HashedName();
}
