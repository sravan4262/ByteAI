using ByteAI.Api.Tests.Helpers;
using ByteAI.Core.Entities;
using ByteAI.Core.Events;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Services.Badges;
using ByteAI.Core.Services.Comments;
using ByteAI.Core.Services.Notifications;
using MediatR;
using ByteEntity = ByteAI.Core.Entities.Byte;

namespace ByteAI.Api.Tests.Unit.Services;

public sealed class CommentServiceTests : IDisposable
{
    private readonly ByteAI.Core.Infrastructure.Persistence.AppDbContext _db;
    private readonly Mock<IBadgeService> _badges = new();
    private readonly Mock<INotificationService> _notifications = new();
    private readonly Mock<IPublisher> _publisher = new();
    private readonly CommentService _sut;

    private readonly Guid _authorId = Guid.NewGuid();
    private readonly Guid _byteId   = Guid.NewGuid();

    public CommentServiceTests()
    {
        _db = DbContextFactory.Create();
        _sut = new CommentService(_db, _badges.Object, _notifications.Object, _publisher.Object);

        _badges.Setup(b => b.CheckAndAwardAsync(It.IsAny<Guid>(), It.IsAny<BadgeTrigger>(), It.IsAny<CancellationToken>()))
               .ReturnsAsync([]);
        _notifications.Setup(n => n.CreateAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<object>(), It.IsAny<CancellationToken>()))
                      .Returns(Task.CompletedTask);
        _publisher.Setup(p => p.Publish(It.IsAny<CommentCreatedEvent>(), It.IsAny<CancellationToken>()))
                  .Returns(Task.CompletedTask);

        _db.Users.Add(new User { Id = _authorId, SupabaseUserId = "c1", Username = "commenter", DisplayName = "Commenter" });
        _db.Bytes.Add(new ByteEntity { Id = _byteId, AuthorId = _authorId, Title = "T", Body = "b", Type = "article", IsActive = true });
        _db.SaveChanges();
    }

    public void Dispose() => _db.Dispose();

    // ── GetCommentsByByteAsync ────────────────────────────────────────────────

    [Fact]
    public async Task GetComments_ReturnsOnlyTopLevel()
    {
        var parent = new Comment { Id = Guid.NewGuid(), ByteId = _byteId, AuthorId = _authorId, Body = "parent" };
        var child  = new Comment { Id = Guid.NewGuid(), ByteId = _byteId, AuthorId = _authorId, Body = "child", ParentId = parent.Id };
        _db.Comments.AddRange(parent, child);
        await _db.SaveChangesAsync();

        var result = await _sut.GetCommentsByByteAsync(_byteId, new PaginationParams(1, 20), default);

        Assert.Equal(1, result.Total);
        Assert.Equal("parent", result.Items[0].Body);
    }

    [Fact]
    public async Task GetComments_Empty_ReturnsZero()
    {
        var result = await _sut.GetCommentsByByteAsync(_byteId, new PaginationParams(1, 20), default);
        Assert.Equal(0, result.Total);
    }

    // ── CreateCommentAsync ────────────────────────────────────────────────────

    [Fact]
    public async Task CreateComment_PersistsAndReturnComment()
    {
        var result = await _sut.CreateCommentAsync(_byteId, _authorId, "Hello!", null, default);

        Assert.NotEqual(Guid.Empty, result.Id);
        Assert.Equal("Hello!", result.Body);
        Assert.NotNull(await _db.Comments.FindAsync([result.Id]));
    }

    [Fact]
    public async Task CreateComment_ChecksBadge_CommentPosted()
    {
        await _sut.CreateCommentAsync(_byteId, _authorId, "Nice!", null, default);

        _badges.Verify(b => b.CheckAndAwardAsync(_authorId, BadgeTrigger.CommentPosted, default), Times.Once);
    }

    [Fact]
    public async Task CreateComment_PublishesCommentCreatedEvent()
    {
        await _sut.CreateCommentAsync(_byteId, _authorId, "Test", null, default);

        _publisher.Verify(p => p.Publish(It.IsAny<CommentCreatedEvent>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreateComment_CreatesNotificationForByteAuthor()
    {
        var commenterId = Guid.NewGuid();
        _db.Users.Add(new User { Id = commenterId, SupabaseUserId = "c2", Username = "other", DisplayName = "Other" });
        await _db.SaveChangesAsync();

        await _sut.CreateCommentAsync(_byteId, commenterId, "Comment!", null, default);

        _notifications.Verify(n => n.CreateAsync(
            _authorId, "comment", It.IsAny<object>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    // ── UpdateCommentAsync ────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateComment_NotFound_ThrowsKeyNotFound()
    {
        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => _sut.UpdateCommentAsync(Guid.NewGuid(), _authorId, "New", default));
    }

    [Fact]
    public async Task UpdateComment_WrongAuthor_ThrowsUnauthorized()
    {
        var comment = new Comment { Id = Guid.NewGuid(), ByteId = _byteId, AuthorId = _authorId, Body = "orig" };
        _db.Comments.Add(comment);
        await _db.SaveChangesAsync();

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _sut.UpdateCommentAsync(comment.Id, Guid.NewGuid(), "hacked", default));
    }

    [Fact]
    public async Task UpdateComment_ValidAuthor_UpdatesBody()
    {
        var comment = new Comment { Id = Guid.NewGuid(), ByteId = _byteId, AuthorId = _authorId, Body = "old" };
        _db.Comments.Add(comment);
        await _db.SaveChangesAsync();

        var result = await _sut.UpdateCommentAsync(comment.Id, _authorId, "updated", default);

        Assert.Equal("updated", result.Body);
    }

    // ── DeleteCommentAsync ────────────────────────────────────────────────────

    [Fact]
    public async Task DeleteComment_NotFound_ReturnsFalse()
    {
        var result = await _sut.DeleteCommentAsync(Guid.NewGuid(), _authorId, default);
        Assert.False(result);
    }

    [Fact]
    public async Task DeleteComment_WrongAuthor_ThrowsUnauthorized()
    {
        var comment = new Comment { Id = Guid.NewGuid(), ByteId = _byteId, AuthorId = _authorId, Body = "x" };
        _db.Comments.Add(comment);
        await _db.SaveChangesAsync();

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _sut.DeleteCommentAsync(comment.Id, Guid.NewGuid(), default));
    }

    [Fact]
    public async Task DeleteComment_OwnComment_RemovesAndReturnsTrue()
    {
        var comment = new Comment { Id = Guid.NewGuid(), ByteId = _byteId, AuthorId = _authorId, Body = "del" };
        _db.Comments.Add(comment);
        await _db.SaveChangesAsync();

        var result = await _sut.DeleteCommentAsync(comment.Id, _authorId, default);

        Assert.True(result);
        Assert.Null(await _db.Comments.FindAsync([comment.Id]));
    }
}
