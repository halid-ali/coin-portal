using CoinPortal.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace CoinPortal.Api.Hosting;

/// <summary>
/// With Database:MigrateOnStartup (set on the server, off by default) the app applies its pending
/// migrations before anything else touches the database, so the deploy pipeline needs no access to
/// the database. A failing migration stops the app (Critical log), as a database without the schema
/// did before. The package's idempotent migrate.sql stays the manual way.
/// </summary>
public static class StartupMigration
{
    public const string SettingName = "Database:MigrateOnStartup";

    public static async Task RunAsync(WebApplication app, IServiceProvider services)
    {
        if (!app.Configuration.GetValue<bool>(SettingName))
        {
            return;
        }

        var logger = services.GetRequiredService<ILoggerFactory>().CreateLogger(typeof(StartupMigration).FullName!);
        var db = services.GetRequiredService<AppDbContext>();
        var pending = (await db.Database.GetPendingMigrationsAsync()).ToList();
        if (pending.Count == 0)
        {
            logger.LogInformation("Database schema is up to date");
            return;
        }

        logger.LogWarning("Applying {Count} migration(s): {Migrations}", pending.Count, string.Join(", ", pending));
        await db.Database.MigrateAsync();
        logger.LogWarning("Migrations applied");
    }
}
