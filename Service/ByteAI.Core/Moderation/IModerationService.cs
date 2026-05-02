namespace ByteAI.Core.Moderation;

/// <summary>
/// Pluggable moderation contract. Implementations may run deterministic checks
/// (Layer 1), ML-based toxicity scoring (Layer 2), or a composite of both.
/// </summary>
public interface IModerationService
{
    Task<ModerationResult> ModerateAsync(string text, ModerationContext context, CancellationToken ct = default);
}
