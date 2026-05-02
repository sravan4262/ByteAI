namespace ByteAI.Core.Moderation;

/// <summary>
/// Bound from the "Moderation" config section. All values have safe defaults so
/// the system runs even if the section is absent.
/// </summary>
public sealed class ModerationOptions
{
    /// <summary>Master switch for the LLM-backed moderator (Gemini). When false, only the
    /// deterministic Layer 1 checks run — useful for local dev or when the LLM key is missing.</summary>
    public bool EnableLlm { get; init; } = true;
}
