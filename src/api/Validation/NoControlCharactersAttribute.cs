using System.ComponentModel.DataAnnotations;

namespace CoinPortal.Api.Validation;

/// <summary>
/// Text a user types: no control characters (NUL, escape, DEL and the like), which no form
/// produces and which break display and exports. Multi-line text (<see cref="AllowLineBreaks"/>)
/// keeps line breaks and tabs.
/// </summary>
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Parameter)]
public sealed class NoControlCharactersAttribute : ValidationAttribute
{
    public bool AllowLineBreaks { get; init; }

    protected override ValidationResult? IsValid(object? value, ValidationContext context) =>
        value is not string text || !text.Any(c => char.IsControl(c) && !(AllowLineBreaks && c is '\n' or '\r' or '\t'))
            ? ValidationResult.Success
            : new ValidationResult(ErrorMessage ?? $"{context.MemberName} must not contain control characters.",
                [context.MemberName!]);
}
