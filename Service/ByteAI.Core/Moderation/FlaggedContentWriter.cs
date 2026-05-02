using System.Text.Json;
using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure.Persistence;

namespace ByteAI.Core.Moderation;

/// <summary>
/// Helpers for writing rows into moderation.flagged_content. Centralised so the
/// pipeline behaviour, controllers and the user-report endpoint all produce
/// consistent rows (same content_type strings, same severity casing, etc.).
/// </summary>
public static class FlaggedContentWriter
{
    public static async Task RecordAsync(
        AppDbContext db,
        ModerationContext context,
        Guid? contentId,
        ModerationResult result,
        CancellationToken ct)
    {
        if (result.IsClean) return;

        foreach (var reason in result.Reasons)
        {
            db.Set<FlaggedContent>().Add(new FlaggedContent
            {
                ContentType = ToContentType(context),
                ContentId = contentId ?? Guid.Empty,
                ReporterUserId = null, // system-flagged
                ReasonCode = reason.Code,
                ReasonMessage = reason.Message,
                Severity = ToSeverityString(result.Severity),
                Status = "open",
                Score = reason.Score,
                Metadata = JsonSerializer.Serialize(new
                {
                    autoFlag = true,
                    severity = result.Severity.ToString(),
                }),
                CreatedAt = DateTime.UtcNow,
            });
        }

        await db.SaveChangesAsync(ct);
    }

    public static string ToContentType(ModerationContext context) => context switch
    {
        ModerationContext.Byte      => "byte",
        ModerationContext.Comment   => "comment",
        ModerationContext.Interview => "interview",
        ModerationContext.Chat      => "chat",
        ModerationContext.Support   => "support",
        ModerationContext.Profile   => "profile",
        _                           => "unknown",
    };

    public static string ToSeverityString(ModerationSeverity s) => s switch
    {
        ModerationSeverity.Low    => "low",
        ModerationSeverity.Medium => "medium",
        ModerationSeverity.High   => "high",
        _                         => "low",
    };
}
