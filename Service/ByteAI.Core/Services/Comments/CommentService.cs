using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Persistence;
using ByteAI.Core.Services.Badges;
using ByteAI.Core.Services.Notifications;
using Microsoft.EntityFrameworkCore;

namespace ByteAI.Core.Services.Comments;

public sealed class CommentService(AppDbContext db, IBadgeService badgeService, INotificationService notifications) : ICommentService
{
    public async Task<PagedResult<Comment>> GetCommentsByByteAsync(Guid byteId, PaginationParams pagination, CancellationToken ct)
    {
        var query = db.Comments
            .Where(c => c.ByteId == byteId && c.ParentId == null)
            .OrderByDescending(c => c.CreatedAt);

        var total = await query.CountAsync(ct);
        var items = await query
            .Skip(pagination.Skip)
            .Take(pagination.PageSize)
            .ToListAsync(ct);

        return new PagedResult<Comment>(items, total, pagination.Page, pagination.PageSize);
    }

    public async Task<Comment> CreateCommentAsync(Guid byteId, Guid authorId, string body, Guid? parentCommentId, CancellationToken ct)
    {
        var comment = new Comment
        {
            Id = Guid.NewGuid(),
            ByteId = byteId,
            AuthorId = authorId,
            Body = body,
            ParentId = parentCommentId,
            CreatedAt = DateTime.UtcNow
        };

        db.Comments.Add(comment);
        await db.SaveChangesAsync(ct);

        await badgeService.CheckAndAwardAsync(authorId, BadgeTrigger.CommentPosted, ct);

        // ── Notify the byte author (skip self-comment) ─────────────────────────
        var byteAuthorId = await db.Bytes
            .Where(b => b.Id == byteId)
            .Select(b => b.AuthorId)
            .FirstOrDefaultAsync(ct);

        if (byteAuthorId != Guid.Empty && byteAuthorId != authorId)
        {
            var actor = await db.Users
                .AsNoTracking()
                .Where(u => u.Id == authorId)
                .Select(u => new { u.Username, u.DisplayName, u.AvatarUrl })
                .FirstOrDefaultAsync(ct);

            await notifications.CreateAsync(
                userId: byteAuthorId,
                type: "comment",
                payload: new
                {
                    byteId,
                    commentId = comment.Id,
                    actorId = authorId,
                    actorUsername = actor?.Username ?? string.Empty,
                    actorDisplayName = actor?.DisplayName ?? string.Empty,
                    actorAvatarUrl = actor?.AvatarUrl,
                    preview = body.Length > 80 ? body[..80] + "…" : body,
                },
                ct: ct);
        }

        return comment;
    }

    public async Task<Comment> UpdateCommentAsync(Guid commentId, Guid authorId, string body, CancellationToken ct)
    {
        var comment = await db.Comments.FirstOrDefaultAsync(c => c.Id == commentId, ct)
            ?? throw new KeyNotFoundException($"Comment {commentId} not found");

        if (comment.AuthorId != authorId)
            throw new UnauthorizedAccessException("Cannot update another user's comment");

        comment.Body = body;
        await db.SaveChangesAsync(ct);
        return comment;
    }

    public async Task<bool> DeleteCommentAsync(Guid commentId, Guid authorId, CancellationToken ct)
    {
        var comment = await db.Comments.FirstOrDefaultAsync(c => c.Id == commentId, ct);
        if (comment is null) return false;

        if (comment.AuthorId != authorId)
            throw new UnauthorizedAccessException("Cannot delete another user's comment");

        db.Comments.Remove(comment);
        await db.SaveChangesAsync(ct);
        return true;
    }
}
