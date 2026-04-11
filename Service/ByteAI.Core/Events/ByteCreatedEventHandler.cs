using ByteAI.Core.Infrastructure.Cache;
using ByteAI.Core.Infrastructure.Persistence;
using ByteAI.Core.Services.AI;
using ByteAI.Core.Services.Bytes;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ByteAI.Core.Events;

public sealed class ByteCreatedEventHandler(
    IEmbeddingService embedding,
    IByteService byteService,
    AppDbContext db,
    RedisFeedCache? feedCache,
    ILogger<ByteCreatedEventHandler> logger)
    : INotificationHandler<ByteCreatedEvent>
{
    public async Task Handle(ByteCreatedEvent notification, CancellationToken cancellationToken)
    {
        var content = notification.Body +
            (string.IsNullOrEmpty(notification.CodeSnippet) ? "" : $"\n{notification.CodeSnippet}");

        // ── 1. Generate and store embedding ───────────────────────────────────
        try
        {
            var floats = await embedding.EmbedAsync(content, cancellationToken);
            await byteService.UpdateEmbeddingAsync(notification.ByteId, floats, cancellationToken);
            logger.LogInformation("Embedding stored for byte {ByteId}", notification.ByteId);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to generate embedding for byte {ByteId}", notification.ByteId);
        }

        // ── 2. Invalidate feed caches for author's followers ──────────────────
        if (feedCache is not null)
        {
            try
            {
                var byte_ = await db.Bytes
                    .AsNoTracking()
                    .Where(b => b.Id == notification.ByteId)
                    .Select(b => new { b.AuthorId })
                    .FirstOrDefaultAsync(cancellationToken);

                if (byte_ is not null)
                {
                    var followerIds = await db.Follows
                        .Where(f => f.FollowingId == byte_.AuthorId)
                        .Select(f => f.FollowerId)
                        .ToListAsync(cancellationToken);

                    foreach (var followerId in followerIds)
                        await feedCache.InvalidateAsync(followerId, cancellationToken);
                }
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to invalidate feed caches after byte {ByteId} created", notification.ByteId);
            }
        }
    }
}
