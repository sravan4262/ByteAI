using ByteAI.Core.Infrastructure.Persistence;
using ByteAI.Core.Services.Notifications;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ByteAI.Core.Events;

public sealed class ByteReactedEventHandler(
    AppDbContext db,
    INotificationService notifications,
    ILogger<ByteReactedEventHandler> logger)
    : INotificationHandler<ByteReactedEvent>
{
    private const int XpPerLike = 5;

    public async Task Handle(ByteReactedEvent notification, CancellationToken cancellationToken)
    {
        // ── 1. Award XP to the byte author ────────────────────────────────────
        try
        {
            if (notification.AuthorUserId != notification.ReactorUserId)
            {
                var author = await db.Users.FindAsync([notification.AuthorUserId], cancellationToken);
                if (author is not null)
                {
                    author.Xp += XpPerLike;
                    await db.SaveChangesAsync(cancellationToken);
                    logger.LogDebug("Awarded {Xp} XP to user {UserId}", XpPerLike, author.Id);
                }

                // ── 2. Create notification for author ─────────────────────────
                await notifications.CreateAsync(
                    userId: notification.AuthorUserId,
                    type: "reaction",
                    payload: new
                    {
                        byteId = notification.ByteId,
                        reactorId = notification.ReactorUserId,
                        reactionType = notification.ReactionType
                    },
                    ct: cancellationToken);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to process reaction event for byte {ByteId}", notification.ByteId);
        }
    }
}
