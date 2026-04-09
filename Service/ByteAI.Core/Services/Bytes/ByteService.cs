using ByteAI.Core.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Pgvector;

namespace ByteAI.Core.Services.Bytes;

public sealed class ByteService(AppDbContext db) : IByteService
{
    public async Task UpdateEmbeddingAsync(Guid byteId, float[] embedding, CancellationToken ct = default)
    {
        var entity = await db.Bytes.FindAsync([byteId], ct);
        if (entity is null) return;

        entity.Embedding = new Vector(embedding);
        await db.SaveChangesAsync(ct);
    }

    public async Task UpdateTagsAsync(Guid byteId, List<string> tags, CancellationToken ct = default)
    {
        var entity = await db.Bytes.FindAsync([byteId], ct);
        if (entity is null) return;

        // Merge AI-suggested tags with any existing author tags (deduplicated)
        entity.Tags = entity.Tags.Union(tags, StringComparer.OrdinalIgnoreCase).ToList();
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
    }
}
