using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using CoinPortal.Api.Data;
using CoinPortal.Api.Photos;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace CoinPortal.Api.DevData;

/// <summary>
/// Development-only test data. Creates the users in dev-seed.json if they are missing and
/// replaces their collections and coins with the ones in the file, so running it again resets the
/// dataset. Each user has several collections: euro coins only, other coins only, both, and ones
/// below the public minimum. Photographed coins get the stand-in photos of SeedPhotos/
/// (make-seed-photos.mjs).
/// Usage (from src/api): dotnet run --launch-profile http -- --seed-dev-data
/// </summary>
public static class DevDataSeeder
{
    public const string CommandLineSwitch = "--seed-dev-data";
    private const string SeedFile = "DevData/dev-seed.json";
    private const string PhotoFolder = "DevData/SeedPhotos";

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
                $"Seed file not found at {path}. Run the command from src/api.", path);
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
        var photoStorage = scope.ServiceProvider.GetRequiredService<IPhotoStorage>();
        var imageProcessor = scope.ServiceProvider.GetRequiredService<IImageProcessor>();
        var photos = new SeedPhotoFiles(Path.Combine(app.Environment.ContentRootPath, PhotoFolder), imageProcessor);

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

            // Only the seed users' data is touched; other accounts stay as they are.
            // Photo rows go with the coins (cascade), their files are removed here.
            var removed = await db.Coins.Where(c => c.OwnerId == user.Id).ExecuteDeleteAsync();
            await db.Collections.Where(c => c.OwnerId == user.Id).ExecuteDeleteAsync();
            await photoStorage.DeleteOwnerAsync(user.Id);

            var now = DateTime.UtcNow;
            var coinCount = 0;
            for (var i = 0; i < seedUser.Collections.Count; i++)
            {
                var seedCollection = seedUser.Collections[i];
                var collection = new Collection
                {
                    OwnerId = user.Id,
                    Name = seedCollection.Name,
                    Description = seedCollection.Description,
                    // In the file's order on the collections page
                    CreatedAtUtc = now.AddSeconds(i),
                    UpdatedAtUtc = now.AddSeconds(i),
                };
                collection.SetVisibility(seedCollection.Visibility);
                db.Collections.Add(collection);

                var photographed = seedCollection.PhotographedCount();
                if (seedCollection.Visibility == CollectionVisibility.Public && photographed < seedCollection.Coins.Count)
                {
                    throw new InvalidOperationException(
                        $"{seedUser.UserName}/{seedCollection.Name}: a public collection needs photos of every coin.");
                }

                for (var j = 0; j < seedCollection.Coins.Count; j++)
                {
                    var c = seedCollection.Coins[j];
                    var other = c.Kind == CoinKind.Other;
                    var coin = new Coin
                    {
                        OwnerId = user.Id,
                        Collection = collection,
                        Kind = c.Kind,
                        Title = c.Title,
                        Description = c.Description,
                        Denomination = other ? null : c.Denomination,
                        FaceValue = other ? c.FaceValue : null,
                        Currency = other ? c.Currency : null,
                        CountryCode = c.CountryCode,
                        Year = c.Year,
                        MintMark = c.MintMark,
                        IsCommemorative = c.IsCommemorative,
                        Quantity = c.Quantity,
                        CreatedAtUtc = c.CreatedAtUtc,
                        UpdatedAtUtc = c.CreatedAtUtc,
                    };
                    db.Coins.Add(coin);

                    // What a public collection needs (PublicationRules): a euro coin's national side,
                    // both sides of an other coin
                    if (j < photographed)
                    {
                        foreach (var (side, file) in c.PhotoFiles())
                        {
                            var files = await photos.GetAsync(file);
                            var photo = new CoinPhoto
                            {
                                Id = Guid.NewGuid(),
                                Side = side,
                                SizeBytes = files.Values.Sum(f => (long)f.Length),
                                CreatedAtUtc = coin.CreatedAtUtc,
                            };
                            await photoStorage.SaveAsync(user.Id, photo.Id, files, CancellationToken.None);
                            coin.Photos.Add(photo);
                        }
                    }
                }
                coinCount += seedCollection.Coins.Count;
            }
            await db.SaveChangesAsync();

            logger.LogInformation(
                "Seeded {UserName}: {Collections} collections, {Count} coins (removed {Removed} old ones)",
                seedUser.UserName, seedUser.Collections.Count, coinCount, removed);
        }

        logger.LogInformation(
            // Never the password (CLAUDE.md lists it for developers)
            "Dev data seeded: {Users} users", data.Users.Count);
    }

    /// <summary>The stand-in photos, each processed once like an upload.</summary>
    private sealed class SeedPhotoFiles(string folder, IImageProcessor imageProcessor)
    {
        private readonly Dictionary<string, IReadOnlyDictionary<string, byte[]>> processed = [];

        public async Task<IReadOnlyDictionary<string, byte[]>> GetAsync(string file)
        {
            if (!processed.TryGetValue(file, out var files))
            {
                var path = Path.Combine(folder, file);
                if (!File.Exists(path))
                {
                    throw new FileNotFoundException(
                        $"Seed photo {file} is missing: run make-seed-photos.mjs in src/api/DevData.", path);
                }
                await using var source = File.OpenRead(path);
                var sizes = await imageProcessor.ProcessAsync(source, CancellationToken.None);
                files = sizes.ToDictionary(s => s.Key.FileName(), s => s.Value);
                processed[file] = files;
            }
            return files;
        }
    }

    private sealed record SeedData(string Password, List<SeedUser> Users);

    private sealed record SeedUser(
        string UserName,
        string Email,
        string FirstName,
        string LastName,
        DateOnly BirthDate,
        List<SeedCollection> Collections);

    /// <param name="Photographed">"all", "none", or the number of the first coins with photos.</param>
    private sealed record SeedCollection(
        string Name,
        string? Description,
        CollectionVisibility Visibility,
        JsonElement Photographed,
        List<SeedCoin> Coins)
    {
        public int PhotographedCount() => Photographed.ValueKind switch
        {
            JsonValueKind.Number => Photographed.GetInt32(),
            _ when Photographed.GetString() == "all" => Coins.Count,
            _ => 0,
        };
    }

    /// <param name="Hue">An other coin's photo color (make-seed-photos.mjs).</param>
    private sealed record SeedCoin(
        string Title,
        string? Description,
        CoinKind Kind,
        Denomination? Denomination,
        decimal? FaceValue,
        string? Currency,
        string CountryCode,
        int Year,
        string? MintMark,
        bool IsCommemorative,
        int Quantity,
        string? Hue,
        DateTime CreatedAtUtc)
    {
        // A missing kind in the file is a euro coin, like in the API
        public CoinKind Kind { get; init; } = Kind == 0 ? CoinKind.Euro : Kind;

        /// <summary>The photo files of the sides a public collection needs, named as make-seed-photos.mjs writes them.</summary>
        public IEnumerable<(CoinSide Side, string File)> PhotoFiles()
        {
            if (Kind == CoinKind.Euro)
            {
                yield return (CoinSide.National, $"euro-{Denomination}.jpg");
                yield break;
            }
            // The back shows the value as written in Turkish (0,5), its file name with dashes (0-5)
            var value = FaceValue!.Value.ToString("0.####", CultureInfo.GetCultureInfo("tr-TR"));
            yield return (CoinSide.National, $"other-{Hue}.jpg");
            yield return (CoinSide.Common, $"other-{Hue}-{value.Replace(',', '-')}.jpg");
        }
    }
}
