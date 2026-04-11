using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ByteAI.Core.Commands.Comments;

public sealed class CreateCommentCommandHandler(AppDbContext db)
    : IRequestHandler<CreateCommentCommand, Comment>
{
    public async Task<Comment> Handle(CreateCommentCommand request, CancellationToken cancellationToken)
    {
        var comment = new Comment
        {
            Id = Guid.NewGuid(),
            ByteId = request.ByteId,
            AuthorId = request.AuthorId,
            Body = request.Body,
            ParentId = request.ParentCommentId,
            CreatedAt = DateTime.UtcNow
        };

        db.Comments.Add(comment);
        await db.SaveChangesAsync(cancellationToken);
        return comment;
    }
}

public sealed class GetCommentsByByteQueryHandler(AppDbContext db)
    : IRequestHandler<GetCommentsByByteQuery, PagedResult<Comment>>
{
    public async Task<PagedResult<Comment>> Handle(GetCommentsByByteQuery request, CancellationToken cancellationToken)
    {
        var query = db.Comments
            .Where(c => c.ByteId == request.ByteId && c.ParentId == null)
            .OrderByDescending(c => c.CreatedAt);

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip(request.Pagination.Skip)
            .Take(request.Pagination.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<Comment>(items, total, request.Pagination.Page, request.Pagination.PageSize);
    }
}

public sealed class UpdateCommentCommandHandler(AppDbContext db)
    : IRequestHandler<UpdateCommentCommand, Comment>
{
    public async Task<Comment> Handle(UpdateCommentCommand request, CancellationToken cancellationToken)
    {
        var comment = await db.Comments.FirstOrDefaultAsync(c => c.Id == request.CommentId, cancellationToken)
            ?? throw new KeyNotFoundException($"Comment {request.CommentId} not found");

        if (comment.AuthorId != request.AuthorId)
            throw new UnauthorizedAccessException("Cannot update another user's comment");

        comment.Body = request.Body;
        await db.SaveChangesAsync(cancellationToken);
        return comment;
    }
}

public sealed class DeleteCommentCommandHandler(AppDbContext db)
    : IRequestHandler<DeleteCommentCommand, bool>
{
    public async Task<bool> Handle(DeleteCommentCommand request, CancellationToken cancellationToken)
    {
        var comment = await db.Comments.FirstOrDefaultAsync(c => c.Id == request.CommentId, cancellationToken);
        if (comment is null) return false;

        if (comment.AuthorId != request.AuthorId)
            throw new UnauthorizedAccessException("Cannot delete another user's comment");

        db.Comments.Remove(comment);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }
}
