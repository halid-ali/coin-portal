using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CoinPortal.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class VerificationRequest : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_AuditLog_Action",
                table: "AuditLog");

            migrationBuilder.AddColumn<DateTime>(
                name: "VerificationRequestSentAtUtc",
                table: "AspNetUsers",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_AuditLog_Action",
                table: "AuditLog",
                sql: "[Action] IN (1, 2, 3, 4, 5, 6, 7, 8)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_AuditLog_Action",
                table: "AuditLog");

            migrationBuilder.DropColumn(
                name: "VerificationRequestSentAtUtc",
                table: "AspNetUsers");

            migrationBuilder.AddCheckConstraint(
                name: "CK_AuditLog_Action",
                table: "AuditLog",
                sql: "[Action] IN (1, 2, 3, 4, 5, 6)");
        }
    }
}
