using Pgvector;

namespace ByteAI.Core.Services.Search;

public interface ISearchService
{
    /// <summary>
    /// Hybrid search: full-text (tsvector) + pgvector cosine distance,
    /// merged via Reciprocal Rank Fusion. Returns top <paramref name="limit"/> bytes.
    /// </summary>
    Task<List<Entities.Byte>> SearchBytesAsync(string query, Vector? queryEmbedding, int limit, CancellationToken ct = default, Guid? requesterId = null);

    /// <summary>
    /// Same hybrid RRF search but against the interviews table.
    /// </summary>
    Task<List<Entities.Interview>> SearchInterviewsAsync(string query, Vector? queryEmbedding, int limit, CancellationToken ct = default, Guid? requesterId = null);

    /// <summary>
    /// Simple username/display-name LIKE search against users table.
    /// </summary>
    Task<List<Entities.User>> SearchPeopleAsync(string query, int limit, CancellationToken ct = default, Guid? requesterId = null);
}
