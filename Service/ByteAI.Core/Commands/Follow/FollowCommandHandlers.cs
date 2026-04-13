using ByteAI.Core.Entities;
using ByteAI.Core.Events;
using ByteAI.Core.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ByteAI.Core.Commands.Follow;

public sealed class FollowUserCommandHandler(AppDbContext db, IPublisher publisher)
    : IRequestHandler<FollowUserCommand, bool>
{
    public async Task<bool> Handle(FollowUserCommand request, CancellationToken cancellationToken)
    {
        var existing = await db.UserFollowings
            .AnyAsync(f => f.UserId == request.FollowerId && f.FollowingId == request.FollowingId, cancellationToken);

        if (existing) return true;

        db.UserFollowings.Add(new UserFollowing { UserId = request.FollowerId, FollowingId = request.FollowingId, CreatedAt = DateTime.UtcNow });
        db.UserFollowers.Add(new UserFollower { UserId = request.FollowingId, FollowerId = request.FollowerId, CreatedAt = DateTime.UtcNow });
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
        var following = await db.UserFollowings
            .FirstOrDefaultAsync(f => f.UserId == request.FollowerId && f.FollowingId == request.UnfollowingId, cancellationToken);

        if (following is null) return false;

        var follower = await db.UserFollowers
            .FirstOrDefaultAsync(f => f.UserId == request.UnfollowingId && f.FollowerId == request.FollowerId, cancellationToken);

        db.UserFollowings.Remove(following);
        if (follower is not null) db.UserFollowers.Remove(follower);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }
}
