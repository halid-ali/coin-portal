using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CoinPortal.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class UnverifiedMaxCoins : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "UnverifiedMaxCoins",
                table: "SiteSettings",
                type: "int",
                nullable: false,
                // The single row's starting value (user decision 2026-10-06), changed in the admin panel
                defaultValue: 20);

            migrationBuilder.AddCheckConstraint(
                name: "CK_SiteSettings_UnverifiedMaxCoins",
                table: "SiteSettings",
                sql: "[UnverifiedMaxCoins] BETWEEN 0 AND 10000");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_SiteSettings_UnverifiedMaxCoins",
                table: "SiteSettings");

            migrationBuilder.DropColumn(
                name: "UnverifiedMaxCoins",
                table: "SiteSettings");
        }
    }
}
