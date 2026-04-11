namespace ByteAI.Core.Services.AI;

public sealed record QualityScore(int Clarity, int Specificity, int Relevance)
{
    public int Overall => (Clarity + Specificity + Relevance) / 3;
}

/// <summary>Result of the Groq-based tech-relevance classification (Stage 3 of content validation).</summary>
public sealed record ContentValidationResult(bool IsTechRelated, bool IsCoherent, string Reason);

/// <summary>A single retrieved passage fed into the RAG context window.</summary>
public sealed record RagPassage(string Title, string Body, string? SourceId = null);

public interface IGroqService
{
    /// <summary>Returns up to 5 tag suggestions for a byte's content.</summary>
    Task<List<string>> SuggestTagsAsync(string title, string body, string? codeSnippet, CancellationToken ct = default);

    /// <summary>Scores a byte's quality on clarity, specificity and relevance (1–10 each).</summary>
    Task<QualityScore?> ScoreQualityAsync(string title, string body, CancellationToken ct = default);

    /// <summary>
    /// RAG answer: synthesises a response from multiple retrieved content passages.
    /// Each passage is a (title, body) pair from bytes or interviews.
    /// </summary>
    Task<string> RagAnswerAsync(string question, IReadOnlyList<RagPassage> passages, CancellationToken ct = default);

    /// <summary>Answers a user question given optional context passages.</summary>
    Task<string> AskAsync(string question, string? context, CancellationToken ct = default);

    /// <summary>
    /// Stage 3 of content validation: Groq classifies whether the content is tech-related and coherent.
    /// Returns null on Groq failure — callers must fail open (pass) when null.
    /// Only called for borderline content (embedding similarity 0.20–0.30).
    /// </summary>
    Task<ContentValidationResult?> ValidateTechContentAsync(string title, string body, CancellationToken ct = default);
}
