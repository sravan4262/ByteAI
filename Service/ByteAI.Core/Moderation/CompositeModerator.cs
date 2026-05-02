using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ByteAI.Core.Moderation;

/// <summary>
/// Default <see cref="IModerationService"/>. Pipeline:
///   1. <see cref="Layer1Moderator"/> — cheap deterministic checks (profanity, PII, URL spam,
///      gibberish heuristic). On High severity we short-circuit and skip the LLM call.
///   2. <see cref="GeminiModerator"/> — LLM-based unified moderator covering toxicity, harassment,
///      hate, sexual, harm, off-topic, prompt-injection, etc.
///
/// LLM failure handling depends on the context:
///   - Chat: fail closed (block) — DM safety matters more than convenience.
///   - Everything else: fail open (allow with a warning log) — Layer 1 still catches obvious
///     issues; transient LLM downtime should not block the platform.
/// </summary>
public sealed class CompositeModerator(
    Layer1Moderator layer1,
    GeminiModerator gemini,
    IOptions<ModerationOptions> options,
    ILogger<CompositeModerator> logger) : IModerationService
{
    public async Task<ModerationResult> ModerateAsync(string text, ModerationContext context, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(text))
            return ModerationResult.Clean;

        var l1 = await layer1.ModerateAsync(text, context, ct);

        if (!l1.IsClean && l1.Severity >= ModerationSeverity.High)
        {
            logger.LogInformation(
                "Moderation: Layer 1 short-circuit (severity={Severity}, codes={Codes})",
                l1.Severity,
                string.Join(",", l1.Reasons.Select(r => r.Code)));
            return l1;
        }

        if (!options.Value.EnableLlm)
        {
            return l1.IsClean ? ModerationResult.Clean : l1;
        }

        var llm = await gemini.ModerateAsync(text, context, ct);

        // GeminiModerator returns a sentinel "MODERATION_UNAVAILABLE" reason on LLM failure.
        var llmUnavailable = !llm.IsClean
            && llm.Reasons.Count == 1
            && llm.Reasons[0].Code == "MODERATION_UNAVAILABLE";

        if (llmUnavailable)
        {
            if (context == ModerationContext.Chat)
            {
                // Fail closed for chat — return the unavailable result as High severity.
                return new ModerationResult(
                    IsClean: false,
                    Severity: ModerationSeverity.High,
                    Reasons: llm.Reasons);
            }

            // Fail open for every other surface — Layer 1 outcome is the verdict.
            logger.LogWarning(
                "Moderation: LLM unavailable on context={Context}; falling back to Layer 1 verdict (clean={Clean})",
                context, l1.IsClean);
            return l1.IsClean ? ModerationResult.Clean : l1;
        }

        if (l1.IsClean && llm.IsClean)
            return ModerationResult.Clean;

        var combined = new List<ModerationReason>();
        combined.AddRange(l1.Reasons);
        combined.AddRange(llm.Reasons);

        var severity = (ModerationSeverity)Math.Max((int)l1.Severity, (int)llm.Severity);
        return new ModerationResult(IsClean: false, severity, combined);
    }
}
