using ByteAI.Core.Infrastructure.Persistence;

namespace ByteAI.Core.Moderation;

/// <summary>
/// Convenience helpers used by controllers and the SignalR chat hub. Performs the
/// usual moderation flow:
///   - High severity → throw <see cref="ContentModerationException"/> (caller / middleware
///     translates to HTTP 422).
///   - Medium severity → write a flagged_content row for moderator review and return
///     the result so the caller can decide to allow the request through.
///   - Otherwise return the (clean) result.
/// </summary>
public static class ModerationServiceExtensions
{
    /// <summary>
    /// Runs moderation and (a) records a flag row then blocks on High by throwing,
    /// (b) records a flag row on Medium without throwing, (c) does nothing on clean content.
    /// Pass <paramref name="authorId"/> (internal user Guid) so flag rows are attributed to
    /// the content author — required for the admin at-risk user watchlist. The original
    /// <paramref name="text"/> is also persisted as a 500-char excerpt under metadata.excerpt
    /// so the triage UI can show the offending content without a fan-out join.
    /// </summary>
    public static async Task<ModerationResult> EnforceAsync(
        this IModerationService moderation,
        AppDbContext db,
        string text,
        ModerationContext context,
        Guid? contentId = null,
        Guid? authorId = null,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(text))
            return ModerationResult.Clean;

        var result = await moderation.ModerateAsync(text, context, ct);

        if (!result.IsClean && result.Severity >= ModerationSeverity.High)
        {
            // Write the flag row before throwing so high-severity violations are visible
            // in the admin watchlist even though the content was never saved.
            try
            {
                await FlaggedContentWriter.RecordAsync(db, context, contentId, result, ct, authorId, text);
            }
            catch
            {
                // Flag recording must never prevent the exception from propagating.
            }
            throw new ContentModerationException(result);
        }

        if (!result.IsClean && result.Severity == ModerationSeverity.Medium)
        {
            try
            {
                await FlaggedContentWriter.RecordAsync(db, context, contentId, result, ct, authorId, text);
            }
            catch
            {
                // Recording a flag must not break content submission.
            }
        }

        return result;
    }
}
