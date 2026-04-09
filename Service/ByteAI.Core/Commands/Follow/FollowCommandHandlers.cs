using ByteAI.Core.Events;
using FollowEntity = ByteAI.Core.Entities.Follow;
using ByteAI.Core.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ByteAI.Core.Commands.Follow;

public sealed class FollowUserCommandHandler(AppDbContext db, IPublisher publisher)
    : IRequestHandler<FollowUserCommand, bool>
{
    public async Task<bool> Handle(FollowUserCommand request, CancellationToken cancellationToken)
    {
        var existing = await db.Follows
            .FirstOrDefaultAsync(f => f.FollowerId == request.FollowerId && f.FollowingId == request.FollowingId, cancellationToken);

        if (existing is not null) return true; // Idempotent

        db.Follows.Add(new FollowEntity { FollowerId = request.FollowerId, FollowingId = request.FollowingId, CreatedAt = DateTime.UtcNow });
        await db.SaveChangesAsync(cancellationToken);

        await publisher.Publish(new UserFollowedEvent(request.FollowerId, request.FollowingId), cancellationToken);
        return true;
    }
}

public sealed class UnfollowUserCommandHandler(AppDbContext db)
    : IRequestHandler<UnfollowUserCommand, bool>
{
    public async Task<bool> Handle(UnfollowUserCommand request, CancellationToken cancellationToken)
    {
        var follow = await db.Follows
            .FirstOrDefaultAsync(f => f.FollowerId == request.FollowerId && f.FollowingId == request.UnfollowingId, cancellationToken);

        if (follow is null) return false;

        db.Follows.Remove(follow);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }
}
