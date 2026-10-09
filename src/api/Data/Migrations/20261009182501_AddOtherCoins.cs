using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace CoinPortal.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddOtherCoins : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Coins_Denomination",
                table: "Coins");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Coins_Year",
                table: "Coins");

            migrationBuilder.AddColumn<bool>(
                name: "IsEuroIssuer",
                table: "Countries",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AlterColumn<int>(
                name: "Denomination",
                table: "Coins",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddColumn<string>(
                name: "Currency",
                table: "Coins",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "FaceValue",
                table: "Coins",
                type: "decimal(18,4)",
                precision: 18,
                scale: 4,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Kind",
                table: "Coins",
                type: "int",
                nullable: false,
                // Every existing coin is a euro coin (CoinKind.Euro)
                defaultValue: 1);

            migrationBuilder.UpdateData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "AD",
                column: "IsEuroIssuer",
                value: true);

            migrationBuilder.UpdateData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "AT",
                column: "IsEuroIssuer",
                value: true);

            migrationBuilder.UpdateData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "BE",
                column: "IsEuroIssuer",
                value: true);

            migrationBuilder.UpdateData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "BG",
                column: "IsEuroIssuer",
                value: true);

            migrationBuilder.UpdateData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "CY",
                column: "IsEuroIssuer",
                value: true);

            migrationBuilder.UpdateData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "DE",
                column: "IsEuroIssuer",
                value: true);

            migrationBuilder.UpdateData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "EE",
                column: "IsEuroIssuer",
                value: true);

            migrationBuilder.UpdateData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "ES",
                column: "IsEuroIssuer",
                value: true);

            migrationBuilder.UpdateData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "FI",
                column: "IsEuroIssuer",
                value: true);

            migrationBuilder.UpdateData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "FR",
                column: "IsEuroIssuer",
                value: true);

            migrationBuilder.UpdateData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "GR",
                column: "IsEuroIssuer",
                value: true);

            migrationBuilder.UpdateData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "HR",
                column: "IsEuroIssuer",
                value: true);

            migrationBuilder.UpdateData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "IE",
                column: "IsEuroIssuer",
                value: true);

            migrationBuilder.UpdateData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "IT",
                column: "IsEuroIssuer",
                value: true);

            migrationBuilder.UpdateData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "LT",
                column: "IsEuroIssuer",
                value: true);

            migrationBuilder.UpdateData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "LU",
                column: "IsEuroIssuer",
                value: true);

            migrationBuilder.UpdateData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "LV",
                column: "IsEuroIssuer",
                value: true);

            migrationBuilder.UpdateData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "MC",
                column: "IsEuroIssuer",
                value: true);

            migrationBuilder.UpdateData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "MT",
                column: "IsEuroIssuer",
                value: true);

            migrationBuilder.UpdateData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "NL",
                column: "IsEuroIssuer",
                value: true);

            migrationBuilder.UpdateData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "PT",
                column: "IsEuroIssuer",
                value: true);

            migrationBuilder.UpdateData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "SI",
                column: "IsEuroIssuer",
                value: true);

            migrationBuilder.UpdateData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "SK",
                column: "IsEuroIssuer",
                value: true);

            migrationBuilder.UpdateData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "SM",
                column: "IsEuroIssuer",
                value: true);

            migrationBuilder.UpdateData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "VA",
                column: "IsEuroIssuer",
                value: true);

            migrationBuilder.InsertData(
                table: "Countries",
                columns: new[] { "Code", "IsEuroIssuer", "Name" },
                values: new object[,]
                {
                    { "AE", false, "United Arab Emirates" },
                    { "AF", false, "Afghanistan" },
                    { "AG", false, "Antigua & Barbuda" },
                    { "AI", false, "Anguilla" },
                    { "AL", false, "Albania" },
                    { "AM", false, "Armenia" },
                    { "AO", false, "Angola" },
                    { "AQ", false, "Antarctica" },
                    { "AR", false, "Argentina" },
                    { "AS", false, "American Samoa" },
                    { "AU", false, "Australia" },
                    { "AW", false, "Aruba" },
                    { "AX", false, "Åland Islands" },
                    { "AZ", false, "Azerbaijan" },
                    { "BA", false, "Bosnia & Herzegovina" },
                    { "BB", false, "Barbados" },
                    { "BD", false, "Bangladesh" },
                    { "BF", false, "Burkina Faso" },
                    { "BH", false, "Bahrain" },
                    { "BI", false, "Burundi" },
                    { "BJ", false, "Benin" },
                    { "BL", false, "St. Barthélemy" },
                    { "BM", false, "Bermuda" },
                    { "BN", false, "Brunei" },
                    { "BO", false, "Bolivia" },
                    { "BQ", false, "Caribbean Netherlands" },
                    { "BR", false, "Brazil" },
                    { "BS", false, "Bahamas" },
                    { "BT", false, "Bhutan" },
                    { "BV", false, "Bouvet Island" },
                    { "BW", false, "Botswana" },
                    { "BY", false, "Belarus" },
                    { "BZ", false, "Belize" },
                    { "CA", false, "Canada" },
                    { "CC", false, "Cocos (Keeling) Islands" },
                    { "CD", false, "Congo - Kinshasa" },
                    { "CF", false, "Central African Republic" },
                    { "CG", false, "Congo - Brazzaville" },
                    { "CH", false, "Switzerland" },
                    { "CI", false, "Côte d’Ivoire" },
                    { "CK", false, "Cook Islands" },
                    { "CL", false, "Chile" },
                    { "CM", false, "Cameroon" },
                    { "CN", false, "China" },
                    { "CO", false, "Colombia" },
                    { "CR", false, "Costa Rica" },
                    { "CS", false, "Czechoslovakia" },
                    { "CU", false, "Cuba" },
                    { "CV", false, "Cape Verde" },
                    { "CW", false, "Curaçao" },
                    { "CX", false, "Christmas Island" },
                    { "CZ", false, "Czechia" },
                    { "DD", false, "East Germany" },
                    { "DJ", false, "Djibouti" },
                    { "DK", false, "Denmark" },
                    { "DM", false, "Dominica" },
                    { "DO", false, "Dominican Republic" },
                    { "DZ", false, "Algeria" },
                    { "EC", false, "Ecuador" },
                    { "EG", false, "Egypt" },
                    { "EH", false, "Western Sahara" },
                    { "ER", false, "Eritrea" },
                    { "ET", false, "Ethiopia" },
                    { "FJ", false, "Fiji" },
                    { "FK", false, "Falkland Islands" },
                    { "FM", false, "Micronesia" },
                    { "FO", false, "Faroe Islands" },
                    { "GA", false, "Gabon" },
                    { "GB", false, "United Kingdom" },
                    { "GD", false, "Grenada" },
                    { "GE", false, "Georgia" },
                    { "GF", false, "French Guiana" },
                    { "GG", false, "Guernsey" },
                    { "GH", false, "Ghana" },
                    { "GI", false, "Gibraltar" },
                    { "GL", false, "Greenland" },
                    { "GM", false, "Gambia" },
                    { "GN", false, "Guinea" },
                    { "GP", false, "Guadeloupe" },
                    { "GQ", false, "Equatorial Guinea" },
                    { "GS", false, "South Georgia & South Sandwich Islands" },
                    { "GT", false, "Guatemala" },
                    { "GU", false, "Guam" },
                    { "GW", false, "Guinea-Bissau" },
                    { "GY", false, "Guyana" },
                    { "HK", false, "Hong Kong SAR China" },
                    { "HM", false, "Heard & McDonald Islands" },
                    { "HN", false, "Honduras" },
                    { "HT", false, "Haiti" },
                    { "HU", false, "Hungary" },
                    { "ID", false, "Indonesia" },
                    { "IL", false, "Israel" },
                    { "IM", false, "Isle of Man" },
                    { "IN", false, "India" },
                    { "IO", false, "British Indian Ocean Territory" },
                    { "IQ", false, "Iraq" },
                    { "IR", false, "Iran" },
                    { "IS", false, "Iceland" },
                    { "JE", false, "Jersey" },
                    { "JM", false, "Jamaica" },
                    { "JO", false, "Jordan" },
                    { "JP", false, "Japan" },
                    { "KE", false, "Kenya" },
                    { "KG", false, "Kyrgyzstan" },
                    { "KH", false, "Cambodia" },
                    { "KI", false, "Kiribati" },
                    { "KM", false, "Comoros" },
                    { "KN", false, "St. Kitts & Nevis" },
                    { "KP", false, "North Korea" },
                    { "KR", false, "South Korea" },
                    { "KW", false, "Kuwait" },
                    { "KY", false, "Cayman Islands" },
                    { "KZ", false, "Kazakhstan" },
                    { "LA", false, "Laos" },
                    { "LB", false, "Lebanon" },
                    { "LC", false, "St. Lucia" },
                    { "LI", false, "Liechtenstein" },
                    { "LK", false, "Sri Lanka" },
                    { "LR", false, "Liberia" },
                    { "LS", false, "Lesotho" },
                    { "LY", false, "Libya" },
                    { "MA", false, "Morocco" },
                    { "MD", false, "Moldova" },
                    { "ME", false, "Montenegro" },
                    { "MF", false, "St. Martin" },
                    { "MG", false, "Madagascar" },
                    { "MH", false, "Marshall Islands" },
                    { "MK", false, "North Macedonia" },
                    { "ML", false, "Mali" },
                    { "MM", false, "Myanmar (Burma)" },
                    { "MN", false, "Mongolia" },
                    { "MO", false, "Macao SAR China" },
                    { "MP", false, "Northern Mariana Islands" },
                    { "MQ", false, "Martinique" },
                    { "MR", false, "Mauritania" },
                    { "MS", false, "Montserrat" },
                    { "MU", false, "Mauritius" },
                    { "MV", false, "Maldives" },
                    { "MW", false, "Malawi" },
                    { "MX", false, "Mexico" },
                    { "MY", false, "Malaysia" },
                    { "MZ", false, "Mozambique" },
                    { "NA", false, "Namibia" },
                    { "NC", false, "New Caledonia" },
                    { "NE", false, "Niger" },
                    { "NF", false, "Norfolk Island" },
                    { "NG", false, "Nigeria" },
                    { "NI", false, "Nicaragua" },
                    { "NO", false, "Norway" },
                    { "NP", false, "Nepal" },
                    { "NR", false, "Nauru" },
                    { "NU", false, "Niue" },
                    { "NZ", false, "New Zealand" },
                    { "OM", false, "Oman" },
                    { "PA", false, "Panama" },
                    { "PE", false, "Peru" },
                    { "PF", false, "French Polynesia" },
                    { "PG", false, "Papua New Guinea" },
                    { "PH", false, "Philippines" },
                    { "PK", false, "Pakistan" },
                    { "PL", false, "Poland" },
                    { "PM", false, "St. Pierre & Miquelon" },
                    { "PN", false, "Pitcairn Islands" },
                    { "PR", false, "Puerto Rico" },
                    { "PS", false, "Palestinian Territories" },
                    { "PW", false, "Palau" },
                    { "PY", false, "Paraguay" },
                    { "QA", false, "Qatar" },
                    { "RE", false, "Réunion" },
                    { "RO", false, "Romania" },
                    { "RS", false, "Serbia" },
                    { "RU", false, "Russia" },
                    { "RW", false, "Rwanda" },
                    { "SA", false, "Saudi Arabia" },
                    { "SB", false, "Solomon Islands" },
                    { "SC", false, "Seychelles" },
                    { "SD", false, "Sudan" },
                    { "SE", false, "Sweden" },
                    { "SG", false, "Singapore" },
                    { "SH", false, "St. Helena" },
                    { "SJ", false, "Svalbard & Jan Mayen" },
                    { "SL", false, "Sierra Leone" },
                    { "SN", false, "Senegal" },
                    { "SO", false, "Somalia" },
                    { "SR", false, "Suriname" },
                    { "SS", false, "South Sudan" },
                    { "ST", false, "São Tomé & Príncipe" },
                    { "SU", false, "Soviet Union" },
                    { "SV", false, "El Salvador" },
                    { "SX", false, "Sint Maarten" },
                    { "SY", false, "Syria" },
                    { "SZ", false, "Eswatini" },
                    { "TC", false, "Turks & Caicos Islands" },
                    { "TD", false, "Chad" },
                    { "TF", false, "French Southern Territories" },
                    { "TG", false, "Togo" },
                    { "TH", false, "Thailand" },
                    { "TJ", false, "Tajikistan" },
                    { "TK", false, "Tokelau" },
                    { "TL", false, "Timor-Leste" },
                    { "TM", false, "Turkmenistan" },
                    { "TN", false, "Tunisia" },
                    { "TO", false, "Tonga" },
                    { "TR", false, "Türkiye" },
                    { "TT", false, "Trinidad & Tobago" },
                    { "TV", false, "Tuvalu" },
                    { "TW", false, "Taiwan" },
                    { "TZ", false, "Tanzania" },
                    { "UA", false, "Ukraine" },
                    { "UG", false, "Uganda" },
                    { "UM", false, "U.S. Outlying Islands" },
                    { "US", false, "United States" },
                    { "UY", false, "Uruguay" },
                    { "UZ", false, "Uzbekistan" },
                    { "VC", false, "St. Vincent & Grenadines" },
                    { "VE", false, "Venezuela" },
                    { "VG", false, "British Virgin Islands" },
                    { "VI", false, "U.S. Virgin Islands" },
                    { "VN", false, "Vietnam" },
                    { "VU", false, "Vanuatu" },
                    { "WF", false, "Wallis & Futuna" },
                    { "WS", false, "Samoa" },
                    { "YE", false, "Yemen" },
                    { "YT", false, "Mayotte" },
                    { "YU", false, "Yugoslavia" },
                    { "ZA", false, "South Africa" },
                    { "ZM", false, "Zambia" },
                    { "ZW", false, "Zimbabwe" }
                });

            migrationBuilder.AddCheckConstraint(
                name: "CK_Coins_Kind",
                table: "Coins",
                sql: "[Kind] IN (1, 2)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Coins_Value",
                table: "Coins",
                sql: "([Kind] = 1 AND [Denomination] IN (1, 2, 5, 10, 20, 50, 100, 200) AND [FaceValue] IS NULL AND [Currency] IS NULL) OR ([Kind] = 2 AND [Denomination] IS NULL AND [FaceValue] > 0 AND [Currency] IS NOT NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Coins_Year",
                table: "Coins",
                sql: "([Kind] = 1 AND [Year] >= 1999) OR ([Kind] = 2 AND [Year] >= 1)");
        }

        /// <inheritdoc />
        // Works only while there are no other coins (their null denomination and their countries
        // stop it): delete those first.
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Coins_Kind",
                table: "Coins");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Coins_Value",
                table: "Coins");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Coins_Year",
                table: "Coins");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "AE");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "AF");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "AG");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "AI");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "AL");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "AM");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "AO");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "AQ");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "AR");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "AS");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "AU");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "AW");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "AX");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "AZ");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "BA");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "BB");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "BD");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "BF");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "BH");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "BI");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "BJ");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "BL");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "BM");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "BN");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "BO");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "BQ");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "BR");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "BS");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "BT");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "BV");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "BW");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "BY");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "BZ");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "CA");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "CC");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "CD");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "CF");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "CG");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "CH");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "CI");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "CK");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "CL");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "CM");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "CN");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "CO");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "CR");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "CS");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "CU");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "CV");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "CW");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "CX");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "CZ");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "DD");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "DJ");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "DK");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "DM");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "DO");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "DZ");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "EC");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "EG");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "EH");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "ER");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "ET");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "FJ");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "FK");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "FM");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "FO");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "GA");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "GB");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "GD");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "GE");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "GF");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "GG");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "GH");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "GI");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "GL");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "GM");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "GN");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "GP");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "GQ");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "GS");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "GT");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "GU");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "GW");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "GY");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "HK");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "HM");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "HN");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "HT");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "HU");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "ID");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "IL");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "IM");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "IN");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "IO");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "IQ");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "IR");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "IS");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "JE");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "JM");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "JO");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "JP");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "KE");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "KG");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "KH");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "KI");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "KM");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "KN");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "KP");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "KR");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "KW");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "KY");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "KZ");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "LA");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "LB");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "LC");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "LI");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "LK");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "LR");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "LS");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "LY");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "MA");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "MD");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "ME");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "MF");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "MG");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "MH");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "MK");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "ML");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "MM");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "MN");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "MO");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "MP");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "MQ");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "MR");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "MS");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "MU");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "MV");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "MW");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "MX");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "MY");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "MZ");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "NA");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "NC");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "NE");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "NF");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "NG");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "NI");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "NO");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "NP");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "NR");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "NU");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "NZ");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "OM");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "PA");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "PE");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "PF");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "PG");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "PH");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "PK");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "PL");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "PM");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "PN");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "PR");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "PS");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "PW");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "PY");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "QA");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "RE");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "RO");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "RS");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "RU");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "RW");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "SA");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "SB");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "SC");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "SD");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "SE");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "SG");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "SH");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "SJ");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "SL");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "SN");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "SO");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "SR");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "SS");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "ST");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "SU");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "SV");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "SX");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "SY");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "SZ");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "TC");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "TD");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "TF");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "TG");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "TH");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "TJ");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "TK");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "TL");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "TM");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "TN");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "TO");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "TR");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "TT");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "TV");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "TW");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "TZ");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "UA");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "UG");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "UM");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "US");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "UY");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "UZ");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "VC");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "VE");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "VG");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "VI");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "VN");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "VU");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "WF");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "WS");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "YE");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "YT");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "YU");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "ZA");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "ZM");

            migrationBuilder.DeleteData(
                table: "Countries",
                keyColumn: "Code",
                keyValue: "ZW");

            migrationBuilder.DropColumn(
                name: "IsEuroIssuer",
                table: "Countries");

            migrationBuilder.DropColumn(
                name: "Currency",
                table: "Coins");

            migrationBuilder.DropColumn(
                name: "FaceValue",
                table: "Coins");

            migrationBuilder.DropColumn(
                name: "Kind",
                table: "Coins");

            migrationBuilder.AlterColumn<int>(
                name: "Denomination",
                table: "Coins",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_Coins_Denomination",
                table: "Coins",
                sql: "[Denomination] IN (1, 2, 5, 10, 20, 50, 100, 200)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Coins_Year",
                table: "Coins",
                sql: "[Year] >= 1999");
        }
    }
}
