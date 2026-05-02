namespace ByteAI.Core.Moderation;

/// <summary>
/// Thrown when content is rejected by the moderation pipeline.
/// Caller (controller / hub) is responsible for surfacing as HTTP 422.
/// </summary>
public sealed class ContentModerationException : Exception
{
    public IReadOnlyList<ModerationReason> Reasons { get; }
    public ModerationSeverity Severity { get; }

    public ContentModerationException(ModerationResult result)
        : base("Content failed moderation.")
    {
        Reasons = result.Reasons;
        Severity = result.Severity;
    }
}
