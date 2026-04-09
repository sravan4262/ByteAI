using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ByteAI.Core.Commands.Bookmarks;

public sealed class CreateBookmarkCommandHandler(AppDbContext db)
    : IRequestHandler<CreateBookmarkCommand, Bookmark>
{
    public async Task<Bookmark> Handle(CreateBookmarkCommand request, CancellationToken cancellationToken)
    {
        var existing = await db.Bookmarks
            .FirstOrDefaultAsync(b => b.ByteId == request.ByteId && b.UserId == request.UserId, cancellationToken);

        if (existing is not null)
            throw new InvalidOperationException("Byte already bookmarked");

        var bookmark = new Bookmark { ByteId = request.ByteId, UserId = request.UserId, CreatedAt = DateTime.UtcNow };

        var byteEntity = await db.Bytes.FindAsync([request.ByteId], cancellationToken);
        if (byteEntity is not null)
        {
            byteEntity.BookmarkCount++;
            db.Bytes.Update(byteEntity);
        }

        db.Bookmarks.Add(bookmark);
        await db.SaveChangesAsync(cancellationToken);
        return bookmark;
    }
}

public sealed class DeleteBookmarkCommandHandler(AppDbContext db)
    : IRequestHandler<DeleteBookmarkCommand, bool>
{
    public async Task<bool> Handle(DeleteBookmarkCommand request, CancellationToken cancellationToken)
    {
        var bookmark = await db.Bookmarks
            .FirstOrDefaultAsync(b => b.ByteId == request.ByteId && b.UserId == request.UserId, cancellationToken);

        if (bookmark is null) return false;

        var byteEntity = await db.Bytes.FindAsync([request.ByteId], cancellationToken);
        if (byteEntity is not null)
        {
            byteEntity.BookmarkCount = Math.Max(0, byteEntity.BookmarkCount - 1);
            db.Bytes.Update(byteEntity);
        }

        db.Bookmarks.Remove(bookmark);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }
}

public sealed class GetUserBookmarksQueryHandler(AppDbContext db)
    : IRequestHandler<GetUserBookmarksQuery, PagedResult<Byte>>
{
    public async Task<PagedResult<Byte>> Handle(GetUserBookmarksQuery request, CancellationToken cancellationToken)
    {
        var query = db.Bookmarks
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
