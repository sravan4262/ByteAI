using ByteAI.Core.Infrastructure.Persistence;
using ByteAI.Core.Services.Notifications;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ByteAI.Core.Events;

public sealed class UserUnfollowedEventHandler(
    AppDbContext db,
    INotificationService notifications,
    ILogger<UserUnfollowedEventHandler> logger)
    : INotificationHandler<UserUnfollowedEvent>
{
    public async Task Handle(UserUnfollowedEvent notification, CancellationToken cancellationToken)
    {
        try
        {
            // Check if recipient wants unfollow notifications
            var prefs = await db.UserPreferences
                .FindAsync([notification.FollowingId], cancellationToken);
            if (prefs is not null && !prefs.NotifUnfollows) return;

            var actor = await db.Users
                .AsNoTracking()
                .Where(u => u.Id == notification.FollowerId)
                .Select(u => new { u.Username, u.DisplayName, u.AvatarUrl })
                .FirstOrDefaultAsync(cancellationToken);

            await notifications.CreateAsync(
                userId: notification.FollowingId,
                type: "unfollow",
                payload: new
                {
                    followerId = notification.FollowerId,
                    actorUsername = actor?.Username ?? string.Empty,
                    actorDisplayName = actor?.DisplayName ?? string.Empty,
                    actorAvatarUrl = actor?.AvatarUrl,
                },
                ct: cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to create unfollow notification for user {UserId}", notification.FollowingId);
        }
    }
}
