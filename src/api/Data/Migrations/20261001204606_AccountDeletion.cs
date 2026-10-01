using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CoinPortal.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AccountDeletion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_AuditLog_Action",
                table: "AuditLog");

            migrationBuilder.AlterColumn<string>(
                name: "ActorUserName",
                table: "AuditLog",
                type: "nvarchar(256)",
                maxLength: 256,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(256)",
                oldMaxLength: 256);

            migrationBuilder.AddCheckConstraint(
                name: "CK_AuditLog_Action",
                table: "AuditLog",
                sql: "[Action] IN (1, 2, 3, 4, 5)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_AuditLog_Action",
                table: "AuditLog");

            migrationBuilder.AlterColumn<string>(
                name: "ActorUserName",
                table: "AuditLog",
                type: "nvarchar(256)",
                maxLength: 256,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(256)",
                oldMaxLength: 256,
                oldNullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_AuditLog_Action",
                table: "AuditLog",
                sql: "[Action] IN (1, 2, 3, 4)");
        }
    }
}
