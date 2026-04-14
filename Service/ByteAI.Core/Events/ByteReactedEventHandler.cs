using ByteAI.Core.Infrastructure.Persistence;
using ByteAI.Core.Services.Badges;
using ByteAI.Core.Services.Notifications;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ByteAI.Core.Events;

public sealed class ByteReactedEventHandler(
    AppDbContext db,
    IBadgeService badgeService,
    INotificationService notifications,
    ILogger<ByteReactedEventHandler> logger)
    : INotificationHandler<ByteReactedEvent>
{
    public async Task Handle(ByteReactedEvent notification, CancellationToken cancellationToken)
    {
        // ── 1. Award XP to the byte author ────────────────────────────────────
        await XpAwarder.AwardAsync(db, notification.AuthorUserId, "receive_reaction", logger, cancellationToken);

        try
        {

            // ── 2. Create notification for author (if reactions enabled) ──────
            var prefs = await db.UserPreferences.FindAsync([notification.AuthorUserId], cancellationToken);
            if (prefs is null || prefs.NotifReactions)
            {
                var actor = await db.Users
                    .AsNoTracking()
                    .Where(u => u.Id == notification.ReactorUserId)
                    .Select(u => new { u.Username, u.DisplayName, u.AvatarUrl })
                    .FirstOrDefaultAsync(cancellationToken);

                await notifications.CreateAsync(
                    userId: notification.AuthorUserId,
                    type: "like",
                    payload: new
                    {
                        byteId = notification.ByteId,
                        actorId = notification.ReactorUserId,
                        actorUsername = actor?.Username ?? string.Empty,
                        actorDisplayName = actor?.DisplayName ?? string.Empty,
                        actorAvatarUrl = actor?.AvatarUrl,
                        reactionType = notification.ReactionType
                    },
                    ct: cancellationToken);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to process reaction event for byte {ByteId}", notification.ByteId);
        }

        // ── 3. Badge check for the author ─────────────────────────────────────
        try
        {
            await badgeService.CheckAndAwardAsync(notification.AuthorUserId, BadgeTrigger.ReactionReceived, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Badge check failed after reaction on byte {ByteId}", notification.ByteId);
        }
    }
}
