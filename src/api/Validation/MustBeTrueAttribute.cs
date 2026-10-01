using System.ComponentModel.DataAnnotations;

namespace CoinPortal.Api.Validation;

// A box the user must tick, e.g. having read the privacy policy at sign-up
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Parameter)]
public sealed class MustBeTrueAttribute : ValidationAttribute
{
    protected override ValidationResult? IsValid(object? value, ValidationContext context) =>
        value is true
            ? ValidationResult.Success
            : new ValidationResult(ErrorMessage ?? $"{context.MemberName} must be true.", [context.MemberName!]);
}
