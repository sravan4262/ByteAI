using ByteAI.Core.Commands.Bytes;
using ByteAI.Core.Infrastructure;

namespace ByteAI.Core.Business.Interfaces;

public interface IBookmarksBusiness
{
    Task<bool> ToggleBookmarkAsync(string supabaseUserId, Guid byteId, CancellationToken ct);
    Task<PagedResult<ByteResult>> GetMyBookmarksAsync(string supabaseUserId, int page, int pageSize, CancellationToken ct);
}
