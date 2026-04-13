using ByteAI.Core.Entities;
using ByteAI.Core.Events;
using ByteAI.Core.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ByteAI.Core.Services.Follow;

public sealed class FollowService(AppDbContext db, IPublisher publisher) : IFollowService
{
    public async Task<bool> FollowUserAsync(Guid followerId, Guid targetUserId, CancellationToken ct)
    {
        // Idempotent — already following
        var alreadyFollowing = await db.UserFollowings
            .AnyAsync(f => f.UserId == followerId && f.FollowingId == targetUserId, ct);

        if (alreadyFollowing) return true;

        // Insert into users.following — "followerId follows targetUserId"
        db.UserFollowings.Add(new UserFollowing
        {
            UserId = followerId,
            FollowingId = targetUserId,
            CreatedAt = DateTime.UtcNow,
        });

        // Insert into users.followers — "targetUserId gains follower followerId"
        db.UserFollowers.Add(new UserFollower
        {
            UserId = targetUserId,
            FollowerId = followerId,
            CreatedAt = DateTime.UtcNow,
        });

        await db.SaveChangesAsync(ct);
        await publisher.Publish(new UserFollowedEvent(followerId, targetUserId), ct);
        return true;
    }

    public async Task<bool> UnfollowUserAsync(Guid followerId, Guid targetUserId, CancellationToken ct)
    {
        var following = await db.UserFollowings
            .FirstOrDefaultAsync(f => f.UserId == followerId && f.FollowingId == targetUserId, ct);

        if (following is null) return false;

        var follower = await db.UserFollowers
            .FirstOrDefaultAsync(f => f.UserId == targetUserId && f.FollowerId == followerId, ct);

        db.UserFollowings.Remove(following);
        if (follower is not null) db.UserFollowers.Remove(follower);

        await db.SaveChangesAsync(ct);
        await publisher.Publish(new UserUnfollowedEvent(followerId, targetUserId), ct);
        return true;
    }
}
