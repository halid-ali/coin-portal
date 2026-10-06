using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CoinPortal.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class ShareTokenCaseSensitive : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "ShareToken",
                table: "Collections",
                type: "char(22)",
                unicode: false,
                fixedLength: true,
                maxLength: 22,
                nullable: true,
                collation: "Latin1_General_BIN2",
                oldClrType: typeof(string),
                oldType: "char(22)",
                oldUnicode: false,
                oldFixedLength: true,
                oldMaxLength: 22,
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "ShareToken",
                table: "Collections",
                type: "char(22)",
                unicode: false,
                fixedLength: true,
                maxLength: 22,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "char(22)",
                oldUnicode: false,
                oldFixedLength: true,
                oldMaxLength: 22,
                oldNullable: true,
                oldCollation: "Latin1_General_BIN2");
        }
    }
}
