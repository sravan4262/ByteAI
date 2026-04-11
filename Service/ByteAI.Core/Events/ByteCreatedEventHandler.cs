using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure.Cache;
using ByteAI.Core.Infrastructure.Persistence;
using ByteAI.Core.Services.AI;
using ByteAI.Core.Services.Badges;
using ByteAI.Core.Services.Bytes;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace ByteAI.Core.Events;

public sealed class ByteCreatedEventHandler(
    IEmbeddingService embedding,
    IGroqService groq,
    IByteService byteService,
    IBadgeService badgeService,
    IServiceScopeFactory scopeFactory,
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
        // Task.Run gets its own DI scope — the request scope is disposed by the time this runs.
        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                var allowedTags = await db.TechStacks
                    .Select(t => t.Name)
                    .ToListAsync(CancellationToken.None);

                var suggestedTags = await groq.SuggestTagsAsync(
                    notification.Title, notification.Body, notification.CodeSnippet, allowedTags, CancellationToken.None);

                if (suggestedTags.Count == 0) return;

                var techStacks = await db.TechStacks
                    .Where(t => suggestedTags.Contains(t.Name))
                    .ToListAsync(CancellationToken.None);

                if (techStacks.Count == 0) return;

                var existing = await db.ByteTechStacks
                    .Where(bt => bt.ByteId == notification.ByteId)
                    .Select(bt => bt.TechStackId)
                    .ToListAsync(CancellationToken.None);

                var toInsert = techStacks
                    .Where(t => !existing.Contains(t.Id))
                    .Select(t => new ByteTechStack { ByteId = notification.ByteId, TechStackId = t.Id })
                    .ToList();

                if (toInsert.Count > 0)
                {
                    db.ByteTechStacks.AddRange(toInsert);
                    await db.SaveChangesAsync(CancellationToken.None);
                    logger.LogInformation("Auto-tagged byte {ByteId} with {Count} tags: {Tags}",
                        notification.ByteId, toInsert.Count, string.Join(", ", suggestedTags));
                }
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Auto-tagging failed for byte {ByteId}", notification.ByteId);
            }
        });

        // ── 3. Quality scoring (Groq) ─────────────────────────────────────────
        _ = Task.Run(async () =>
        {
            try
            {
                var score = await groq.ScoreQualityAsync(notification.Title, notification.Body, CancellationToken.None);
                if (score is null) return;

                using var scope = scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                var existing = await db.ByteQualityScores.FindAsync([notification.ByteId]);
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

                await db.SaveChangesAsync(CancellationToken.None);
                logger.LogInformation("Quality score stored for byte {ByteId}: C={C} S={S} R={R} Overall={O}",
                    notification.ByteId, score.Clarity, score.Specificity, score.Relevance, score.Overall);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Quality scoring failed for byte {ByteId}", notification.ByteId);
            }
        });

        // ── 4. Badge checks for the author ───────────────────────────────────
        try
        {
            await badgeService.CheckAndAwardAsync(notification.AuthorId, BadgeTrigger.BytePosted, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Badge check failed after byte {ByteId} created", notification.ByteId);
        }

        // ── 5. Invalidate feed caches for author's followers ──────────────────
        if (feedCache is not null)
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

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
