using Pgvector;

namespace ByteAI.Core.Services.AI;

public interface IEmbeddingService
{
    /// <summary>Embed content for storage (bytes, interviews, user interests). Applies document prefix.</summary>
    Task<float[]> EmbedDocumentAsync(string text, CancellationToken ct = default);

    /// <summary>Embed a search query or duplicate-check input. Applies query prefix.</summary>
    Task<float[]> EmbedQueryAsync(string text, CancellationToken ct = default);

    /// <summary>Embed as a pgvector Vector (document). Convenience wrapper.</summary>
    Task<Vector> EmbedDocumentAsVectorAsync(string text, CancellationToken ct = default);

    /// <summary>Embed as a pgvector Vector (query). Convenience wrapper.</summary>
    Task<Vector> EmbedQueryAsVectorAsync(string text, CancellationToken ct = default);

    // Kept for backward compatibility — delegates to EmbedDocumentAsync
    Task<float[]> EmbedAsync(string text, CancellationToken ct = default);
    Task<Vector>  EmbedAsVectorAsync(string text, CancellationToken ct = default);
}
