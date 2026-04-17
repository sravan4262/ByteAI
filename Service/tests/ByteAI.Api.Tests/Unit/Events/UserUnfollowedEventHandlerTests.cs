using ByteAI.Api.Tests.Helpers;
using ByteAI.Core.Entities;
using ByteAI.Core.Events;
using ByteAI.Core.Services.Notifications;
using Microsoft.Extensions.Logging.Abstractions;

namespace ByteAI.Api.Tests.Unit.Events;

public sealed class UserUnfollowedEventHandlerTests : IDisposable
{
    private readonly ByteAI.Core.Infrastructure.Persistence.AppDbContext _db;
    private readonly Mock<INotificationService> _notifications = new();
    private readonly UserUnfollowedEventHandler _sut;

    private readonly Guid _followerId  = Guid.NewGuid();
    private readonly Guid _followingId = Guid.NewGuid();

    public UserUnfollowedEventHandlerTests()
    {
        _db = DbContextFactory.Create();
        _sut = new UserUnfollowedEventHandler(_db, _notifications.Object, NullLogger<UserUnfollowedEventHandler>.Instance);

        _notifications.Setup(n => n.CreateAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<object>(), It.IsAny<CancellationToken>()))
                      .Returns(Task.CompletedTask);

        _db.Users.AddRange(
            new User { Id = _followerId,  SupabaseUserId = "f1", Username = "follower",  DisplayName = "Follower" },
            new User { Id = _followingId, SupabaseUserId = "f2", Username = "following", DisplayName = "Following" });
        _db.SaveChanges();
    }

    public void Dispose() => _db.Dispose();

    // ── No preferences row — default behaviour = notify ───────────────────────

    [Fact]
    public async Task Handle_NoPreferences_SendsUnfollowNotification()
    {
        await _sut.Handle(new UserUnfollowedEvent(_followerId, _followingId), default);

        _notifications.Verify(n => n.CreateAsync(
            _followingId, "unfollow", It.IsAny<object>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    // ── NotifUnfollows = true ─────────────────────────────────────────────────

    [Fact]
    public async Task Handle_NotifUnfollowsTrue_SendsNotification()
    {
        _db.UserPreferences.Add(new UserPreferences { UserId = _followingId, NotifUnfollows = true });
        await _db.SaveChangesAsync();

        await _sut.Handle(new UserUnfollowedEvent(_followerId, _followingId), default);

        _notifications.Verify(n => n.CreateAsync(
            _followingId, "unfollow", It.IsAny<object>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    // ── NotifUnfollows = false ────────────────────────────────────────────────

    [Fact]
    public async Task Handle_NotifUnfollowsFalse_SkipsNotification()
    {
        _db.UserPreferences.Add(new UserPreferences { UserId = _followingId, NotifUnfollows = false });
        await _db.SaveChangesAsync();

        await _sut.Handle(new UserUnfollowedEvent(_followerId, _followingId), default);

        _notifications.Verify(n => n.CreateAsync(
            It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<object>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    // ── Notification failure does not surface ─────────────────────────────────

    [Fact]
    public async Task Handle_NotificationFails_DoesNotThrow()
    {
        _notifications.Setup(n => n.CreateAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<object>(), It.IsAny<CancellationToken>()))
                      .ThrowsAsync(new Exception("db down"));

        // Handler catches and logs — must not rethrow
        await handler.Handle(new UserUnfollowedEvent(_followerId, _followingId), default);
    }

    // Alias so the private field can be reached from the outer test
    private UserUnfollowedEventHandler handler => _sut;
}
