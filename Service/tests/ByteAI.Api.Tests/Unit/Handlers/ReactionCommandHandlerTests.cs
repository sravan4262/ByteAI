using ByteAI.Api.Tests.Helpers;
using ByteAI.Core.Commands.Reactions;
using ByteAI.Core.Entities;
using ByteAI.Core.Events;
using MediatR;
using ByteEntity = ByteAI.Core.Entities.Byte;

namespace ByteAI.Api.Tests.Unit.Handlers;

public sealed class ReactionCommandHandlerTests : IDisposable
{
    private readonly ByteAI.Core.Infrastructure.Persistence.AppDbContext _db;
    private readonly Mock<IPublisher> _publisher = new();

    private readonly Guid _userId   = Guid.NewGuid();
    private readonly Guid _authorId = Guid.NewGuid();
    private readonly Guid _byteId   = Guid.NewGuid();

    public ReactionCommandHandlerTests()
    {
        _db = DbContextFactory.Create();

        _publisher.Setup(p => p.Publish(It.IsAny<ByteReactedEvent>(), It.IsAny<CancellationToken>()))
                  .Returns(Task.CompletedTask);
        _publisher.Setup(p => p.Publish(It.IsAny<UserEngagedWithByteEvent>(), It.IsAny<CancellationToken>()))
                  .Returns(Task.CompletedTask);

        _db.Users.AddRange(
            new User { Id = _userId,   ClerkId = "r1", Username = "reactor", DisplayName = "Reactor" },
            new User { Id = _authorId, ClerkId = "r2", Username = "author",  DisplayName = "Author"  });

        _db.Bytes.Add(new ByteEntity
        {
            Id = _byteId, AuthorId = _authorId, Title = "T", Body = "b", Type = "article", IsActive = true
        });

        _db.SaveChanges();
    }

    public void Dispose() => _db.Dispose();

    // ── CreateReactionCommandHandler ──────────────────────────────────────────

    [Fact]
    public async Task CreateReaction_NewLike_PersistsAndReturnsIsLikedTrue()
    {
        var handler = new CreateReactionCommandHandler(_db, _publisher.Object);
        var result  = await handler.Handle(new CreateReactionCommand(_byteId, _userId), default);

        Assert.True(result.IsLiked);
        Assert.Equal(1, _db.UserLikes.Count(l => l.ByteId == _byteId && l.UserId == _userId));
        _publisher.Verify(p => p.Publish(It.IsAny<ByteReactedEvent>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreateReaction_ExistingLike_TogglesOffAndReturnsIsLikedFalse()
    {
        _db.UserLikes.Add(new UserLike { ByteId = _byteId, UserId = _userId });
        await _db.SaveChangesAsync();

        var handler = new CreateReactionCommandHandler(_db, _publisher.Object);
        var result  = await handler.Handle(new CreateReactionCommand(_byteId, _userId), default);

        Assert.False(result.IsLiked);
        Assert.Equal(0, _db.UserLikes.Count(l => l.ByteId == _byteId && l.UserId == _userId));
        // No ByteReactedEvent — it's an unlike
        _publisher.Verify(p => p.Publish(It.IsAny<ByteReactedEvent>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreateReaction_ByteNotFound_ThrowsKeyNotFound()
    {
        var handler = new CreateReactionCommandHandler(_db, _publisher.Object);

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => handler.Handle(new CreateReactionCommand(Guid.NewGuid(), _userId), default));
    }

    // ── DeleteReactionCommandHandler ──────────────────────────────────────────

    [Fact]
    public async Task DeleteReaction_Existing_RemovesAndReturnsTrue()
    {
        _db.UserLikes.Add(new UserLike { ByteId = _byteId, UserId = _userId });
        await _db.SaveChangesAsync();

        var handler = new DeleteReactionCommandHandler(_db);
        var result  = await handler.Handle(new DeleteReactionCommand(_byteId, _userId), default);

        Assert.True(result);
        Assert.Equal(0, _db.UserLikes.Count(l => l.ByteId == _byteId && l.UserId == _userId));
    }

    [Fact]
    public async Task DeleteReaction_NotFound_ReturnsFalse()
    {
        var handler = new DeleteReactionCommandHandler(_db);
        var result  = await handler.Handle(new DeleteReactionCommand(_byteId, _userId), default);

        Assert.False(result);
    }

    // ── GetByteReactionsQueryHandler ──────────────────────────────────────────

    [Fact]
    public async Task GetByteReactions_CountsLikes()
    {
        _db.UserLikes.AddRange(
            new UserLike { ByteId = _byteId, UserId = _userId },
            new UserLike { ByteId = _byteId, UserId = _authorId });
        await _db.SaveChangesAsync();

        var handler = new GetByteReactionsQueryHandler(_db);
        var result  = await handler.Handle(new GetByteReactionsQuery(_byteId), default);

        Assert.Equal(2, result.LikeCount);
    }

    [Fact]
    public async Task GetByteReactions_NoLikes_ReturnsZero()
    {
        var handler = new GetByteReactionsQueryHandler(_db);
        var result  = await handler.Handle(new GetByteReactionsQuery(_byteId), default);

        Assert.Equal(0, result.LikeCount);
    }

    // ── GetByteLikersQueryHandler ─────────────────────────────────────────────

    [Fact]
    public async Task GetByteLikers_ReturnsLikersWithUserInfo()
    {
        _db.UserLikes.Add(new UserLike { ByteId = _byteId, UserId = _userId });
        await _db.SaveChangesAsync();

        var handler = new GetByteLikersQueryHandler(_db);
        var result  = await handler.Handle(new GetByteLikersQuery(_byteId), default);

        Assert.Single(result);
        Assert.Equal("reactor", result[0].Username);
    }

    [Fact]
    public async Task GetByteLikers_NoLikes_ReturnsEmpty()
    {
        var handler = new GetByteLikersQueryHandler(_db);
        var result  = await handler.Handle(new GetByteLikersQuery(_byteId), default);

        Assert.Empty(result);
    }
}
