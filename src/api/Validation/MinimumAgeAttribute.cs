using System.ComponentModel.DataAnnotations;

namespace CoinPortal.Api.Validation;

// Validates that a DateOnly birth date belongs to someone at least `years` old
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Parameter)]
public sealed class MinimumAgeAttribute(int years) : ValidationAttribute
{
    public int Years { get; } = years;

    protected override ValidationResult? IsValid(object? value, ValidationContext context)
    {
        if (value is not DateOnly birthDate)
            return ValidationResult.Success; // [Required] handles missing values

        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        if (birthDate > today)
            return new ValidationResult("Birth date cannot be in the future.", [context.MemberName!]);

        if (birthDate < today.AddYears(-120))
            return new ValidationResult("Birth date is not valid.", [context.MemberName!]);

        // Adding years handles leap days and "birthday not yet reached this year"
        if (birthDate.AddYears(Years) > today)
            return new ValidationResult($"You must be at least {Years} years old.", [context.MemberName!]);

        return ValidationResult.Success;
    }
}