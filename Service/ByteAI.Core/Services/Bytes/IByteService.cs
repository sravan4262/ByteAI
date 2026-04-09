namespace ByteAI.Core.Services.Bytes;

public interface IByteService
{
    Task UpdateEmbeddingAsync(Guid byteId, float[] embedding, CancellationToken ct = default);
    Task UpdateTagsAsync(Guid byteId, List<string> tags, CancellationToken ct = default);
}
