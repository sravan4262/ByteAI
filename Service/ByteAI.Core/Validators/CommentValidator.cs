using ByteAI.Core.Entities;
using FluentValidation;

namespace ByteAI.Core.Validators;

public sealed class CommentValidator : AbstractValidator<Comment>
{
    public CommentValidator()
    {
        RuleFor(c => c.Body)
            .NotEmpty().WithMessage("Comment body is required")
            .Length(1, 2000).WithMessage("Comment must be between 1 and 2000 characters");

        RuleFor(c => c.ByteId)
            .NotEmpty().WithMessage("ByteId is required");

        RuleFor(c => c.AuthorId)
            .NotEmpty().WithMessage("AuthorId is required");
    }
}
