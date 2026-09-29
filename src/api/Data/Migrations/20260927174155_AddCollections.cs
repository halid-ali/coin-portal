using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CoinPortal.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCollections : Migration
    {
        /// <inheritdoc />
        // Hand-edited: existing coins need a collection before CollectionId can be required.
        // Order: table, nullable column, default collection per user + assignment, NOT NULL,
        // then indexes and the foreign key.
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Coins_OwnerId_CountryCode_Denomination_Year",
                table: "Coins");

            migrationBuilder.CreateTable(
                name: "Collections",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OwnerId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Collections", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Collections_AspNetUsers_OwnerId",
                        column: x => x.OwnerId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.AddColumn<int>(
                name: "CollectionId",
                table: "Coins",
                type: "int",
                nullable: true);

            // Every existing user gets the default collection; their coins move into it.
            // Literal name on purpose: a migration must not change if Collection.DefaultName does.
            migrationBuilder.Sql("""
                INSERT INTO [Collections] ([OwnerId], [Name], [CreatedAtUtc], [UpdatedAtUtc])
                SELECT [Id], N'Koleksiyonum', SYSUTCDATETIME(), SYSUTCDATETIME()
                FROM [AspNetUsers];

                UPDATE [c] SET [CollectionId] = [col].[Id]
                FROM [Coins] AS [c]
                INNER JOIN [Collections] AS [col] ON [col].[OwnerId] = [c].[OwnerId];
                """);

            migrationBuilder.AlterColumn<int>(
                name: "CollectionId",
                table: "Coins",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Coins_CollectionId_CountryCode_Denomination_Year",
                table: "Coins",
                columns: new[] { "CollectionId", "CountryCode", "Denomination", "Year" });

            migrationBuilder.CreateIndex(
                name: "IX_Coins_OwnerId",
                table: "Coins",
                column: "OwnerId");

            migrationBuilder.CreateIndex(
                name: "IX_Collections_OwnerId_Name",
                table: "Collections",
                columns: new[] { "OwnerId", "Name" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Coins_Collections_CollectionId",
                table: "Coins",
                column: "CollectionId",
                principalTable: "Collections",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Coins_Collections_CollectionId",
                table: "Coins");

            migrationBuilder.DropTable(
                name: "Collections");

            migrationBuilder.DropIndex(
                name: "IX_Coins_CollectionId_CountryCode_Denomination_Year",
                table: "Coins");

            migrationBuilder.DropIndex(
                name: "IX_Coins_OwnerId",
                table: "Coins");

            migrationBuilder.DropColumn(
                name: "CollectionId",
                table: "Coins");

            migrationBuilder.CreateIndex(
                name: "IX_Coins_OwnerId_CountryCode_Denomination_Year",
                table: "Coins",
                columns: new[] { "OwnerId", "CountryCode", "Denomination", "Year" });
        }
    }
}
