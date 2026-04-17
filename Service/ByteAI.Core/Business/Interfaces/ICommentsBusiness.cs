using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Services.Comments;

namespace ByteAI.Core.Business.Interfaces;

public interface ICommentsBusiness
{
    Task<PagedResult<Comment>> GetCommentsByByteAsync(Guid byteId, int page, int pageSize, CancellationToken ct);
    Task<PagedResult<CommentWithAuthor>> GetCommentsWithAuthorByByteAsync(Guid byteId, int page, int pageSize, CancellationToken ct);
    Task<Comment> CreateCommentAsync(string supabaseUserId, Guid byteId, string body, Guid? parentCommentId, CancellationToken ct);
    Task<Comment> UpdateCommentAsync(string supabaseUserId, Guid commentId, string body, CancellationToken ct);
    Task<bool> DeleteCommentAsync(string supabaseUserId, Guid commentId, CancellationToken ct);
}
