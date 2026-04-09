using Pgvector;

namespace ByteAI.Core.Services.Search;

public interface ISearchService
{
    /// <summary>
    /// Hybrid search: full-text (tsvector) + pgvector cosine distance,
    /// merged via Reciprocal Rank Fusion. Returns top <paramref name="limit"/> bytes.
    /// </summary>
    Task<List<Entities.Byte>> SearchBytesAsync(string query, Vector? queryEmbedding, int limit, CancellationToken ct = default);
}
