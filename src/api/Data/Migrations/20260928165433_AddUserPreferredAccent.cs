using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CoinPortal.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddUserPreferredAccent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "PreferredAccent",
                table: "AspNetUsers",
                type: "int",
                nullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_AspNetUsers_PreferredAccent",
                table: "AspNetUsers",
                sql: "[PreferredAccent] BETWEEN 0 AND 6");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_AspNetUsers_PreferredAccent",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "PreferredAccent",
                table: "AspNetUsers");
        }
    }
}
