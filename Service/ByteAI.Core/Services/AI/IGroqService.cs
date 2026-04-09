namespace ByteAI.Core.Services.AI;

public interface IGroqService
{
    /// <summary>Returns up to 5 tag suggestions for a byte's content.</summary>
    Task<List<string>> SuggestTagsAsync(string title, string body, string? codeSnippet, CancellationToken ct = default);

    /// <summary>Answers a user question given optional context passages.</summary>
    Task<string> AskAsync(string question, string? context, CancellationToken ct = default);
}
