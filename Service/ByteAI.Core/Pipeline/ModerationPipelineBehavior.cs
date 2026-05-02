using ByteAI.Core.Infrastructure.Persistence;
using ByteAI.Core.Moderation;
using MediatR;
using Microsoft.Extensions.Logging;

namespace ByteAI.Core.Pipeline;

/// <summary>
/// MediatR pipeline behaviour that runs the moderation service on any request implementing
/// <see cref="IModeratableCommand"/>:
///   - High severity → throw <see cref="ContentModerationException"/> (the controller / hub
///     translates this to HTTP 422 / hub error).
///   - Medium severity → record a flagged_content row for moderator review and let the
///     request continue.
///   - None / Low → pass through.
///
/// The behaviour is registered open-generic so it applies to every IRequest&lt;T&gt;; only
/// commands that opt in via the marker interface incur the moderation cost.
/// </summary>
public sealed class ModerationPipelineBehavior<TRequest, TResponse>(
    IModerationService moderation,
    AppDbContext db,
    ILogger<ModerationPipelineBehavior<TRequest, TResponse>> logger)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken ct)
    {
        if (request is not IModeratableCommand cmd)
            return await next();

        var text = cmd.GetTextForModeration();
        if (string.IsNullOrWhiteSpace(text))
            return await next();

        var result = await moderation.ModerateAsync(text, cmd.ModerationContext, ct);

        if (!result.IsClean && result.Severity >= ModerationSeverity.High)
        {
            logger.LogWarning(
                "Moderation pipeline rejected {RequestType}: codes={Codes}",
                typeof(TRequest).Name,
                string.Join(",", result.Reasons.Select(r => r.Code)));
            throw new ContentModerationException(result);
        }

        if (!result.IsClean && result.Severity == ModerationSeverity.Medium)
        {
            // Auto-flag for moderator review. Failures here must NOT block the request.
            try
            {
                await FlaggedContentWriter.RecordAsync(db, cmd.ModerationContext, contentId: null, result, ct);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to record auto-flag for {RequestType}", typeof(TRequest).Name);
            }
        }

        return await next();
    }
}
