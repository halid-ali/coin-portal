using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CoinPortal.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class UnverifiedLifetime : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "UnverifiedLifetimeDays",
                table: "SiteSettings",
                type: "int",
                nullable: false,
                // The single row's starting value (user decision 2026-10-07), changed in the admin panel
                defaultValue: 30);

            migrationBuilder.AddColumn<DateTime>(
                name: "UnverifiedLifetimeSinceUtc",
                table: "SiteSettings",
                type: "datetime2",
                nullable: false,
                // Accounts from before count from this release, not from their sign-up
                defaultValueSql: "SYSUTCDATETIME()");

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletionReminderSentAtUtc",
                table: "AspNetUsers",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletionReminderTriedAtUtc",
                table: "AspNetUsers",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "FinalDeletionReminderSentAtUtc",
                table: "AspNetUsers",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_SiteSettings_UnverifiedLifetimeDays",
                table: "SiteSettings",
                sql: "[UnverifiedLifetimeDays] BETWEEN 0 AND 365");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_SiteSettings_UnverifiedLifetimeDays",
                table: "SiteSettings");

            migrationBuilder.DropColumn(
                name: "UnverifiedLifetimeDays",
                table: "SiteSettings");

            migrationBuilder.DropColumn(
                name: "UnverifiedLifetimeSinceUtc",
                table: "SiteSettings");

            migrationBuilder.DropColumn(
                name: "DeletionReminderSentAtUtc",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "DeletionReminderTriedAtUtc",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "FinalDeletionReminderSentAtUtc",
                table: "AspNetUsers");
        }
    }
}
