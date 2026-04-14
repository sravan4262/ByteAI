using ByteAI.Core.Commands.Bytes;
using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;

namespace ByteAI.Core.Business.Interfaces;

public sealed record CreateByteResult(
    Guid Id,
    Guid AuthorId,
    string Title,
    string Body,
    string Type,
    DateTime CreatedAt);

public interface IBytesBusiness
{
    Task<PagedResult<ByteResult>> GetBytesAsync(int page, int pageSize, Guid? authorId, string sort, CancellationToken ct, string? clerkId = null);
    Task<ByteResult?> GetByteByIdAsync(Guid byteId, CancellationToken ct, string? clerkId = null);
    Task<CreateByteResult> CreateByteAsync(string clerkId, string title, string body, string? codeSnippet, string? language, string type, CancellationToken ct, bool force = false);
    Task<Byte> UpdateByteAsync(string clerkId, Guid byteId, string? title, string? body, string? codeSnippet, string? language, CancellationToken ct);
    Task<bool> DeleteByteAsync(string clerkId, Guid byteId, CancellationToken ct);
    Task<PagedResult<ByteResult>> GetMyBytesAsync(string clerkId, int page, int pageSize, CancellationToken ct);
}
