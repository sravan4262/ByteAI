namespace ByteAI.Core.Services.AI;

public sealed record QualityScore(int Clarity, int Specificity, int Relevance)
{
    public int Overall => (Clarity + Specificity + Relevance) / 3;
}

/// <summary>A tag suggestion including its classified subdomain.</summary>
public sealed record TagSuggestion(string Tag, string Subdomain);

/// <summary>Result of the LLM-based tech-relevance classification (Stage 3 of content validation).</summary>
public sealed record ContentValidationResult(bool IsTechRelated, bool IsCoherent, string Reason);

/// <summary>A single retrieved passage fed into the RAG context window.</summary>
public sealed record RagPassage(string Title, string Body, string? SourceId = null);

public interface ILlmService
{
    /// <summary>
    /// Suggests up to 5 tech stack tags for the byte content, ranked most to least relevant.
    /// Each result includes the tag name (snake_case) and the subdomain it belongs to.
    /// May suggest tags that do not yet exist in the database — callers are responsible for upsert.
    /// </summary>
    Task<List<TagSuggestion>> SuggestTagsAsync(string title, string body, string? codeSnippet, CancellationToken ct = default);

    /// <summary>Scores a byte's quality on clarity, specificity and relevance (1–10 each).</summary>
    Task<QualityScore?> ScoreQualityAsync(string title, string body, CancellationToken ct = default);

    /// <summary>
    /// RAG answer: synthesises a response from multiple retrieved content passages.
    /// Each passage is a (title, body) pair from bytes or interviews.
    /// </summary>
    Task<string> RagAnswerAsync(string question, IReadOnlyList<RagPassage> passages, CancellationToken ct = default);

    /// <summary>
    /// Streaming variant of <see cref="RagAnswerAsync"/>. Yields content deltas as the LLM produces them,
    /// so the UI can render tokens with sub-second perceived latency instead of waiting for the full reply.
    /// </summary>
    IAsyncEnumerable<string> RagAnswerStreamAsync(string question, IReadOnlyList<RagPassage> passages, CancellationToken ct = default);

    /// <summary>Answers a user question given optional context passages.</summary>
    Task<string> AskAsync(string question, string? context, CancellationToken ct = default);

    /// <summary>
    /// Stage 3 of content validation: classifies whether the content is tech-related and coherent.
    /// Returns null on LLM failure — callers must fail open (pass) when null.
    /// </summary>
    Task<ContentValidationResult?> ValidateTechContentAsync(string title, string body, CancellationToken ct = default);

    /// <summary>Formats code in the given language. Returns null if the LLM is unavailable.</summary>
    Task<string?> FormatCodeAsync(string code, string language, CancellationToken ct = default);
}
