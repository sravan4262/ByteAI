using ByteAI.Core.Infrastructure.Persistence;
using ByteAI.Core.Services.Badges;
using ByteAI.Core.Services.Notifications;
using ByteAI.Core.Services.Push;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ByteAI.Core.Events;

public sealed class UserFollowedEventHandler(
    AppDbContext db,
    INotificationService notifications,
    IBadgeService badgeService,
    IPushDispatcher pushDispatcher,
    ILogger<UserFollowedEventHandler> logger)
    : INotificationHandler<UserFollowedEvent>
{
    public async Task Handle(UserFollowedEvent notification, CancellationToken cancellationToken)
    {
        // ── 1. Award XP to the user who was followed ──────────────────────────
        await XpAwarder.AwardAsync(db, notification.FollowingId, "get_followed", logger, cancellationToken);

        try
        {
            // Respect notification preference
            var prefs = await db.UserPreferences.FindAsync([notification.FollowingId], cancellationToken);
            if (prefs is not null && !prefs.NotifFollowers) return;

            var actor = await db.Users
                .AsNoTracking()
                .Where(u => u.Id == notification.FollowerId)
                .Select(u => new { u.Username, u.DisplayName, u.AvatarUrl })
                .FirstOrDefaultAsync(cancellationToken);

            await notifications.CreateAsync(
                userId: notification.FollowingId,
                type: "follow",
                payload: new
                {
                    followerId = notification.FollowerId,
                    actorUsername = actor?.Username ?? string.Empty,
                    actorDisplayName = actor?.DisplayName ?? string.Empty,
                    actorAvatarUrl = actor?.AvatarUrl,
                },
                ct: cancellationToken);

            pushDispatcher.Enqueue(PushPayloads.Follow(
                recipientId: notification.FollowingId,
                actorDisplay: actor?.DisplayName ?? actor?.Username ?? "Someone"));
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
