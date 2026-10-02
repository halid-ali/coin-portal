using CoinPortal.Api.Photos;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Options;

namespace CoinPortal.Api.Hosting;

/// <summary>
/// Runs before the first request: every folder the app writes to must be writable and data
/// protection must work. A wrong hosting setting (a path the app pool cannot write, keys DPAPI
/// cannot decrypt) then stops the app with one Critical log line, instead of failing the first
/// upload or signing everybody out on each restart. The resolved folders are logged, so the first
/// start on a new host shows where everything ends up.
/// </summary>
public static class StartupChecks
{
    public static async Task RunAsync(WebApplication app)
    {
        var logger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger(typeof(StartupChecks).FullName!);
        var env = app.Environment;

        var photos = await app.Services.GetRequiredService<IPhotoStorage>().CheckWritableAsync();
        logger.LogInformation("Photos: {Folder}", photos);

        if (AppLogging.LogFolder(env, app.Services.GetRequiredService<IOptions<LogFileOptions>>().Value) is { } logs)
        {
            await ProbeAsync(logs);
            logger.LogInformation("Log files: {Folder}", logs);
        }

        if (AppDataProtection.KeysFolder(env, app.Services.GetRequiredService<IOptions<DataProtectionSettings>>().Value) is { } keys)
        {
            await ProbeAsync(keys);
            logger.LogInformation("Data protection keys: {Folder}", keys);
        }

        // Creates (or reads and decrypts) the key ring: fails here, not on the first sign-in
        var protector = app.Services.GetRequiredService<IDataProtectionProvider>().CreateProtector("CoinPortal.StartupCheck");
        if (protector.Unprotect(protector.Protect("ok")) != "ok")
        {
            throw new InvalidOperationException("Data protection does not round-trip.");
        }
    }

    private static async Task ProbeAsync(string folder)
    {
        Directory.CreateDirectory(folder);
        var probe = Path.Combine(folder, $".write-test-{Guid.NewGuid():N}");
        await File.WriteAllTextAsync(probe, "ok");
        File.Delete(probe);
    }
}
