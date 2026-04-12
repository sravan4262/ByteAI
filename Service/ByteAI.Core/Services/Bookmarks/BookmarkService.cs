using ByteAI.Core.Entities;
using ByteAI.Core.Events;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ByteAI.Core.Services.Bookmarks;

public sealed class BookmarkService(AppDbContext db, IPublisher publisher) : IBookmarkService
{
    public async Task<bool> ToggleBookmarkAsync(Guid byteId, Guid userId, CancellationToken ct)
    {
        var existing = await db.UserBookmarks
            .FirstOrDefaultAsync(b => b.ByteId == byteId && b.UserId == userId, ct);

        if (existing is not null)
        {
            db.UserBookmarks.Remove(existing);
            await db.SaveChangesAsync(ct);
            return false;
        }

        db.UserBookmarks.Add(new UserBookmark { ByteId = byteId, UserId = userId, CreatedAt = DateTime.UtcNow });
        await db.SaveChangesAsync(ct);

        // Update user's interest embedding toward this byte's content (fire-and-forget)
        _ = publisher.Publish(new UserEngagedWithByteEvent(userId, byteId), ct);

        return true;
    }

    public async Task<PagedResult<Byte>> GetUserBookmarksAsync(Guid userId, PaginationParams pagination, CancellationToken ct)
    {
        var query = db.UserBookmarks
            .Where(b => b.UserId == userId)
            .OrderByDescending(b => b.CreatedAt)
            .Include(b => b.Byte);

        var total = await query.CountAsync(CancellationToken.None);
        var items = await query
            .Skip(pagination.Skip)
            .Take(pagination.PageSize)
            .Select(b => b.Byte)
            .ToListAsync(CancellationToken.None);

        return new PagedResult<Byte>(items, total, pagination.Page, pagination.PageSize);
    }
}
