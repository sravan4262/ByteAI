using ByteAI.Core.Commands.Bytes;
using ByteAI.Core.Infrastructure;

namespace ByteAI.Core.Business.Interfaces;

public interface IBookmarksBusiness
{
    Task<bool> ToggleBookmarkAsync(string clerkId, Guid byteId, CancellationToken ct);
    Task<PagedResult<ByteResult>> GetMyBookmarksAsync(string clerkId, int page, int pageSize, CancellationToken ct);
}
