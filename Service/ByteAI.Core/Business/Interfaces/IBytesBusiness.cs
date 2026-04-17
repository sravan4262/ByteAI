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
    Task<PagedResult<ByteResult>> GetBytesAsync(int page, int pageSize, Guid? authorId, string sort, CancellationToken ct, string? supabaseUserId = null);
    Task<ByteResult?> GetByteByIdAsync(Guid byteId, CancellationToken ct, string? supabaseUserId = null);
    Task<CreateByteResult> CreateByteAsync(string supabaseUserId, string title, string body, string? codeSnippet, string? language, string type, CancellationToken ct, bool force = false);
    Task<Byte> UpdateByteAsync(string supabaseUserId, Guid byteId, string? title, string? body, string? codeSnippet, string? language, CancellationToken ct);
    Task<bool> DeleteByteAsync(string supabaseUserId, Guid byteId, CancellationToken ct);
    Task<PagedResult<ByteResult>> GetMyBytesAsync(string supabaseUserId, int page, int pageSize, CancellationToken ct);
}
