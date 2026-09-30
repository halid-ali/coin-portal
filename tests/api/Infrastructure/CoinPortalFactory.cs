using CoinPortal.Api.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
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

    /// <summary>Photo storage folder of this run (PhotoStorage:RootPath).</summary>
    public string PhotoRoot { get; }

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
                ["Logging:LogLevel:Default"] = "Warning",
            }));
    }

    public async ValueTask InitializeAsync()
    {
        await using var scope = Services.CreateAsyncScope();
        await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.MigrateAsync();
    }

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
    public async Task<ApiClient> CreateAnonymousClientAsync()
    {
        var client = new ApiClient(CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false,
        }));
        await client.RefreshAntiforgeryAsync();
        return client;
    }

    /// <summary>Signs up a new user with a unique name; the client is signed in as that user.</summary>
    public async Task<TestUser> SignUpAsync(string? language = "en")
    {
        var client = await CreateAnonymousClientAsync();
        var user = await client.RegisterAsync(TestUser.NewRegisterRequest(language));
        return new TestUser(client, user);
    }
}
