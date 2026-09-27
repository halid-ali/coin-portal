using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace CoinPortal.Api.Data;

/// <summary>
/// SQL Server datetime2 does not store DateTime.Kind. Values come back as Unspecified
/// and would be serialized without a trailing 'Z'; this marks them as UTC on read.
/// </summary>
public class UtcDateTimeConverter() : ValueConverter<DateTime, DateTime>(
    v => v.Kind == DateTimeKind.Local ? v.ToUniversalTime() : v,
    v => DateTime.SpecifyKind(v, DateTimeKind.Utc));