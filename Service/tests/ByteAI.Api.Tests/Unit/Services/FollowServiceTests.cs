using ByteAI.Api.Tests.Helpers;
using ByteAI.Core.Entities;
using ByteAI.Core.Events;
using ByteAI.Core.Services.Follow;
using MediatR;

namespace ByteAI.Api.Tests.Unit.Services;

public sealed class FollowServiceTests : IDisposable
{
    private readonly ByteAI.Core.Infrastructure.Persistence.AppDbContext _db;
    private readonly Mock<IPublisher> _publisher = new();
    private readonly FollowService _sut;

    private readonly Guid _followerId = Guid.NewGuid();
    private readonly Guid _targetId   = Guid.NewGuid();

    public FollowServiceTests()
    {
        _db = DbContextFactory.Create();
        _sut = new FollowService(_db, _publisher.Object);

        _publisher.Setup(p => p.Publish(It.IsAny<UserFollowedEvent>(), It.IsAny<CancellationToken>()))
                  .Returns(Task.CompletedTask);
        _publisher.Setup(p => p.Publish(It.IsAny<UserUnfollowedEvent>(), It.IsAny<CancellationToken>()))
                  .Returns(Task.CompletedTask);

        _db.Users.AddRange(
            new User { Id = _followerId, SupabaseUserId = "f1", Username = "follower", DisplayName = "Follower" },
            new User { Id = _targetId,   SupabaseUserId = "t1", Username = "target",   DisplayName = "Target" });
        _db.SaveChanges();
    }

    public void Dispose() => _db.Dispose();

    // ── FollowUserAsync ───────────────────────────────────────────────────────

    [Fact]
    public async Task Follow_NewRelationship_InsertsFollowingAndFollowerRows()
    {
        await _sut.FollowUserAsync(_followerId, _targetId, default);

        Assert.Single(_db.UserFollowings.Where(f => f.UserId == _followerId && f.FollowingId == _targetId));
        Assert.Single(_db.UserFollowers.Where(f => f.UserId == _targetId   && f.FollowerId == _followerId));
    }

    [Fact]
    public async Task Follow_NewRelationship_PublishesUserFollowedEvent()
    {
        await _sut.FollowUserAsync(_followerId, _targetId, default);

        _publisher.Verify(p => p.Publish(It.IsAny<UserFollowedEvent>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Follow_AlreadyFollowing_IsIdempotent_ReturnsTrue()
    {
        await _sut.FollowUserAsync(_followerId, _targetId, default);
        var result = await _sut.FollowUserAsync(_followerId, _targetId, default);

        Assert.True(result);
        Assert.Single(_db.UserFollowings.Where(f => f.UserId == _followerId && f.FollowingId == _targetId));
    }

    // ── UnfollowUserAsync ─────────────────────────────────────────────────────

    [Fact]
    public async Task Unfollow_NotFollowing_ReturnsFalse()
    {
        var result = await _sut.UnfollowUserAsync(_followerId, _targetId, default);
        Assert.False(result);
    }

    [Fact]
    public async Task Unfollow_Existing_RemovesBothRowsAndReturnsTrue()
    {
        await _sut.FollowUserAsync(_followerId, _targetId, default);

        var result = await _sut.UnfollowUserAsync(_followerId, _targetId, default);

        Assert.True(result);
        Assert.Empty(_db.UserFollowings.Where(f => f.UserId == _followerId && f.FollowingId == _targetId));
        Assert.Empty(_db.UserFollowers.Where(f => f.UserId == _targetId   && f.FollowerId == _followerId));
    }

    [Fact]
    public async Task Unfollow_Existing_PublishesUserUnfollowedEvent()
    {
        await _sut.FollowUserAsync(_followerId, _targetId, default);
        await _sut.UnfollowUserAsync(_followerId, _targetId, default);

        _publisher.Verify(p => p.Publish(It.IsAny<UserUnfollowedEvent>(), It.IsAny<CancellationToken>()), Times.Once);
    }
}
