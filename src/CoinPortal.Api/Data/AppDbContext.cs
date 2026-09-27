using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace CoinPortal.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options)
    : IdentityDbContext<ApplicationUser>(options)
{
    public DbSet<Coin> Coins => Set<Coin>();
    public DbSet<Country> Countries => Set<Country>();
    public DbSet<CoinPhoto> CoinPhotos => Set<CoinPhoto>();

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        base.ConfigureConventions(configurationBuilder);

        // Every DateTime is stored and returned as UTC
        configurationBuilder.Properties<DateTime>().HaveConversion<UtcDateTimeConverter>();
    }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        // Must run first so Identity tables are configured
        base.OnModelCreating(builder);

        builder.Entity<ApplicationUser>(b =>
        {
            b.Property(u => u.FirstName).HasMaxLength(100).IsRequired();
            b.Property(u => u.LastName).HasMaxLength(100).IsRequired();

            // Identity only validates unique email in code; enforce it in the database as well
            b.HasIndex(u => u.NormalizedEmail)
             .IsUnique()
             .HasFilter("[NormalizedEmail] IS NOT NULL");
        });

        builder.Entity<Country>(b =>
        {
            b.HasKey(c => c.Code);
            b.Property(c => c.Code).HasMaxLength(Country.CodeLength).IsFixedLength().IsUnicode(false);
            b.Property(c => c.Name).HasMaxLength(Country.NameMaxLength).IsRequired();

            b.HasData(CountrySeed.All);
        });

        builder.Entity<Coin>(b =>
        {
            b.Property(c => c.Title).HasMaxLength(Coin.TitleMaxLength).IsRequired();
            b.Property(c => c.Description).HasMaxLength(Coin.DescriptionMaxLength);
            b.Property(c => c.MintMark).HasMaxLength(Coin.MintMarkMaxLength);

            // Same column type as Countries.Code, required for the FK
            b.Property(c => c.CountryCode).HasMaxLength(Country.CodeLength).IsFixedLength().IsUnicode(false);

            // Deleting a user deletes their coins
            b.HasOne(c => c.Owner)
             .WithMany()
             .HasForeignKey(c => c.OwnerId)
             .OnDelete(DeleteBehavior.Cascade);

            // A country that still has coins cannot be deleted
            b.HasOne(c => c.Country)
             .WithMany()
             .HasForeignKey(c => c.CountryCode)
             .OnDelete(DeleteBehavior.Restrict);

            // Covers the owner's list filters and the "do I already have it?" lookup
            b.HasIndex(c => new { c.OwnerId, c.CountryCode, c.Denomination, c.Year });

            // Database-level guards in addition to API validation
            var denominations = string.Join(", ", Enum.GetValues<Denomination>().Cast<int>());
            b.ToTable(t =>
            {
                t.HasCheckConstraint("CK_Coins_Denomination", $"[Denomination] IN ({denominations})");
                t.HasCheckConstraint("CK_Coins_Year", $"[Year] >= {Coin.MinYear}");
                t.HasCheckConstraint("CK_Coins_Quantity", "[Quantity] >= 1");
            });
        });

        builder.Entity<CoinPhoto>(b =>
        {
            // Generated in code, it is also the storage folder name
            b.Property(p => p.Id).ValueGeneratedNever();

            // Deleting a coin deletes its photo rows (files are removed by the API)
            b.HasOne(p => p.Coin)
             .WithMany(c => c.Photos)
             .HasForeignKey(p => p.CoinId)
             .OnDelete(DeleteBehavior.Cascade);

            b.HasIndex(p => new { p.CoinId, p.Side }).IsUnique();

            var sides = string.Join(", ", Enum.GetValues<CoinSide>().Cast<int>());
            b.ToTable(t =>
            {
                t.HasCheckConstraint("CK_CoinPhotos_Side", $"[Side] IN ({sides})");
                t.HasCheckConstraint("CK_CoinPhotos_SizeBytes", "[SizeBytes] > 0");
            });
        });
    }
}