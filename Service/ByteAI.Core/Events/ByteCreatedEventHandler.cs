using ByteAI.Core.Entities;
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
    AppDbContext db,
    IEmbeddingService embedding,
    IGroqService groq,
    IByteService byteService,
    IBadgeService badgeService,
    IServiceScopeFactory scopeFactory,
    ILogger<ByteCreatedEventHandler> logger)
    : INotificationHandler<ByteCreatedEvent>
{
    public async Task Handle(ByteCreatedEvent notification, CancellationToken cancellationToken)
    {
        var content = notification.Title + " " + notification.Body;

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
                var suggestions = await groq.SuggestTagsAsync(
                    notification.Title, notification.Body, notification.CodeSnippet, CancellationToken.None);

                if (suggestions.Count == 0) return;

                // Take the most relevant suggestion only
                var top = suggestions[0];

                using var scope = scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                // Find existing tech stack (case-insensitive)
                var techStack = await db.TechStacks
                    .FirstOrDefaultAsync(t => t.Name.Equals(top.Tag, StringComparison.OrdinalIgnoreCase), CancellationToken.None);

                if (techStack is null)
                {
                    // Auto-create the tech stack under the Groq-classified subdomain
                    var subdomain = await db.SubDomains
                        .FirstOrDefaultAsync(s => s.Name == top.Subdomain, CancellationToken.None);

                    if (subdomain is null)
                    {
                        logger.LogWarning("Unknown subdomain '{Subdomain}' suggested by Groq for tag '{Tag}'. Skipping.", top.Subdomain, top.Tag);
                        return;
                    }

                    techStack = new TechStack
                    {
                        SubdomainId = subdomain.Id,
                        Name = top.Tag,
                        Label = System.Globalization.CultureInfo.CurrentCulture.TextInfo.ToTitleCase(top.Tag.Replace('_', ' ')),
                        SortOrder = 0
                    };
                    db.TechStacks.Add(techStack);
                    await db.SaveChangesAsync(CancellationToken.None);
                    logger.LogInformation("Auto-created tech stack '{Tag}' under subdomain '{Subdomain}'", top.Tag, top.Subdomain);
                }

                var alreadyLinked = await db.ByteTechStacks
                    .AnyAsync(bt => bt.ByteId == notification.ByteId && bt.TechStackId == techStack.Id, CancellationToken.None);

                if (!alreadyLinked)
                {
                    db.ByteTechStacks.Add(new ByteTechStack { ByteId = notification.ByteId, TechStackId = techStack.Id });
                    await db.SaveChangesAsync(CancellationToken.None);
                    logger.LogInformation("Auto-tagged byte {ByteId} with '{Tag}'", notification.ByteId, top.Tag);
                }
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Auto-tagging failed for byte {ByteId}", notification.ByteId);
            }
        }, CancellationToken.None);

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

        // ── 4. Award XP to the author ────────────────────────────────────────
        await XpAwarder.AwardAsync(db, notification.AuthorId, "post_byte", logger, cancellationToken);
        // One-time bonus for first ever byte (XpAwarder guards against double-award)
        await XpAwarder.AwardAsync(db, notification.AuthorId, "first_byte", logger, cancellationToken);

        // ── 5. Badge checks for the author ───────────────────────────────────
        try
        {
            await badgeService.CheckAndAwardAsync(notification.AuthorId, BadgeTrigger.BytePosted, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Badge check failed after byte {ByteId} created", notification.ByteId);
        }
    }
}
