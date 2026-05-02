namespace ByteAI.Core.Moderation;

/// <summary>Outcome of a moderation pass over a single text payload.</summary>
public sealed record ModerationResult(
    bool IsClean,
    ModerationSeverity Severity,
    IReadOnlyList<ModerationReason> Reasons)
{
    public static ModerationResult Clean { get; } =
        new(true, ModerationSeverity.None, Array.Empty<ModerationReason>());
}

public enum ModerationSeverity { None = 0, Low = 1, Medium = 2, High = 3 }

public sealed record ModerationReason(string Code, string Message)
{
    /// <summary>Optional confidence/score 0-1 (mostly populated by Layer 2).</summary>
    public double? Score { get; init; }
}

/// <summary>Type of content being moderated. Drives context-specific rules
/// (e.g. tech-relevance only applied to Byte/Interview) AND the content_type
/// string written into flagged_content rows — so the admin triage UI can
/// route a "Remove" action to the correct source table.
///
/// Comments are split into three variants because they live in three different
/// tables (bytes.comments / interviews.interview_comments /
/// interviews.interview_question_comments). Without this distinction the
/// triage flow couldn't tell which table to delete from.</summary>
public enum ModerationContext
{
    Byte,
    Comment,                    // bytes.comments
    InterviewComment,           // interviews.interview_comments (top-level interview comment)
    InterviewQuestionComment,   // interviews.interview_question_comments (per-question Q&A comment)
    Interview,
    Chat,
    Support,
    Profile
}
