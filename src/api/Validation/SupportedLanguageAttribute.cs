using System.ComponentModel.DataAnnotations;
using CoinPortal.Api.Localization;

namespace CoinPortal.Api.Validation;

// Accepts one of SupportedLanguages.All; null is left to [Required]
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Parameter)]
public sealed class SupportedLanguageAttribute : ValidationAttribute
{
    protected override ValidationResult? IsValid(object? value, ValidationContext context)
    {
        if (value is null || SupportedLanguages.IsSupported(value as string))
            return ValidationResult.Success;

        return new ValidationResult(
            $"Language must be one of: {string.Join(", ", SupportedLanguages.All)}.",
            [context.MemberName!]);
    }
}
