using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CoinPortal.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddStorageWarningLevel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "StorageWarningLevel",
                table: "AspNetUsers",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddCheckConstraint(
                name: "CK_AspNetUsers_StorageWarningLevel",
                table: "AspNetUsers",
                sql: "[StorageWarningLevel] BETWEEN 0 AND 2");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_AspNetUsers_StorageWarningLevel",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "StorageWarningLevel",
                table: "AspNetUsers");
        }
    }
}
