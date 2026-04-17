using ByteAI.Core.Business;
using ByteAI.Core.Commands.Bytes;
using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Services;
using ByteAI.Core.Services.Bookmarks;
using ByteEntity = ByteAI.Core.Entities.Byte;

namespace ByteAI.Api.Tests.Unit.Business;

public sealed class BookmarksBusinessTests
{
    private readonly Mock<IBookmarkService> _bookmarkService = new();
    private readonly Mock<ICurrentUserService> _currentUser = new();
    private readonly BookmarksBusiness _sut;

    private readonly Guid _userId = Guid.NewGuid();
    private readonly Guid _byteId = Guid.NewGuid();
    private const string SupabaseUserId = "clerk_bookmark";

    public BookmarksBusinessTests()
    {
        _sut = new BookmarksBusiness(_bookmarkService.Object, _currentUser.Object);
    }

    // ── Auth guards ───────────────────────────────────────────────────────────

    [Fact]
    public async Task ToggleBookmark_UnknownClerkId_ThrowsUnauthorized()
    {
        _currentUser.Setup(s => s.GetCurrentUserIdAsync(ClerkId, default)).ReturnsAsync((Guid?)null);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _sut.ToggleBookmarkAsync(ClerkId, _byteId, default));
    }

    [Fact]
    public async Task GetMyBookmarks_UnknownClerkId_ThrowsUnauthorized()
    {
        _currentUser.Setup(s => s.GetCurrentUserIdAsync(ClerkId, default)).ReturnsAsync((Guid?)null);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _sut.GetMyBookmarksAsync(ClerkId, 1, 20, default));
    }

    // ── ToggleBookmarkAsync ───────────────────────────────────────────────────

    [Fact]
    public async Task ToggleBookmark_ValidUser_ReturnsTrue()
    {
        _currentUser.Setup(s => s.GetCurrentUserIdAsync(ClerkId, default)).ReturnsAsync(_userId);
        _bookmarkService.Setup(s => s.ToggleBookmarkAsync(_byteId, _userId, default)).ReturnsAsync(true);

        var result = await _sut.ToggleBookmarkAsync(ClerkId, _byteId, default);

        Assert.True(result);
    }

    [Fact]
    public async Task ToggleBookmark_ValidUser_ReturnsFalseWhenRemoving()
    {
        _currentUser.Setup(s => s.GetCurrentUserIdAsync(ClerkId, default)).ReturnsAsync(_userId);
        _bookmarkService.Setup(s => s.ToggleBookmarkAsync(_byteId, _userId, default)).ReturnsAsync(false);

        var result = await _sut.ToggleBookmarkAsync(ClerkId, _byteId, default);

        Assert.False(result);
    }

    // ── GetMyBookmarksAsync ───────────────────────────────────────────────────

    [Fact]
    public async Task GetMyBookmarks_ValidUser_MapsByteResults()
    {
        _currentUser.Setup(s => s.GetCurrentUserIdAsync(ClerkId, default)).ReturnsAsync(_userId);

        var author = new User { Id = Guid.NewGuid(), Username = "alice", DisplayName = "Alice" };
        var byte1 = new ByteEntity
        {
            Id = _byteId,
            AuthorId = author.Id,
            Title = "Title1",
            Body = "Body1",
            Type = "article",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Author = author
        };
        var pagedBytes = new PagedResult<ByteEntity>([byte1], 1, 1, 20);

        _bookmarkService
            .Setup(s => s.GetUserBookmarksAsync(_userId, It.IsAny<PaginationParams>(), default))
            .ReturnsAsync(pagedBytes);

        var result = await _sut.GetMyBookmarksAsync(ClerkId, 1, 20, default);

        Assert.Single(result.Items);
        Assert.Equal("Title1", result.Items[0].Title);
        Assert.Equal("alice", result.Items[0].AuthorUsername);
    }

    [Fact]
    public async Task GetMyBookmarks_PageSizeCappedAt100()
    {
        _currentUser.Setup(s => s.GetCurrentUserIdAsync(ClerkId, default)).ReturnsAsync(_userId);
        _bookmarkService
            .Setup(s => s.GetUserBookmarksAsync(_userId, It.Is<PaginationParams>(p => p.PageSize == 100), default))
            .ReturnsAsync(new PagedResult<ByteEntity>([], 0, 1, 100));

        await _sut.GetMyBookmarksAsync(ClerkId, 1, 999, default);

        _bookmarkService.Verify(s =>
            s.GetUserBookmarksAsync(_userId, It.Is<PaginationParams>(p => p.PageSize == 100), default),
            Times.Once);
    }
}
