using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;

namespace ByteAI.Core.Services.Bookmarks;

public interface IBookmarkService
{
    Task<bool> ToggleBookmarkAsync(Guid byteId, Guid userId, CancellationToken ct);
    Task<PagedResult<Byte>> GetUserBookmarksAsync(Guid userId, PaginationParams pagination, CancellationToken ct);
}
