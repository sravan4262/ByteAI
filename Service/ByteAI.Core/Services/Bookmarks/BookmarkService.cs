using ByteAI.Core.Commands.Bookmarks;
using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using MediatR;

namespace ByteAI.Core.Services.Bookmarks;

public sealed class BookmarkService(IMediator mediator) : IBookmarkService
{
    public Task<bool> ToggleBookmarkAsync(Guid byteId, Guid userId, CancellationToken ct)
        => mediator.Send(new ToggleBookmarkCommand(byteId, userId), ct);

    public Task<PagedResult<Byte>> GetUserBookmarksAsync(Guid userId, PaginationParams pagination, CancellationToken ct)
        => mediator.Send(new GetUserBookmarksQuery(userId, pagination), ct);
}
