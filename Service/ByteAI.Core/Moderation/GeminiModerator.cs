using ByteAI.Core.Services.AI;
using Microsoft.Extensions.Logging;

namespace ByteAI.Core.Moderation;

/// <summary>
/// LLM-based moderator backed by <see cref="ILlmService.ModerateContentAsync"/>.
/// Returns null-equivalent (Clean) on LLM failure; the composite layer decides what
/// to do about an unavailable LLM (lenient for bytes, strict for chat).
/// </summary>
public sealed class GeminiModerator(ILlmService llm, ILogger<GeminiModerator> logger) : IModerationService
{
    public async Task<ModerationResult> ModerateAsync(string text, ModerationContext context, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(text))
            return ModerationResult.Clean;

        var surface = context switch
        {
            ModerationContext.Byte                     => "byte",
            ModerationContext.Interview                => "interview",
            // The three comment variants share the same prompt context — Gemini's
            // tech-relevance gate is only applied to byte/interview surfaces, and
            // every comment-shaped surface gets the same "comment" treatment.
            ModerationContext.Comment                  => "comment",
            ModerationContext.InterviewComment         => "comment",
            ModerationContext.InterviewQuestionComment => "comment",
            ModerationContext.Chat                     => "chat",
            ModerationContext.Support                  => "support",
            ModerationContext.Profile                  => "profile",
            _                                          => "byte",
        };

        var llmResult = await llm.ModerateContentAsync(text, surface, ct);

        // null = LLM unavailable. Surface as a sentinel so the composite can decide
        // failure mode (fail-open for bytes, fail-closed for chat). We never throw here.
        if (llmResult is null)
        {
            logger.LogWarning("Moderation: Gemini unavailable for context={Context}", context);
            return new ModerationResult(
                IsClean: false,
                Severity: ModerationSeverity.None,
                Reasons: new[] { new ModerationReason("MODERATION_UNAVAILABLE", "Moderation service is temporarily unavailable.") });
        }

        if (llmResult.IsClean)
            return ModerationResult.Clean;

        // Every reason the model returns is treated as blocking — the prompt instructs
        // the model not to emit advisory-only signals.
        var reasons = llmResult.Reasons
            .Select(r => new ModerationReason(r.Code, r.Message))
            .ToList();

        return new ModerationResult(
            IsClean: false,
            Severity: ModerationSeverity.High,
            Reasons: reasons);
    }
}
