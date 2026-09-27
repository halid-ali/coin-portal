using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CoinPortal.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCoinPhotos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CoinPhotos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CoinId = table.Column<int>(type: "int", nullable: false),
                    Side = table.Column<int>(type: "int", nullable: false),
                    SizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CoinPhotos", x => x.Id);
                    table.CheckConstraint("CK_CoinPhotos_Side", "[Side] IN (1, 2)");
                    table.CheckConstraint("CK_CoinPhotos_SizeBytes", "[SizeBytes] > 0");
                    table.ForeignKey(
                        name: "FK_CoinPhotos_Coins_CoinId",
                        column: x => x.CoinId,
                        principalTable: "Coins",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CoinPhotos_CoinId_Side",
                table: "CoinPhotos",
                columns: new[] { "CoinId", "Side" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CoinPhotos");
        }
    }
}
