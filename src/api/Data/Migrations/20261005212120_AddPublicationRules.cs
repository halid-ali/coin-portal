using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CoinPortal.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPublicationRules : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_AuditLog_Action",
                table: "AuditLog");

            migrationBuilder.AddColumn<string>(
                name: "NewValue",
                table: "AuditLog",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OldValue",
                table: "AuditLog",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Setting",
                table: "AuditLog",
                type: "varchar(50)",
                unicode: false,
                maxLength: 50,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "SiteSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false),
                    MinPublicCoins = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SiteSettings", x => x.Id);
                    table.CheckConstraint("CK_SiteSettings_Id", "[Id] = 1");
                    table.CheckConstraint("CK_SiteSettings_MinPublicCoins", "[MinPublicCoins] BETWEEN 1 AND 100");
                });

            migrationBuilder.AddCheckConstraint(
                name: "CK_AuditLog_Action",
                table: "AuditLog",
                sql: "[Action] IN (1, 2, 3, 4, 5, 6)");

            // The single settings row; 10 photographed coins for a public collection
            migrationBuilder.Sql("INSERT INTO SiteSettings (Id, MinPublicCoins) VALUES (1, 10);");

            // Public collections that do not meet the new rule become Unlisted (Visibility 1) with a
            // share token of their own: a coin without a national side photo (Side 1), or fewer than
            // 10 coins with one. The token is 16 random bytes as base64url, like Collection.NewShareToken.
            migrationBuilder.Sql("""
                DECLARE @id int, @bytes varbinary(16);
                WHILE 1 = 1
                BEGIN
                    SET @id = NULL;
                    SELECT TOP (1) @id = c.Id
                    FROM Collections c
                    WHERE c.Visibility = 2
                      AND (EXISTS (SELECT 1 FROM Coins k
                                   WHERE k.CollectionId = c.Id
                                     AND NOT EXISTS (SELECT 1 FROM CoinPhotos p WHERE p.CoinId = k.Id AND p.Side = 1))
                           OR (SELECT COUNT(*) FROM Coins k
                               WHERE k.CollectionId = c.Id
                                 AND EXISTS (SELECT 1 FROM CoinPhotos p WHERE p.CoinId = k.Id AND p.Side = 1)) < 10);
                    IF @id IS NULL BREAK;

                    SET @bytes = CRYPT_GEN_RANDOM(16);
                    UPDATE Collections
                    SET Visibility = 1,
                        ShareToken = REPLACE(REPLACE(REPLACE(
                            CAST('' AS XML).value('xs:base64Binary(sql:variable("@bytes"))', 'varchar(24)'),
                            '+', '-'), '/', '_'), '=', ''),
                        UpdatedAtUtc = SYSUTCDATETIME()
                    WHERE Id = @id;
                END
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SiteSettings");

            migrationBuilder.DropCheckConstraint(
                name: "CK_AuditLog_Action",
                table: "AuditLog");

            migrationBuilder.DropColumn(
                name: "NewValue",
                table: "AuditLog");

            migrationBuilder.DropColumn(
                name: "OldValue",
                table: "AuditLog");

            migrationBuilder.DropColumn(
                name: "Setting",
                table: "AuditLog");

            migrationBuilder.AddCheckConstraint(
                name: "CK_AuditLog_Action",
                table: "AuditLog",
                sql: "[Action] IN (1, 2, 3, 4, 5)");
        }
    }
}
