using ByteAI.Core.Business;
using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Services;
using ByteAI.Core.Services.Comments;

namespace ByteAI.Api.Tests.Unit.Business;

public sealed class CommentsBusinessTests
{
    private readonly Mock<ICommentService> _commentService = new();
    private readonly Mock<ICurrentUserService> _currentUser = new();
    private readonly CommentsBusiness _sut;

    private readonly Guid _userId = Guid.NewGuid();
    private readonly Guid _byteId = Guid.NewGuid();
    private const string SupabaseUserId = "supabase_comment";

    public CommentsBusinessTests()
    {
        _sut = new CommentsBusiness(_commentService.Object, _currentUser.Object);
    }

    // ── Auth guards ───────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateComment_UnknownUserId_ThrowsUnauthorized()
    {
        _currentUser.Setup(s => s.GetCurrentUserIdAsync(SupabaseUserId, default)).ReturnsAsync((Guid?)null);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _sut.CreateCommentAsync(SupabaseUserId, _byteId, "body", null, default));
    }

    [Fact]
    public async Task UpdateComment_UnknownUserId_ThrowsUnauthorized()
    {
        _currentUser.Setup(s => s.GetCurrentUserIdAsync(SupabaseUserId, default)).ReturnsAsync((Guid?)null);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _sut.UpdateCommentAsync(SupabaseUserId, Guid.NewGuid(), "body", default));
    }

    [Fact]
    public async Task DeleteComment_UnknownUserId_ThrowsUnauthorized()
    {
        _currentUser.Setup(s => s.GetCurrentUserIdAsync(SupabaseUserId, default)).ReturnsAsync((Guid?)null);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _sut.DeleteCommentAsync(SupabaseUserId, Guid.NewGuid(), default));
    }

    // ── GetCommentsByByteAsync ────────────────────────────────────────────────

    [Fact]
    public async Task GetCommentsByByte_NeedsNoAuth_DelegatesToService()
    {
        var expected = new PagedResult<Comment>([], 0, 1, 20);
        _commentService
            .Setup(s => s.GetCommentsByByteAsync(_byteId, It.IsAny<PaginationParams>(), default, It.IsAny<Guid?>()))
            .ReturnsAsync(expected);

        var result = await _sut.GetCommentsByByteAsync(_byteId, 1, 20, default);

        Assert.Equal(expected, result);
    }

    [Fact]
    public async Task GetCommentsByByte_PageSizeCappedAt200()
    {
        _commentService
            .Setup(s => s.GetCommentsByByteAsync(_byteId, It.Is<PaginationParams>(p => p.PageSize == 200), default, It.IsAny<Guid?>()))
            .ReturnsAsync(new PagedResult<Comment>([], 0, 1, 200));

        await _sut.GetCommentsByByteAsync(_byteId, 1, 9999, default);

        _commentService.Verify(s =>
            s.GetCommentsByByteAsync(_byteId, It.Is<PaginationParams>(p => p.PageSize == 200), default, It.IsAny<Guid?>()),
            Times.Once);
    }

    // ── CreateCommentAsync ────────────────────────────────────────────────────

    [Fact]
    public async Task CreateComment_ValidUser_DelegatesToService()
    {
        _currentUser.Setup(s => s.GetCurrentUserIdAsync(SupabaseUserId, default)).ReturnsAsync(_userId);
        var comment = new Comment { Id = Guid.NewGuid(), ByteId = _byteId, AuthorId = _userId, Body = "nice" };
        _commentService
            .Setup(s => s.CreateCommentAsync(_byteId, _userId, "nice", null, default))
            .ReturnsAsync(comment);

        var result = await _sut.CreateCommentAsync(SupabaseUserId, _byteId, "nice", null, default);

        Assert.Equal(comment.Id, result.Id);
        Assert.Equal("nice", result.Body);
    }

    // ── UpdateCommentAsync ────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateComment_ValidUser_DelegatesToService()
    {
        var commentId = Guid.NewGuid();
        _currentUser.Setup(s => s.GetCurrentUserIdAsync(SupabaseUserId, default)).ReturnsAsync(_userId);
        var updated = new Comment { Id = commentId, Body = "updated" };
        _commentService
            .Setup(s => s.UpdateCommentAsync(commentId, _userId, "updated", default))
            .ReturnsAsync(updated);

        var result = await _sut.UpdateCommentAsync(SupabaseUserId, commentId, "updated", default);

        Assert.Equal("updated", result.Body);
    }

    // ── DeleteCommentAsync ────────────────────────────────────────────────────

    [Fact]
    public async Task DeleteComment_ValidUser_DelegatesToService()
    {
        var commentId = Guid.NewGuid();
        _currentUser.Setup(s => s.GetCurrentUserIdAsync(SupabaseUserId, default)).ReturnsAsync(_userId);
        _commentService.Setup(s => s.DeleteCommentAsync(commentId, _userId, default)).ReturnsAsync(true);

        var result = await _sut.DeleteCommentAsync(SupabaseUserId, commentId, default);

        Assert.True(result);
    }
}
