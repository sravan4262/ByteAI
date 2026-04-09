using ByteAI.Core.Entities;
using FluentValidation;

namespace ByteAI.Core.Validators;

public sealed class ByteValidator : AbstractValidator<Byte>
{
    private static readonly string[] AllowedTypes = ["article", "tutorial", "snippet", "discussion"];

    public ByteValidator()
    {
        RuleFor(b => b.Title)
            .NotEmpty().WithMessage("Title is required")
            .Length(1, 200).WithMessage("Title must be between 1 and 200 characters");

        RuleFor(b => b.Body)
            .NotEmpty().WithMessage("Body is required")
            .Length(1, 5000).WithMessage("Body must be between 1 and 5000 characters");

        RuleFor(b => b.CodeSnippet)
            .MaximumLength(10000).WithMessage("Code snippet must not exceed 10000 characters");

        RuleFor(b => b.Language)
            .MaximumLength(50).WithMessage("Language must not exceed 50 characters")
            .When(b => !string.IsNullOrEmpty(b.Language));

        RuleFor(b => b.Tags)
            .NotNull().WithMessage("Tags must not be null")
            .Must(t => t.Count <= 20).WithMessage("Must not exceed 20 tags");

        RuleFor(b => b.Type)
            .NotEmpty().WithMessage("Type is required")
            .Must(t => AllowedTypes.Contains(t))
            .WithMessage($"Type must be one of: {string.Join(", ", AllowedTypes)}");
    }
}
