using ByteAI.Core.Infrastructure.Persistence;
using ByteAI.Core.Services.Moderation;
using ByteAI.Core.Services.Notifications;
using ByteAI.Core.Services.Push;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ByteAI.Core.Services.Mentions;

/// <summary>Surface that the @-mention happened in.</summary>
public sealed record MentionContext(string ContentType, Guid ContentId, string ContentSnippet);

public interface IMentionNotifier
{
    Task NotifyAsync(
        Guid authorId,
        string? content,
        MentionContext context,
        CancellationToken ct = default);
}

public sealed class MentionNotifier(
    AppDbContext db,
    IMentionExtractor extractor,
    IUserBlockService blockService,
    INotificationService notifications,
    IPushDispatcher pushDispatcher,
    ILogger<MentionNotifier> logger) : IMentionNotifier
{
    public async Task NotifyAsync(
        Guid authorId,
        string? content,
        MentionContext context,
        CancellationToken ct = default)
    {
        try
        {
            var usernames = extractor.Extract(content);
            if (usernames.Count == 0) return;

            // Resolve usernames → users in one query. Username comparison is
            // case-insensitive in Postgres only via lower(); store-side casing
            // is preserved, so lower-compare here too.
            var targets = await db.Users.AsNoTracking()
                .Where(u => usernames.Contains(u.Username.ToLower()))
                .Select(u => new { u.Id, Username = u.Username.ToLower(), u.DisplayName })
                .ToListAsync(ct);

            if (targets.Count == 0) return;

            var actor = await db.Users.AsNoTracking()
                .Where(u => u.Id == authorId)
                .Select(u => new { u.Username, u.DisplayName, u.AvatarUrl })
                .FirstOrDefaultAsync(ct);

            foreach (var target in targets)
            {
                if (target.Id == authorId) continue;

                if (await blockService.IsBlockedAsync(authorId, target.Id, ct))
                    continue;

                var prefs = await db.UserPreferences.FindAsync([target.Id], ct);
                if (prefs is not null && !prefs.NotifMentions) continue;

                await notifications.CreateAsync(
                    userId: target.Id,
                    type: "mention",
                    payload: new
                    {
                        contentType = context.ContentType,
                        contentId = context.ContentId,
                        snippet = context.ContentSnippet,
                        actorId = authorId,
                        actorUsername = actor?.Username ?? string.Empty,
                        actorDisplayName = actor?.DisplayName ?? string.Empty,
                        actorAvatarUrl = actor?.AvatarUrl,
                    },
                    ct: ct);

                pushDispatcher.Enqueue(PushPayloads.Mention(
                    recipientId: target.Id,
                    actorDisplay: actor?.DisplayName ?? actor?.Username ?? "Someone",
                    contentType: context.ContentType,
                    contentId: context.ContentId,
                    snippet: context.ContentSnippet));
            }
        }
        catch (Exception ex)
        {
            // Mentions never block the parent write — log and move on.
            logger.LogError(ex, "Mention notify failed for content {Type}/{Id}", context.ContentType, context.ContentId);
        }
    }
}
