using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CoinPortal.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCollectionVisibility : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ShareToken",
                table: "Collections",
                type: "char(22)",
                unicode: false,
                fixedLength: true,
                maxLength: 22,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Visibility",
                table: "Collections",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_Collections_ShareToken",
                table: "Collections",
                column: "ShareToken",
                unique: true,
                filter: "[ShareToken] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Collections_Visibility_OwnerId",
                table: "Collections",
                columns: new[] { "Visibility", "OwnerId" });

            migrationBuilder.AddCheckConstraint(
                name: "CK_Collections_Visibility",
                table: "Collections",
                sql: "[Visibility] IN (0, 1, 2)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Collections_ShareToken",
                table: "Collections");

            migrationBuilder.DropIndex(
                name: "IX_Collections_Visibility_OwnerId",
                table: "Collections");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Collections_Visibility",
                table: "Collections");

            migrationBuilder.DropColumn(
                name: "ShareToken",
                table: "Collections");

            migrationBuilder.DropColumn(
                name: "Visibility",
                table: "Collections");
        }
    }
}
