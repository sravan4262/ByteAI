using ByteAI.Api.Tests.Helpers;
using ByteAI.Core.Entities;
using ByteAI.Core.Events;
using ByteAI.Core.Services.Badges;
using ByteAI.Core.Services.Notifications;
using Microsoft.Extensions.Logging.Abstractions;

namespace ByteAI.Api.Tests.Unit.Events;

/// <summary>
/// Tests UserFollowedEventHandler:
///  Step 1 — XP to the user who was followed
///  Step 2 — notification to the user who was followed (respects NotifFollowers pref)
///  Step 3 — badge check for the user who was followed
/// </summary>
public sealed class UserFollowedEventHandlerTests : IDisposable
{
    private readonly ByteAI.Core.Infrastructure.Persistence.AppDbContext _db;
    private readonly Mock<INotificationService> _notifications = new();
    private readonly Mock<IBadgeService> _badgeService = new();
    private readonly UserFollowedEventHandler _sut;

    private readonly Guid _followerId = Guid.NewGuid();
    private readonly Guid _followingId = Guid.NewGuid();

    public UserFollowedEventHandlerTests()
    {
        _db = DbContextFactory.Create();

        _db.Users.AddRange(
            new User { Id = _followerId, SupabaseUserId = "clerk_f1", Username = "follower", DisplayName = "Follower" },
            new User { Id = _followingId, SupabaseUserId = "clerk_f2", Username = "following", DisplayName = "Following", Xp = 0 });
        _db.SaveChanges();

        _notifications.Setup(n => n.CreateAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<object>(), It.IsAny<CancellationToken>()))
                      .Returns(Task.CompletedTask);

        _badgeService.Setup(b => b.CheckAndAwardAsync(_followingId, BadgeTrigger.FollowReceived, It.IsAny<CancellationToken>()))
                     .ReturnsAsync([]);

        _sut = new UserFollowedEventHandler(
            _db, _notifications.Object, _badgeService.Object,
            NullLogger<UserFollowedEventHandler>.Instance);
    }

    public void Dispose() => _db.Dispose();

    // ── Step 1: XP award ──────────────────────────────────────────────────────

    [Fact]
    public async Task Handle_AwardsXpToFollowedUser()
    {
        _db.XpActionTypes.Add(new XpActionType
        {
            Id = Guid.NewGuid(),
            Name = "get_followed",
            Label = "Get Followed",
            XpAmount = 5,
            IsOneTime = false,
            IsActive = true
        });
        await _db.SaveChangesAsync();

        var ev = new UserFollowedEvent(_followerId, _followingId);
        await _sut.Handle(ev, default);

        var user = await _db.Users.FindAsync([_followingId]);
        Assert.Equal(5, user!.Xp);
    }

    // ── Step 2: Notification ──────────────────────────────────────────────────

    [Fact]
    public async Task Handle_NoPreferences_SendsFollowNotification()
    {
        var ev = new UserFollowedEvent(_followerId, _followingId);
        await _sut.Handle(ev, default);

        _notifications.Verify(n =>
            n.CreateAsync(_followingId, "follow", It.IsAny<object>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task Handle_NotifFollowersEnabled_SendsNotification()
    {
        _db.UserPreferences.Add(new UserPreferences
        {
            UserId = _followingId,
            NotifFollowers = true
        });
        await _db.SaveChangesAsync();

        var ev = new UserFollowedEvent(_followerId, _followingId);
        await _sut.Handle(ev, default);

        _notifications.Verify(n =>
            n.CreateAsync(_followingId, "follow", It.IsAny<object>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task Handle_NotifFollowersDisabled_SkipsNotification()
    {
        _db.UserPreferences.Add(new UserPreferences
        {
            UserId = _followingId,
            NotifFollowers = false
        });
        await _db.SaveChangesAsync();

        var ev = new UserFollowedEvent(_followerId, _followingId);
        await _sut.Handle(ev, default);

        _notifications.Verify(n =>
            n.CreateAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<object>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    // ── Step 3: Badge check ───────────────────────────────────────────────────

    [Fact]
    public async Task Handle_ChecksBadgeWithFollowReceivedTrigger()
    {
        var ev = new UserFollowedEvent(_followerId, _followingId);
        await _sut.Handle(ev, default);

        _badgeService.Verify(b =>
            b.CheckAndAwardAsync(_followingId, BadgeTrigger.FollowReceived, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task Handle_BadgeCheckFails_DoesNotThrow()
    {
        _badgeService.Setup(b => b.CheckAndAwardAsync(_followingId, BadgeTrigger.FollowReceived, It.IsAny<CancellationToken>()))
                     .ThrowsAsync(new Exception("badge failure"));

        var ev = new UserFollowedEvent(_followerId, _followingId);

        await _sut.Handle(ev, default); // must not throw
    }

    [Fact]
    public async Task Handle_NotificationFails_DoesNotThrow()
    {
        _notifications.Setup(n => n.CreateAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<object>(), It.IsAny<CancellationToken>()))
                      .ThrowsAsync(new Exception("notification service down"));

        var ev = new UserFollowedEvent(_followerId, _followingId);

        await _sut.Handle(ev, default); // caught by try/catch in handler
    }
}
