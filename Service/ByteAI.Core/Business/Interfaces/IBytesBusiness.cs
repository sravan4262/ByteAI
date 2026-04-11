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
    Task<PagedResult<ByteResult>> GetBytesAsync(int page, int pageSize, Guid? authorId, string sort, CancellationToken ct);
    Task<ByteResult?> GetByteByIdAsync(Guid byteId, CancellationToken ct);
    Task<CreateByteResult> CreateByteAsync(string clerkId, string title, string body, string? codeSnippet, string? language, string type, CancellationToken ct);
    Task<Byte> UpdateByteAsync(string clerkId, Guid byteId, string? title, string? body, string? codeSnippet, string? language, CancellationToken ct);
    Task<bool> DeleteByteAsync(string clerkId, Guid byteId, CancellationToken ct);
    Task<PagedResult<ByteResult>> GetMyBytesAsync(string clerkId, int page, int pageSize, CancellationToken ct);
}
