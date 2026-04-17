using ByteAI.Core.Business.Interfaces;
using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Services;
using ByteAI.Core.Services.Comments;

namespace ByteAI.Core.Business;

public sealed class CommentsBusiness(ICommentService commentService, ICurrentUserService currentUserService) : ICommentsBusiness
{
    public async Task<PagedResult<Comment>> GetCommentsByByteAsync(Guid byteId, int page, int pageSize, CancellationToken ct) =>
        await commentService.GetCommentsByByteAsync(byteId, new PaginationParams(page, Math.Min(pageSize, 200)), ct);

    public async Task<PagedResult<CommentWithAuthor>> GetCommentsWithAuthorByByteAsync(Guid byteId, int page, int pageSize, CancellationToken ct) =>
        await commentService.GetCommentsWithAuthorByByteAsync(byteId, new PaginationParams(page, Math.Min(pageSize, 200)), ct);

    public async Task<Comment> CreateCommentAsync(string supabaseUserId, Guid byteId, string body, Guid? parentCommentId, CancellationToken ct)
    {
        var authorId = await ResolveUserIdAsync(supabaseUserId, ct);
        return await commentService.CreateCommentAsync(byteId, authorId, body, parentCommentId, ct);
    }

    public async Task<Comment> UpdateCommentAsync(string supabaseUserId, Guid commentId, string body, CancellationToken ct)
    {
        var authorId = await ResolveUserIdAsync(supabaseUserId, ct);
        return await commentService.UpdateCommentAsync(commentId, authorId, body, ct);
    }

    public async Task<bool> DeleteCommentAsync(string supabaseUserId, Guid commentId, CancellationToken ct)
    {
        var authorId = await ResolveUserIdAsync(supabaseUserId, ct);
        return await commentService.DeleteCommentAsync(commentId, authorId, ct);
    }

    private async Task<Guid> ResolveUserIdAsync(string supabaseUserId, CancellationToken ct)
    {
        var userId = await currentUserService.GetCurrentUserIdAsync(supabaseUserId, ct);
        if (userId is null) throw new UnauthorizedAccessException("User not found.");
        return userId.Value;
    }
}
