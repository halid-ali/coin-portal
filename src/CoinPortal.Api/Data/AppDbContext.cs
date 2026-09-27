using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace CoinPortal.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options)
    : IdentityDbContext<ApplicationUser>(options)
{
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
    }
}