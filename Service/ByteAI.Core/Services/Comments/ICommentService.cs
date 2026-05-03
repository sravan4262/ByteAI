using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;

namespace ByteAI.Core.Services.Comments;

public sealed record CommentWithAuthor(
    Comment Comment,
    string Username,
    string DisplayName,
    string? AvatarUrl
);

public interface ICommentService
{
    Task<PagedResult<Comment>> GetCommentsByByteAsync(Guid byteId, PaginationParams pagination, CancellationToken ct, Guid? requesterId = null);
    Task<PagedResult<CommentWithAuthor>> GetCommentsWithAuthorByByteAsync(Guid byteId, PaginationParams pagination, CancellationToken ct, Guid? requesterId = null);
    Task<Comment> CreateCommentAsync(Guid byteId, Guid authorId, string body, Guid? parentCommentId, CancellationToken ct);
    Task<Comment> UpdateCommentAsync(Guid commentId, Guid authorId, string body, CancellationToken ct);
    Task<bool> DeleteCommentAsync(Guid commentId, Guid authorId, CancellationToken ct);
}
