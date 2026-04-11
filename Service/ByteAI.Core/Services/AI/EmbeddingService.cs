using ByteAI.Core.Infrastructure.AI;
using Pgvector;

namespace ByteAI.Core.Services.AI;

public sealed class EmbeddingService(OnnxEmbedder embedder) : IEmbeddingService
{
    public Task<float[]> EmbedDocumentAsync(string text, CancellationToken ct = default) =>
        Task.FromResult(embedder.EmbedDocument(text));

    public Task<float[]> EmbedQueryAsync(string text, CancellationToken ct = default) =>
        Task.FromResult(embedder.EmbedQuery(text));

    public async Task<Vector> EmbedDocumentAsVectorAsync(string text, CancellationToken ct = default) =>
        new(await EmbedDocumentAsync(text, ct));

    public async Task<Vector> EmbedQueryAsVectorAsync(string text, CancellationToken ct = default) =>
        new(await EmbedQueryAsync(text, ct));

    // Backward-compat — delegates to document embedding
    public Task<float[]> EmbedAsync(string text, CancellationToken ct = default) =>
        EmbedDocumentAsync(text, ct);

    public async Task<Vector> EmbedAsVectorAsync(string text, CancellationToken ct = default) =>
        new(await EmbedDocumentAsync(text, ct));
}
