using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace CoinPortal.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCoinsAndCountries : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Countries",
                columns: table => new
                {
                    Code = table.Column<string>(type: "char(2)", unicode: false, fixedLength: true, maxLength: 2, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Countries", x => x.Code);
                });

            migrationBuilder.CreateTable(
                name: "Coins",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OwnerId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    Denomination = table.Column<int>(type: "int", nullable: false),
                    CountryCode = table.Column<string>(type: "char(2)", unicode: false, fixedLength: true, maxLength: 2, nullable: false),
                    Year = table.Column<int>(type: "int", nullable: false),
                    MintMark = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    IsCommemorative = table.Column<bool>(type: "bit", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Coins", x => x.Id);
                    table.CheckConstraint("CK_Coins_Denomination", "[Denomination] IN (1, 2, 5, 10, 20, 50, 100, 200)");
                    table.CheckConstraint("CK_Coins_Quantity", "[Quantity] >= 1");
                    table.CheckConstraint("CK_Coins_Year", "[Year] >= 1999");
                    table.ForeignKey(
                        name: "FK_Coins_AspNetUsers_OwnerId",
                        column: x => x.OwnerId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Coins_Countries_CountryCode",
                        column: x => x.CountryCode,
                        principalTable: "Countries",
                        principalColumn: "Code",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                table: "Countries",
                columns: new[] { "Code", "Name" },
                values: new object[,]
                {
                    { "AD", "Andorra" },
                    { "AT", "Austria" },
                    { "BE", "Belgium" },
                    { "BG", "Bulgaria" },
                    { "CY", "Cyprus" },
                    { "DE", "Germany" },
                    { "EE", "Estonia" },
                    { "ES", "Spain" },
                    { "FI", "Finland" },
                    { "FR", "France" },
                    { "GR", "Greece" },
                    { "HR", "Croatia" },
                    { "IE", "Ireland" },
                    { "IT", "Italy" },
                    { "LT", "Lithuania" },
                    { "LU", "Luxembourg" },
                    { "LV", "Latvia" },
                    { "MC", "Monaco" },
                    { "MT", "Malta" },
                    { "NL", "Netherlands" },
                    { "PT", "Portugal" },
                    { "SI", "Slovenia" },
                    { "SK", "Slovakia" },
                    { "SM", "San Marino" },
                    { "VA", "Vatican City" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Coins_CountryCode",
                table: "Coins",
                column: "CountryCode");

            migrationBuilder.CreateIndex(
                name: "IX_Coins_OwnerId_CountryCode_Denomination_Year",
                table: "Coins",
                columns: new[] { "OwnerId", "CountryCode", "Denomination", "Year" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Coins");

            migrationBuilder.DropTable(
                name: "Countries");
        }
    }
}
