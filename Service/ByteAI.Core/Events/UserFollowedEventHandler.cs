using ByteAI.Core.Services.Badges;
using ByteAI.Core.Services.Notifications;
using MediatR;
using Microsoft.Extensions.Logging;

namespace ByteAI.Core.Events;

public sealed class UserFollowedEventHandler(
    INotificationService notifications,
    IBadgeService badgeService,
    ILogger<UserFollowedEventHandler> logger)
    : INotificationHandler<UserFollowedEvent>
{
    public async Task Handle(UserFollowedEvent notification, CancellationToken cancellationToken)
    {
        try
        {
            await notifications.CreateAsync(
                userId: notification.FollowingId,
                type: "follow",
                payload: new { followerId = notification.FollowerId },
                ct: cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to create follow notification for user {UserId}", notification.FollowingId);
        }

        try
        {
            await badgeService.CheckAndAwardAsync(notification.FollowingId, BadgeTrigger.FollowReceived, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Badge check failed after follow for user {UserId}", notification.FollowingId);
        }
    }
}
