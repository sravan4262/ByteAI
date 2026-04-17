using ByteAI.Core.Entities;
using FluentValidation;

namespace ByteAI.Core.Validators;

public sealed class UserValidator : AbstractValidator<User>
{
    public UserValidator()
    {
        RuleFor(u => u.SupabaseUserId)
            .MaximumLength(255).WithMessage("SupabaseUserId must not exceed 255 characters");

        RuleFor(u => u.Username)
            .NotEmpty().WithMessage("Username is required")
            .Length(3, 50).WithMessage("Username must be between 3 and 50 characters")
            .Matches(@"^[a-zA-Z0-9_-]+$").WithMessage("Username can only contain letters, numbers, underscores, and hyphens");

        RuleFor(u => u.DisplayName)
            .NotEmpty().WithMessage("Display name is required")
            .MaximumLength(100).WithMessage("Display name must not exceed 100 characters");

        RuleFor(u => u.Bio)
            .MaximumLength(500).WithMessage("Bio must not exceed 500 characters");

        RuleFor(u => u.Level).GreaterThanOrEqualTo(1).WithMessage("Level must be at least 1");
        RuleFor(u => u.Xp).GreaterThanOrEqualTo(0).WithMessage("XP must be non-negative");
        RuleFor(u => u.Streak).GreaterThanOrEqualTo(0).WithMessage("Streak must be non-negative");
    }
}
