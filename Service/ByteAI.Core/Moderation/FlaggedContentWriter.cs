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
    // Cap stored excerpts to keep moderation.flagged_content rows tight even if
    // a future surface allows much longer bodies. Triage UI shows the excerpt
    // verbatim — anything over this is rare and the row's source content_id
    // can be used to fetch the full text.
    private const int MaxExcerptLength = 500;

    public static async Task RecordAsync(
        AppDbContext db,
        ModerationContext context,
        Guid? contentId,
        ModerationResult result,
        CancellationToken ct,
        Guid? authorId = null,
        string? text = null)
    {
        if (result.IsClean) return;

        var excerpt = BuildExcerpt(text);

        foreach (var reason in result.Reasons)
        {
            db.Set<FlaggedContent>().Add(new FlaggedContent
            {
                ContentType = ToContentType(context),
                ContentId = contentId ?? Guid.Empty,
                ReporterUserId = null, // system-flagged
                ContentAuthorId = authorId,
                ReasonCode = reason.Code,
                ReasonMessage = reason.Message,
                Severity = ToSeverityString(result.Severity),
                Status = "open",
                Score = reason.Score,
                Metadata = JsonSerializer.Serialize(new
                {
                    autoFlag = true,
                    severity = result.Severity.ToString(),
                    excerpt,
                }),
                CreatedAt = DateTime.UtcNow,
            });
        }

        await db.SaveChangesAsync(ct);
    }

    public static string ToContentType(ModerationContext context) => context switch
    {
        ModerationContext.Byte                     => "byte",
        ModerationContext.Comment                  => "comment",
        ModerationContext.InterviewComment         => "interview_comment",
        ModerationContext.InterviewQuestionComment => "interview_question_comment",
        ModerationContext.Interview                => "interview",
        ModerationContext.Chat                     => "chat",
        ModerationContext.Support                  => "support",
        ModerationContext.Profile                  => "profile",
        _                                          => "unknown",
    };

    public static string ToSeverityString(ModerationSeverity s) => s switch
    {
        ModerationSeverity.Low    => "low",
        ModerationSeverity.Medium => "medium",
        ModerationSeverity.High   => "high",
        _                         => "low",
    };

    private static string? BuildExcerpt(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return null;
        var trimmed = text.Trim();
        return trimmed.Length <= MaxExcerptLength
            ? trimmed
            : trimmed[..MaxExcerptLength] + "…";
    }
}
