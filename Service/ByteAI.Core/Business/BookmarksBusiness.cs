using ByteAI.Core.Business.Interfaces;
using ByteAI.Core.Commands.Bytes;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Services;
using ByteAI.Core.Services.Bookmarks;

namespace ByteAI.Core.Business;

public sealed class BookmarksBusiness(IBookmarkService bookmarkService, ICurrentUserService currentUserService) : IBookmarksBusiness
{
    public async Task<bool> ToggleBookmarkAsync(string clerkId, Guid byteId, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(clerkId, ct);
        return await bookmarkService.ToggleBookmarkAsync(byteId, userId, ct);
    }

    public async Task<PagedResult<ByteResult>> GetMyBookmarksAsync(string clerkId, int page, int pageSize, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(clerkId, ct);
        var result = await bookmarkService.GetUserBookmarksAsync(userId, new PaginationParams(page, Math.Min(pageSize, 100)), ct);
        var items = result.Items.Select(b => new ByteResult(b.Id, b.AuthorId, b.Title, b.Body, b.CodeSnippet, b.Language, b.Type, b.CreatedAt, b.UpdatedAt, 0, 0)).ToList();
        return new PagedResult<ByteResult>(items, result.Total, result.Page, result.PageSize);
    }

    private async Task<Guid> ResolveUserIdAsync(string clerkId, CancellationToken ct)
    {
        var userId = await currentUserService.GetCurrentUserIdAsync(clerkId, ct);
        if (userId is null) throw new UnauthorizedAccessException("User not found for the given Clerk ID.");
        return userId.Value;
    }
}
