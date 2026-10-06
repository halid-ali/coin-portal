using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;
using Serilog;
using Serilog.Core;
using Serilog.Events;

namespace CoinPortal.Api.Hosting;

/// <summary>
/// Configuration section "Logs": the folder of the daily log files (relative to the content root;
/// empty = console only) and how many files are kept. Hosting points Path outside the site folder,
/// like the photos (Logs__Path).
/// </summary>
public sealed class LogFileOptions
{
    public const string SectionName = "Logs";

    public string? Path { get; set; } = "App_Data/logs";

    /// <summary>Days the log files are kept (at most three files a day, 20 MB each).</summary>
    [System.ComponentModel.DataAnnotations.Range(1, 3650)]
    public int RetainedDays { get; set; } = 30;
}

/// <summary>
/// Serilog: levels from the "Serilog" section, console always, daily files when Logs:Path is set,
/// and one line per request (UseAppRequestLogging).
/// </summary>
public static partial class AppLogging
{
    public static IServiceCollection AddAppLogging(this IServiceCollection services)
    {
        services.AddOptions<LogFileOptions>().BindConfiguration(LogFileOptions.SectionName)
            .ValidateDataAnnotations().ValidateOnStart();
        // Serilog's own problems (a log folder it cannot write) go to the error output instead of
        // vanishing; on IIS they reach the stdout log when that is switched on
        Serilog.Debugging.SelfLog.Enable(Console.Error);

        // Configured from the services, not at startup: test hosts change the configuration later
        return services.AddSerilog((provider, logger) =>
        {
            logger.ReadFrom.Configuration(provider.GetRequiredService<IConfiguration>())
                .Enrich.FromLogContext()
                .Enrich.With<MaskSharedLinks>()
                .WriteTo.Console();

            var files = provider.GetRequiredService<IOptions<LogFileOptions>>().Value;
            if (LogFolder(provider.GetRequiredService<IWebHostEnvironment>(), files) is { } folder)
            {
                logger.WriteTo.File(
                    System.IO.Path.Combine(folder, "coinportal-.log"),
                    rollingInterval: RollingInterval.Day,
                    // Days, not files: a day that passes the size limit has several files
                    retainedFileTimeLimit: TimeSpan.FromDays(files.RetainedDays),
                    retainedFileCountLimit: files.RetainedDays * 3,
                    fileSizeLimitBytes: 20 * 1024 * 1024,
                    rollOnFileSizeLimit: true,
                    outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {SourceContext}: {Message:lj}{NewLine}{Exception}");
            }
        });
    }

    /// <summary>The absolute folder of the log files, or null when only the console logs.</summary>
    public static string? LogFolder(IWebHostEnvironment env, LogFileOptions options) =>
        string.IsNullOrWhiteSpace(options.Path)
            ? null
            : System.IO.Path.GetFullPath(System.IO.Path.Combine(env.ContentRootPath, options.Path));

    /// <summary>One line per request ("HTTP GET /api/coins?page=2 responded 200 in 35.1 ms").</summary>
    public static IApplicationBuilder UseAppRequestLogging(this IApplicationBuilder app) =>
        app.UseSerilogRequestLogging(options =>
        {
            // The address as requested: the client fallback rewrites the path to /index.html
            options.IncludeQueryInRequestPath = true;
            options.GetLevel = (http, _, exception) =>
                exception is not null || http.Response.StatusCode >= 500 ? LogEventLevel.Error
                // A page of thumbnails is dozens of requests; only failed ones are worth a line
                : IsImageRequest(http.Request) && http.Response.StatusCode < 400 ? LogEventLevel.Debug
                : LogEventLevel.Information;
        });

    private static bool IsImageRequest(HttpRequest request) =>
        HttpMethods.IsGet(request.Method) && ImagePath().IsMatch(request.Path.Value ?? "");

    [GeneratedRegex(@"^/api/(coins/\d+/photos/|collections/\d+/cover$)", RegexOptions.IgnoreCase)]
    private static partial Regex ImagePath();

    /// <summary>
    /// The address as it may be logged. The key of a link-only collection is part of some paths
    /// (/s/{key}, api/public/shared/{key}) and of image URLs (?s={key}): a secret, never logged.
    /// Search terms (?search=, also an admin's search for an e-mail address) and the explore filter
    /// (?owner=) are personal data the logs do not need. The secret of an e-mail verification link
    /// (/verify-email?token=) is masked too.
    /// </summary>
    public static string MaskLoggedAddress(string pathAndQuery) =>
        MaskedQuery().Replace(SharedLinkPath().Replace(pathAndQuery, "$1***"), "$1***");

    [GeneratedRegex(@"^(/s/|/api/public/shared/)[^/?#]+", RegexOptions.IgnoreCase)]
    private static partial Regex SharedLinkPath();

    [GeneratedRegex(@"([?&](?:s|search|owner|token)=)[^&#]+", RegexOptions.IgnoreCase)]
    private static partial Regex MaskedQuery();

    /// <summary><see cref="MaskLoggedAddress"/> on the request path of every event, request log or not.</summary>
    private sealed class MaskSharedLinks : ILogEventEnricher
    {
        private static readonly string[] PathProperties = ["RequestPath", "Path"];

        public void Enrich(LogEvent logEvent, ILogEventPropertyFactory propertyFactory)
        {
            foreach (var name in PathProperties)
            {
                if (logEvent.Properties.TryGetValue(name, out var value)
                    && value is ScalarValue { Value: string path }
                    && MaskLoggedAddress(path) is var masked && masked != path)
                {
                    logEvent.AddOrUpdateProperty(propertyFactory.CreateProperty(name, masked));
                }
            }
        }
    }
}
