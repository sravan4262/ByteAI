using ByteAI.Core.Infrastructure.AI;
using Pgvector;

namespace ByteAI.Core.Services.AI;

public sealed class EmbeddingService(OnnxEmbedder embedder) : IEmbeddingService
{
    public Task<float[]> EmbedAsync(string text, CancellationToken ct = default)
    {
        var embedding = embedder.Embed(text);
        return Task.FromResult(embedding);
    }

    public async Task<Vector> EmbedAsVectorAsync(string text, CancellationToken ct = default)
    {
        var floats = await EmbedAsync(text, ct);
        return new Vector(floats);
    }
}
