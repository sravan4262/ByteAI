using ByteAI.Core.Events;
using ByteAI.Core.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;
using FollowEntity = ByteAI.Core.Entities.Follow;

namespace ByteAI.Core.Services.Follow;

public sealed class FollowService(AppDbContext db, IPublisher publisher) : IFollowService
{
    public async Task<bool> FollowUserAsync(Guid followerId, Guid targetUserId, CancellationToken ct)
    {
        if (followerId == targetUserId)
            throw new InvalidOperationException("Cannot follow yourself");

        var existing = await db.Follows
            .FirstOrDefaultAsync(f => f.FollowerId == followerId && f.FollowingId == targetUserId, ct);

        if (existing is not null) return true;

        db.Follows.Add(new FollowEntity { FollowerId = followerId, FollowingId = targetUserId, CreatedAt = DateTime.UtcNow });
        await db.SaveChangesAsync(ct);

        await publisher.Publish(new UserFollowedEvent(followerId, targetUserId), ct);
        return true;
    }

    public async Task<bool> UnfollowUserAsync(Guid followerId, Guid targetUserId, CancellationToken ct)
    {
        var follow = await db.Follows
            .FirstOrDefaultAsync(f => f.FollowerId == followerId && f.FollowingId == targetUserId, ct);

        if (follow is null) return false;

        db.Follows.Remove(follow);
        await db.SaveChangesAsync(ct);
        return true;
    }
}
