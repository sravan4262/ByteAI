using ByteAI.Core.Services.Notifications;
using MediatR;
using Microsoft.Extensions.Logging;

namespace ByteAI.Core.Events;

public sealed class UserFollowedEventHandler(
    INotificationService notifications,
    ILogger<UserFollowedEventHandler> logger)
    : INotificationHandler<UserFollowedEvent>
{
    public async Task Handle(UserFollowedEvent notification, CancellationToken cancellationToken)
    {
        try
        {
            await notifications.CreateAsync(
                userId: notification.FollowingId, // the user who got followed receives the notification
                type: "follow",
                payload: new { followerId = notification.FollowerId },
                ct: cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to create follow notification for user {UserId}", notification.FollowingId);
        }
    }
}
