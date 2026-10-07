using CoinPortal.Api.Authorization;
using CoinPortal.Api.Data;
using CoinPortal.Api.Email;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

[assembly: AssemblyFixture(typeof(CoinPortal.Api.Tests.Infrastructure.CoinPortalFactory))]

namespace CoinPortal.Api.Tests.Infrastructure;

/// <summary>
/// The API in memory against a SQL Server database of its own: created with all migrations at
/// the start of a test run and dropped at the end. One instance serves every test (assembly
/// fixture); tests stay independent by signing up their own users.
/// </summary>
public sealed class CoinPortalFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    /// <summary>Server part of the connection string; CI points it at its SQL Server container.</summary>
    public const string ServerVariable = "COINPORTAL_TEST_SQL";

    private const string LocalDbServer =
        @"Server=(localdb)\MSSQLLocalDB;Trusted_Connection=True;TrustServerCertificate=True";

    private readonly string connectionString;

    public CoinPortalFactory()
    {
        // Unique per run, so parallel runs and leftovers of an aborted run never collide
        var name = $"CoinPortal_Tests_{DateTime.UtcNow:yyyyMMddHHmmss}_{Guid.NewGuid().ToString("N")[..8]}";
        var server = Environment.GetEnvironmentVariable(ServerVariable);
        connectionString = new SqlConnectionStringBuilder(string.IsNullOrWhiteSpace(server) ? LocalDbServer : server)
        {
            InitialCatalog = name,
            MultipleActiveResultSets = true,
        }.ConnectionString;
        PhotoRoot = Path.Combine(Path.GetTempPath(), name);
    }

    /// <summary>The test server with another database of this run (<paramref name="suffix"/> appended to its name).</summary>
    public string ConnectionStringWithDatabaseSuffix(string suffix)
    {
        var builder = new SqlConnectionStringBuilder(connectionString);
        builder.InitialCatalog += suffix;
        return builder.ConnectionString;
    }

    /// <summary>Photo storage folder of this run (PhotoStorage:RootPath).</summary>
    public string PhotoRoot { get; }

    /// <summary>Every e-mail the app sends in this run, kept instead of sent.</summary>
    public FakeMailSender Mail { get; } = new();

    /// <summary>The site address in e-mail links (Email:SiteUrl).</summary>
    public const string SiteUrl = "https://coinvitrine.test";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Not Development: production cookie rules (Secure) and HTTPS redirection apply,
        // so clients talk to https://localhost
        builder.UseEnvironment("Testing");
        builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(
            new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = connectionString,
                ["PhotoStorage:RootPath"] = PhotoRoot,
                // Tests run the photo sweep themselves (PhotoSweepTests)
                ["PhotoStorage:SweepIntervalHours"] = "0",
                // Tests run the cleanup of unverified accounts themselves (UnverifiedCleanupTests)
                ["AccountCleanup:IntervalHours"] = "0",
                // Bulk e-mails without a pause (VerificationRequestsTests)
                ["Email:BulkDelaySeconds"] = "0",
                ["Serilog:MinimumLevel:Default"] = "Warning",
                ["Email:SiteUrl"] = SiteUrl,
                // Console only, and ASP.NET Core's default key location
                ["Logs:Path"] = "",
                ["DataProtection:KeysPath"] = "",
                // Every test signs up from the same (unknown) address; HostingTests checks the limits
                ["RateLimiting:Auth:PermitLimit"] = "1000000",
                ["RateLimiting:Public:PermitLimit"] = "1000000",
                ["RateLimiting:Photos:PermitLimit"] = "1000000",
                ["RateLimiting:Writes:PermitLimit"] = "1000000",
            }));
        // The app checks the cookie against the database once a minute; tests check every request,
        // so a lock or role change shows at once instead of after a wait
        builder.ConfigureTestServices(services =>
        {
            services.Configure<SecurityStampValidatorOptions>(options => options.ValidationInterval = TimeSpan.Zero);
            services.AddSingleton<IMailSender>(Mail);
        });
    }

    public async ValueTask InitializeAsync()
    {
        // Before the host starts: startup code (the admin role sync) already needs the schema
        var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlServer(connectionString).Options;
        await using (var db = new AppDbContext(options))
        {
            await db.Database.MigrateAsync();
            await db.SiteSettings.ExecuteUpdateAsync(s => s
                .SetProperty(x => x.MinPublicCoins, MinPublicCoins)
                .SetProperty(x => x.UnverifiedMaxCoins, UnverifiedMaxCoins)
                .SetProperty(x => x.UnverifiedLifetimeDays, UnverifiedLifetimeDays));
        }
        _ = Services;
    }

    /// <summary>
    /// The site setting in tests: low, so publishing needs few uploads, and above 1, so "too few"
    /// can be tested. Tests that change it belong to the <see cref="SiteSettingsCollection"/>.
    /// </summary>
    public const int MinPublicCoins = 2;

    /// <summary>Coins an unverified account may hold in tests: low, so reaching it needs few coins.</summary>
    public const int UnverifiedMaxCoins = 3;

    /// <summary>Days an unverified account lives in tests (the site's default).</summary>
    public const int UnverifiedLifetimeDays = 30;

    public override async ValueTask DisposeAsync()
    {
        await using (var scope = Services.CreateAsyncScope())
        {
            await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.EnsureDeletedAsync();
        }
        await base.DisposeAsync();

        if (Directory.Exists(PhotoRoot))
        {
            Directory.Delete(PhotoRoot, recursive: true);
        }
    }

    /// <summary>A signed-out client that already holds an antiforgery token, like the SPA after start.</summary>
    public Task<ApiClient> CreateAnonymousClientAsync() => CreateAnonymousClientAsync(this);

    /// <inheritdoc cref="CreateAnonymousClientAsync()"/>
    /// <param name="host">This factory or a host derived from it (<see cref="WithSettings"/>).</param>
    public static async Task<ApiClient> CreateAnonymousClientAsync(WebApplicationFactory<Program> host)
    {
        var client = new ApiClient(CreateHttpClient(host));
        await client.RefreshAntiforgeryAsync();
        return client;
    }

    private static readonly Lock ClientsLock = new();

    /// <summary>
    /// A plain client of the host at https://localhost, without redirects. One at a time: the
    /// factory keeps its clients in a list that is not thread-safe, and tests run in parallel; two
    /// at once could leave a null in it, and disposing the factory then fails every test.
    /// </summary>
    public static HttpClient CreateHttpClient(WebApplicationFactory<Program> host)
    {
        lock (ClientsLock)
        {
            return host.CreateClient(new WebApplicationFactoryClientOptions
            {
                BaseAddress = new Uri("https://localhost"),
                AllowAutoRedirect = false,
            });
        }
    }

    /// <summary>
    /// A second host on the same database with configuration overrides (and optionally a web root
    /// folder). Its startup runs the admin sync, which revokes the role of every admin a running
    /// test signed up: tests that use it belong to the <see cref="AdminCollection"/>.
    /// </summary>
    public WebApplicationFactory<Program> WithSettings(IDictionary<string, string?> settings, string? webRoot = null) =>
        WithWebHostBuilder(builder =>
        {
            if (webRoot is not null)
            {
                builder.UseWebRoot(webRoot);
            }
            builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(settings));
        });

    /// <summary>
    /// Signs up a new user with a unique name; the client is signed in as that user. The e-mail
    /// address is confirmed unless asked not to (sharing collections needs it).
    /// </summary>
    public async Task<TestUser> SignUpAsync(string? language = "en", string? userName = null, bool confirmEmail = true)
    {
        var client = await CreateAnonymousClientAsync();
        var request = TestUser.NewRegisterRequest(language);
        if (userName is not null)
        {
            request = request with { UserName = userName, Email = $"{userName}@example.test" };
        }
        var user = await client.RegisterAsync(request);
        if (confirmEmail)
        {
            await ConfirmEmailAsync(user.Id);
            user = user with { EmailConfirmed = true, UnverifiedMaxCoins = null, UnverifiedDeletionDueUtc = null };
        }
        return new TestUser(client, user);
    }

    /// <summary>
    /// What the link in the e-mail does, without the round trip: users signed up on another host
    /// (<see cref="WithSettings"/>) need it to open a second collection or add coins freely.
    /// </summary>
    public Task ConfirmEmailAsync(string userId) =>
        WithDbAsync(db => db.Users.Where(u => u.Id == userId)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.EmailConfirmed, true)));

    /// <summary>
    /// Signs up a user and gives them the Admin role directly (not through the configuration),
    /// then signs in again so the cookie carries the role. Tests that use it belong to the
    /// <see cref="AdminCollection"/>, because <see cref="SyncAdminsAsync"/> revokes other admins.
    /// </summary>
    public async Task<TestUser> SignUpAdminAsync()
    {
        var admin = await SignUpAsync();
        await using (var scope = Services.CreateAsyncScope())
        {
            var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var user = await users.FindByIdAsync(admin.User.Id);
            Assert.True((await users.AddToRoleAsync(user!, AppRoles.Admin)).Succeeded);
        }
        return await admin.SignInAgainAsync();
    }

    /// <summary>
    /// Direct database access for what the API does not expose (yet), e.g. stored timestamps.
    /// Its own scope: nothing is shared with the requests.
    /// </summary>
    public async Task<T> WithDbAsync<T>(Func<AppDbContext, Task<T>> action)
    {
        await using var scope = Services.CreateAsyncScope();
        return await action(scope.ServiceProvider.GetRequiredService<AppDbContext>());
    }

    /// <summary>Runs the startup sync with this list instead of the configuration.</summary>
    public async Task SyncAdminsAsync(params string[] userIds)
    {
        await using var scope = Services.CreateAsyncScope();
        await scope.ServiceProvider.GetRequiredService<AdminRoleSync>().SyncAsync(userIds);
    }
}

/// <summary>Tests that change who is an admin run one after another.</summary>
public static class AdminCollection
{
    public const string Name = "Admin";
}

/// <summary>
/// Tests that change a site setting (SiteSettings) run alone, while no other test runs: every
/// publishing test depends on <see cref="CoinPortalFactory.MinPublicCoins"/>, the unverified tests on
/// <see cref="CoinPortalFactory.UnverifiedMaxCoins"/>. They put the value
/// back when done.
/// </summary>
[CollectionDefinition(Name, DisableParallelization = true)]
public sealed class SiteSettingsCollection
{
    public const string Name = "SiteSettings";
}
