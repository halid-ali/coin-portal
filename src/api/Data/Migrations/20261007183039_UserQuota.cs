using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CoinPortal.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class UserQuota : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "UserQuotaMegabytes",
                table: "SiteSettings",
                type: "int",
                nullable: false,
                // The single row's starting value: the 300 MB the configuration (PhotoStorage:UserQuotaBytes)
                // had until now; changed in the admin panel
                defaultValue: 300);

            migrationBuilder.AddCheckConstraint(
                name: "CK_SiteSettings_UserQuotaMegabytes",
                table: "SiteSettings",
                sql: "[UserQuotaMegabytes] BETWEEN 50 AND 2000");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_SiteSettings_UserQuotaMegabytes",
                table: "SiteSettings");

            migrationBuilder.DropColumn(
                name: "UserQuotaMegabytes",
                table: "SiteSettings");
        }
    }
}
