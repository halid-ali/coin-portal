using CoinPortal.Api.Localization;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace CoinPortal.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options)
    : IdentityDbContext<ApplicationUser>(options)
{
    public DbSet<Coin> Coins => Set<Coin>();
    public DbSet<Collection> Collections => Set<Collection>();
    public DbSet<Country> Countries => Set<Country>();
    public DbSet<CoinPhoto> CoinPhotos => Set<CoinPhoto>();
    public DbSet<AuditLogEntry> AuditLog => Set<AuditLogEntry>();

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
            b.Property(u => u.PreferredLanguage)
             .HasMaxLength(SupportedLanguages.CodeMaxLength)
             .IsUnicode(false);
            b.ToTable(t =>
            {
                t.HasCheckConstraint("CK_AspNetUsers_PreferredTheme", "[PreferredTheme] IN (0, 1, 2)");
                t.HasCheckConstraint("CK_AspNetUsers_PreferredAccent", "[PreferredAccent] BETWEEN 0 AND 6");
            });

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

            // No cascade: the API moves or deletes the coins (and their photo files) itself.
            // Deleting a user still removes everything through the OwnerId cascades.
            b.HasOne(c => c.Collection)
             .WithMany(col => col.Coins)
             .HasForeignKey(c => c.CollectionId)
             .OnDelete(DeleteBehavior.Restrict);

            // Covers the collection's list filters and the "do I already have it?" lookup
            b.HasIndex(c => new { c.CollectionId, c.CountryCode, c.Denomination, c.Year });
            b.HasIndex(c => c.OwnerId);

            // Database-level guards in addition to API validation
            var denominations = string.Join(", ", Enum.GetValues<Denomination>().Cast<int>());
            b.ToTable(t =>
            {
                t.HasCheckConstraint("CK_Coins_Denomination", $"[Denomination] IN ({denominations})");
                t.HasCheckConstraint("CK_Coins_Year", $"[Year] >= {Coin.MinYear}");
                t.HasCheckConstraint("CK_Coins_Quantity", "[Quantity] >= 1");
            });
        });

        builder.Entity<Collection>(b =>
        {
            b.Property(c => c.Name).HasMaxLength(Collection.NameMaxLength).IsRequired();
            b.Property(c => c.Description).HasMaxLength(Collection.DescriptionMaxLength);

            // Deleting a user deletes their collections
            b.HasOne(c => c.Owner)
             .WithMany()
             .HasForeignKey(c => c.OwnerId)
             .OnDelete(DeleteBehavior.Cascade);

            // Case-insensitive through the default collation
            b.HasIndex(c => new { c.OwnerId, c.Name }).IsUnique();

            b.Property(c => c.ShareToken).HasMaxLength(Collection.ShareTokenLength).IsFixedLength().IsUnicode(false);
            b.HasIndex(c => c.ShareToken).IsUnique().HasFilter("[ShareToken] IS NOT NULL");

            // Public listings (profile, explore)
            b.HasIndex(c => new { c.Visibility, c.OwnerId });

            var visibilities = string.Join(", ", Enum.GetValues<CollectionVisibility>().Cast<int>());
            b.ToTable(t => t.HasCheckConstraint("CK_Collections_Visibility", $"[Visibility] IN ({visibilities})"));
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

        builder.Entity<AuditLogEntry>(b =>
        {
            b.ToTable("AuditLog");

            // Identity user ids are at most 450 characters
            b.Property(e => e.ActorId).HasMaxLength(450).IsRequired();
            b.Property(e => e.ActorUserName).HasMaxLength(AuditLogEntry.UserNameMaxLength).IsRequired();
            b.Property(e => e.TargetUserId).HasMaxLength(450);
            b.Property(e => e.TargetUserName).HasMaxLength(AuditLogEntry.UserNameMaxLength);
            b.Property(e => e.TargetCollectionName).HasMaxLength(Collection.NameMaxLength);
            b.Property(e => e.Note).HasMaxLength(AuditLogEntry.NoteMaxLength);

            // Newest first, and a user's history in the panel
            b.HasIndex(e => e.CreatedAtUtc);
            b.HasIndex(e => e.TargetUserId);

            var actions = string.Join(", ", Enum.GetValues<AuditAction>().Cast<int>());
            b.ToTable(t => t.HasCheckConstraint("CK_AuditLog_Action", $"[Action] IN ({actions})"));
        });
    }
}
