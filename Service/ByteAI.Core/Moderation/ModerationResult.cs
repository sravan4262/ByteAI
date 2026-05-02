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
/// (e.g. tech-relevance only applied to Byte/Interview).</summary>
public enum ModerationContext
{
    Byte,
    Comment,
    Interview,
    Chat,
    Support,
    Profile
}
