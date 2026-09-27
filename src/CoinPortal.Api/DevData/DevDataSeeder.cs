using System.Text.Json;
using System.Text.Json.Serialization;
using CoinPortal.Api.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace CoinPortal.Api.DevData;

/// <summary>
/// Development-only test data. Creates the users in dev-seed.json if they are missing and
/// replaces their coins with the ones in the file, so running it again resets the dataset.
/// Usage (from src/CoinPortal.Api): dotnet run --launch-profile http -- --seed-dev-data
/// </summary>
public static class DevDataSeeder
{
    public const string CommandLineSwitch = "--seed-dev-data";
    private const string SeedFile = "DevData/dev-seed.json";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() },
    };

    public static async Task RunAsync(WebApplication app)
    {
        var logger = app.Logger;
        var path = Path.Combine(app.Environment.ContentRootPath, SeedFile);
        if (!File.Exists(path))
        {
            throw new FileNotFoundException(
                $"Seed file not found at {path}. Run the command from src/CoinPortal.Api.", path);
        }

        SeedData data;
        await using (var stream = File.OpenRead(path))
        {
            data = await JsonSerializer.DeserializeAsync<SeedData>(stream, JsonOptions)
                ?? throw new InvalidOperationException($"{SeedFile} is empty.");
        }

        await using var scope = app.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

        // Make sure the schema is up to date before inserting
        await db.Database.MigrateAsync();

        foreach (var seedUser in data.Users)
        {
            var user = await userManager.FindByNameAsync(seedUser.UserName);
            if (user is null)
            {
                user = new ApplicationUser
                {
                    UserName = seedUser.UserName,
                    Email = seedUser.Email,
                    EmailConfirmed = true,
                    FirstName = seedUser.FirstName,
                    LastName = seedUser.LastName,
                    BirthDate = seedUser.BirthDate,
                    CreatedAtUtc = DateTime.UtcNow,
                };

                // Goes through Identity, so the password is hashed and validated as usual
                var result = await userManager.CreateAsync(user, data.Password);
                if (!result.Succeeded)
                {
                    var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                    throw new InvalidOperationException($"Could not create {seedUser.UserName}: {errors}");
                }
            }

            // Only the seed users' coins are touched; other accounts stay as they are
            var removed = await db.Coins.Where(c => c.OwnerId == user.Id).ExecuteDeleteAsync();

            db.Coins.AddRange(seedUser.Coins.Select(c => new Coin
            {
                OwnerId = user.Id,
                Title = c.Title,
                Description = c.Description,
                Denomination = c.Denomination,
                CountryCode = c.CountryCode,
                Year = c.Year,
                MintMark = c.MintMark,
                IsCommemorative = c.IsCommemorative,
                Quantity = c.Quantity,
                CreatedAtUtc = c.CreatedAtUtc,
                UpdatedAtUtc = c.CreatedAtUtc,
            }));
            await db.SaveChangesAsync();

            logger.LogInformation(
                "Seeded {UserName}: {Count} coins (removed {Removed} old ones)",
                seedUser.UserName, seedUser.Coins.Count, removed);
        }

        logger.LogInformation(
            "Dev data seeded: {Users} users. Password for all seed users: {Password}",
            data.Users.Count, data.Password);
    }

    private sealed record SeedData(string Password, List<SeedUser> Users);

    private sealed record SeedUser(
        string UserName,
        string Email,
        string FirstName,
        string LastName,
        DateOnly BirthDate,
        List<SeedCoin> Coins);

    private sealed record SeedCoin(
        string Title,
        string? Description,
        Denomination Denomination,
        string CountryCode,
        int Year,
        string? MintMark,
        bool IsCommemorative,
        int Quantity,
        DateTime CreatedAtUtc);
}