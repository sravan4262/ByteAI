using ByteAI.Core.Commands.Bytes;
using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;

namespace ByteAI.Core.Services.Bytes;

public interface IByteService
{
    Task UpdateEmbeddingAsync(Guid byteId, float[] embedding, CancellationToken ct = default);
    Task<PagedResult<ByteResult>> GetBytesAsync(PaginationParams pagination, Guid? authorId, string sort, CancellationToken ct);
    Task<ByteResult?> GetByteByIdAsync(Guid byteId, CancellationToken ct);
    Task<ByteResult> CreateByteAsync(Guid authorId, string title, string body, string? codeSnippet, string? language, string type, CancellationToken ct, bool force = false);
    Task<Byte> UpdateByteAsync(Guid byteId, Guid authorId, string? title, string? body, string? codeSnippet, string? language, CancellationToken ct);
    Task<bool> DeleteByteAsync(Guid byteId, Guid authorId, CancellationToken ct);
    Task<PagedResult<ByteResult>> GetMyBytesAsync(Guid authorId, PaginationParams pagination, CancellationToken ct);
}
