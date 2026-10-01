using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.DataProtection.KeyManagement;
using Microsoft.AspNetCore.DataProtection.Repositories;
using Microsoft.AspNetCore.DataProtection.XmlEncryption;
using Microsoft.Extensions.Options;

namespace CoinPortal.Api.Hosting;

/// <summary>Which Windows account can decrypt the key files (DPAPI).</summary>
public enum DpapiScope
{
    /// <summary>Only the app pool's account. Needs its user profile loaded ("Load User Profile" in IIS).</summary>
    CurrentUser,

    /// <summary>Any account on the machine; for app pools without a user profile.</summary>
    LocalMachine,
}

/// <summary>
/// Configuration section "DataProtection". The keys encrypt the sign-in cookie and the antiforgery
/// tokens; if they are lost (an app pool without a user profile keeps them in memory only), every
/// restart signs everybody out. KeysPath is relative to the content root; empty = ASP.NET Core's
/// default location. Hosting points it outside the site folder (DataProtection__KeysPath).
/// </summary>
public sealed class DataProtectionSettings
{
    public const string SectionName = "DataProtection";

    public string? KeysPath { get; set; } = "App_Data/keys";

    public DpapiScope Dpapi { get; set; } = DpapiScope.CurrentUser;
}

public static class AppDataProtection
{
    public static IServiceCollection AddAppDataProtection(this IServiceCollection services)
    {
        // Fixed name instead of the default (the content root path): keys stay valid if the site moves
        services.AddDataProtection().SetApplicationName("CoinPortal");
        services.AddOptions<DataProtectionSettings>().BindConfiguration(DataProtectionSettings.SectionName);

        // What PersistKeysToFileSystem and ProtectKeysWithDpapi do, but read from the options at
        // runtime, so test hosts can change the configuration
        services.AddOptions<KeyManagementOptions>()
            .Configure<IOptions<DataProtectionSettings>, IWebHostEnvironment, ILoggerFactory>(
                (options, settings, env, loggerFactory) =>
                {
                    if (string.IsNullOrWhiteSpace(settings.Value.KeysPath))
                    {
                        return;
                    }

                    var folder = Path.GetFullPath(Path.Combine(env.ContentRootPath, settings.Value.KeysPath));
                    options.XmlRepository = new FileSystemXmlRepository(new DirectoryInfo(folder), loggerFactory);

                    // Plain XML keys would let anyone who can read the folder forge sign-in cookies.
                    // DPAPI is Windows only; the app is hosted on Windows
                    if (OperatingSystem.IsWindows())
                    {
                        options.XmlEncryptor = new DpapiXmlEncryptor(
                            protectToLocalMachine: settings.Value.Dpapi == DpapiScope.LocalMachine, loggerFactory);
                    }
                });

        return services;
    }
}
