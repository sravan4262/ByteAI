using Pgvector;

namespace ByteAI.Core.Services.AI;

public interface IEmbeddingService
{
    Task<float[]> EmbedAsync(string text, CancellationToken ct = default);
    Task<Vector> EmbedAsVectorAsync(string text, CancellationToken ct = default);
}
