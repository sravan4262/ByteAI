using ByteAI.Api.Tests.Helpers;
using ByteAI.Core.Entities;
using ByteAI.Core.Events;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Services.Bookmarks;
using MediatR;
using ByteEntity = ByteAI.Core.Entities.Byte;

namespace ByteAI.Api.Tests.Unit.Services;

public sealed class BookmarkServiceTests : IDisposable
{
    private readonly ByteAI.Core.Infrastructure.Persistence.AppDbContext _db;
    private readonly Mock<IPublisher> _publisher = new();
    private readonly BookmarkService _sut;

    private readonly Guid _userId  = Guid.NewGuid();
    private readonly Guid _byteId  = Guid.NewGuid();
    private readonly Guid _authorId = Guid.NewGuid();

    public BookmarkServiceTests()
    {
        _db = DbContextFactory.Create();
        _sut = new BookmarkService(_db, _publisher.Object);

        _publisher.Setup(p => p.Publish(It.IsAny<ContentBookmarkedEvent>(), It.IsAny<CancellationToken>()))
                  .Returns(Task.CompletedTask);
        _publisher.Setup(p => p.Publish(It.IsAny<UserEngagedWithByteEvent>(), It.IsAny<CancellationToken>()))
                  .Returns(Task.CompletedTask);

        // Seed user + byte
        _db.Users.Add(new User { Id = _userId,   ClerkId = "u1", Username = "user1", DisplayName = "User One" });
        _db.Users.Add(new User { Id = _authorId, ClerkId = "a1", Username = "author", DisplayName = "Author" });
        _db.Bytes.Add(new ByteEntity { Id = _byteId, AuthorId = _authorId, Title = "B", Body = "b", Type = "article", IsActive = true });
        _db.SaveChanges();
    }

    public void Dispose() => _db.Dispose();

    // ── ToggleBookmarkAsync ───────────────────────────────────────────────────

    [Fact]
    public async Task Toggle_NoExisting_AddsBookmarkAndReturnsTrue()
    {
        var result = await _sut.ToggleBookmarkAsync(_byteId, _userId, default);

        Assert.True(result);
        Assert.Single(_db.UserBookmarks.Where(b => b.ByteId == _byteId && b.UserId == _userId));
    }

    [Fact]
    public async Task Toggle_NoExisting_PublishesContentBookmarkedAndEngagedEvents()
    {
        await _sut.ToggleBookmarkAsync(_byteId, _userId, default);

        _publisher.Verify(p => p.Publish(It.IsAny<ContentBookmarkedEvent>(), It.IsAny<CancellationToken>()), Times.Once);
        _publisher.Verify(p => p.Publish(It.IsAny<UserEngagedWithByteEvent>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Toggle_ExistingBookmark_RemovesItAndReturnsFalse()
    {
        _db.UserBookmarks.Add(new UserBookmark { ByteId = _byteId, UserId = _userId });
        await _db.SaveChangesAsync();

        var result = await _sut.ToggleBookmarkAsync(_byteId, _userId, default);

        Assert.False(result);
        Assert.Empty(_db.UserBookmarks.Where(b => b.ByteId == _byteId && b.UserId == _userId));
    }

    [Fact]
    public async Task Toggle_ExistingBookmark_DoesNotPublish()
    {
        _db.UserBookmarks.Add(new UserBookmark { ByteId = _byteId, UserId = _userId });
        await _db.SaveChangesAsync();

        await _sut.ToggleBookmarkAsync(_byteId, _userId, default);

        _publisher.Verify(p => p.Publish(It.IsAny<object>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    // ── GetUserBookmarksAsync ─────────────────────────────────────────────────

    [Fact]
    public async Task GetUserBookmarks_ReturnsOnlyThisUsersBookmarks()
    {
        var otherId = Guid.NewGuid();
        var otherByteId = Guid.NewGuid();

        _db.Users.Add(new User { Id = otherId, ClerkId = "o1", Username = "other", DisplayName = "Other" });
        _db.Bytes.Add(new ByteEntity { Id = otherByteId, AuthorId = _authorId, Title = "O", Body = "o", Type = "article", IsActive = true });

        _db.UserBookmarks.Add(new UserBookmark { ByteId = _byteId, UserId = _userId });
        _db.UserBookmarks.Add(new UserBookmark { ByteId = otherByteId, UserId = otherId });
        await _db.SaveChangesAsync();

        var result = await _sut.GetUserBookmarksAsync(_userId, new PaginationParams(1, 20), default);

        Assert.Equal(1, result.Total);
    }

    [Fact]
    public async Task GetUserBookmarks_Empty_ReturnsPaged_Zero()
    {
        var result = await _sut.GetUserBookmarksAsync(_userId, new PaginationParams(1, 20), default);
        Assert.Equal(0, result.Total);
        Assert.Empty(result.Items);
    }
}
