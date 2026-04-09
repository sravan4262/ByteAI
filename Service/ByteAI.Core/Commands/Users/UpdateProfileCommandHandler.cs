using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ByteAI.Core.Commands.Users;

public sealed class UpdateProfileCommandHandler(AppDbContext db)
    : IRequestHandler<UpdateProfileCommand, User>
{
    public async Task<User> Handle(UpdateProfileCommand request, CancellationToken cancellationToken)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken)
            ?? throw new InvalidOperationException($"User {request.UserId} not found");

        if (!string.IsNullOrWhiteSpace(request.DisplayName)) user.DisplayName = request.DisplayName;
        if (!string.IsNullOrWhiteSpace(request.Bio)) user.Bio = request.Bio;
        if (request.TechStack is not null) user.TechStack = request.TechStack;
        if (request.FeedPreferences is not null) user.FeedPreferences = request.FeedPreferences;
        user.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(cancellationToken);
        return user;
    }
}
