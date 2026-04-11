using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ByteAI.Core.Commands.Bookmarks;

public sealed class ToggleBookmarkCommandHandler(AppDbContext db)
    : IRequestHandler<ToggleBookmarkCommand, bool>
{
    public async Task<bool> Handle(ToggleBookmarkCommand request, CancellationToken ct)
    {
        var existing = await db.UserBookmarks
            .FirstOrDefaultAsync(b => b.ByteId == request.ByteId && b.UserId == request.UserId, ct);

        if (existing is not null)
        {
            db.UserBookmarks.Remove(existing);
            await db.SaveChangesAsync(ct);
            return false; // un-saved
        }

        db.UserBookmarks.Add(new UserBookmark { ByteId = request.ByteId, UserId = request.UserId, CreatedAt = DateTime.UtcNow });
        await db.SaveChangesAsync(ct);
        return true; // saved
    }
}

public sealed class DeleteBookmarkCommandHandler(AppDbContext db)
    : IRequestHandler<DeleteBookmarkCommand, bool>
{
    public async Task<bool> Handle(DeleteBookmarkCommand request, CancellationToken ct)
    {
        var bookmark = await db.UserBookmarks
            .FirstOrDefaultAsync(b => b.ByteId == request.ByteId && b.UserId == request.UserId, ct);

        if (bookmark is null) return false;

        db.UserBookmarks.Remove(bookmark);
        await db.SaveChangesAsync(ct);
        return true;
    }
}

public sealed class GetUserBookmarksQueryHandler(AppDbContext db)
    : IRequestHandler<GetUserBookmarksQuery, PagedResult<Byte>>
{
    public async Task<PagedResult<Byte>> Handle(GetUserBookmarksQuery request, CancellationToken cancellationToken)
    {
        var query = db.UserBookmarks
            .Where(b => b.UserId == request.UserId)
            .OrderByDescending(b => b.CreatedAt)
            .Include(b => b.Byte);

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip(request.Pagination.Skip)
            .Take(request.Pagination.PageSize)
            .Select(b => b.Byte)
            .ToListAsync(cancellationToken);

        return new PagedResult<Byte>(items, total, request.Pagination.Page, request.Pagination.PageSize);
    }
}
