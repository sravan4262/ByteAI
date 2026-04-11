using ByteAI.Core.Entities;
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
    IGroqService groq,
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
            var floats = await embedding.EmbedDocumentAsync(content, cancellationToken);
            await byteService.UpdateEmbeddingAsync(notification.ByteId, floats, cancellationToken);
            logger.LogInformation("Embedding stored for byte {ByteId}", notification.ByteId);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to generate embedding for byte {ByteId}", notification.ByteId);
        }

        // ── 2. Auto-tag extraction (Groq) ─────────────────────────────────────
        _ = Task.Run(async () =>
        {
            try
            {
                var suggestedTags = await groq.SuggestTagsAsync(
                    notification.Title, notification.Body, notification.CodeSnippet, cancellationToken);

                if (suggestedTags.Count == 0) return;

                // Match suggested tag names against TechStack records (case-insensitive)
                var techStacks = await db.TechStacks
                    .Where(t => suggestedTags.Contains(t.Name.ToLower()))
                    .ToListAsync(cancellationToken);

                if (techStacks.Count == 0) return;

                // Avoid duplicates if handler re-runs
                var existing = await db.ByteTechStacks
                    .Where(bt => bt.ByteId == notification.ByteId)
                    .Select(bt => bt.TechStackId)
                    .ToListAsync(cancellationToken);

                var toInsert = techStacks
                    .Where(t => !existing.Contains(t.Id))
                    .Select(t => new ByteTechStack { ByteId = notification.ByteId, TechStackId = t.Id })
                    .ToList();

                if (toInsert.Count > 0)
                {
                    db.ByteTechStacks.AddRange(toInsert);
                    await db.SaveChangesAsync(cancellationToken);
                    logger.LogInformation("Auto-tagged byte {ByteId} with {Count} tags: {Tags}",
                        notification.ByteId, toInsert.Count, string.Join(", ", suggestedTags));
                }
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Auto-tagging failed for byte {ByteId}", notification.ByteId);
            }
        }, cancellationToken);

        // ── 3. Quality scoring (Groq) ─────────────────────────────────────────
        _ = Task.Run(async () =>
        {
            try
            {
                var score = await groq.ScoreQualityAsync(notification.Title, notification.Body, cancellationToken);
                if (score is null) return;

                var existing = await db.ByteQualityScores.FindAsync([notification.ByteId], cancellationToken);
                if (existing is not null)
                {
                    existing.Clarity = score.Clarity;
                    existing.Specificity = score.Specificity;
                    existing.Relevance = score.Relevance;
                    existing.Overall = score.Overall;
                    existing.ComputedAt = DateTime.UtcNow;
                }
                else
                {
                    db.ByteQualityScores.Add(new Entities.ByteQualityScore
                    {
                        ByteId = notification.ByteId,
                        Clarity = score.Clarity,
                        Specificity = score.Specificity,
                        Relevance = score.Relevance,
                        Overall = score.Overall,
                        ComputedAt = DateTime.UtcNow
                    });
                }

                await db.SaveChangesAsync(cancellationToken);
                logger.LogInformation("Quality score stored for byte {ByteId}: C={C} S={S} R={R} Overall={O}",
                    notification.ByteId, score.Clarity, score.Specificity, score.Relevance, score.Overall);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Quality scoring failed for byte {ByteId}", notification.ByteId);
            }
        }, cancellationToken);

        // ── 4. Invalidate feed caches for author's followers ──────────────────
        if (feedCache is not null)
        {
            try
            {
                var followerIds = await db.Follows
                    .Where(f => f.FollowingId == notification.AuthorId)
                    .Select(f => f.FollowerId)
                    .ToListAsync(cancellationToken);

                foreach (var followerId in followerIds)
                    await feedCache.InvalidateAsync(followerId, cancellationToken);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to invalidate feed caches after byte {ByteId} created", notification.ByteId);
            }
        }
    }
}
