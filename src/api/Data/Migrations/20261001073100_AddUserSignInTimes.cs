using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CoinPortal.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddUserSignInTimes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "LastSeenAtUtc",
                table: "AspNetUsers",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastSignInAtUtc",
                table: "AspNetUsers",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PreviousSignInAtUtc",
                table: "AspNetUsers",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LastSeenAtUtc",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "LastSignInAtUtc",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "PreviousSignInAtUtc",
                table: "AspNetUsers");
        }
    }
}
