using ByteAI.Api.Tests.Helpers;
using ByteAI.Core.Entities;
using ByteAI.Core.Events;
using ByteAI.Core.Services.Badges;
using ByteAI.Core.Services.Notifications;
using ByteAI.Core.Services.Push;
using Microsoft.Extensions.Logging.Abstractions;

namespace ByteAI.Api.Tests.Unit.Events;

/// <summary>
/// Tests ByteReactedEventHandler:
///  Step 1 — XP to byte author
///  Step 2 — notification to byte author (respects notification preferences)
///  Step 3 — badge check for author
/// </summary>
public sealed class ByteReactedEventHandlerTests : IDisposable
{
    private readonly ByteAI.Core.Infrastructure.Persistence.AppDbContext _db;
    private readonly Mock<IBadgeService> _badgeService = new();
    private readonly Mock<INotificationService> _notifications = new();
    private readonly Mock<IPushDispatcher> _pushDispatcher = new();
    private readonly ByteReactedEventHandler _sut;

    private readonly Guid _authorId = Guid.NewGuid();
    private readonly Guid _reactorId = Guid.NewGuid();
    private readonly Guid _byteId = Guid.NewGuid();

    public ByteReactedEventHandlerTests()
    {
        _db = DbContextFactory.Create();

        // Seed author
        _db.Users.Add(new User
        {
            Id = _authorId,
            SupabaseUserId = "supabase_author",
            Username = "author",
            DisplayName = "Author",
            Xp = 0
        });
        // Seed reactor
        _db.Users.Add(new User
        {
            Id = _reactorId,
            SupabaseUserId = "supabase_reactor",
            Username = "reactor",
            DisplayName = "Reactor"
        });
        _db.SaveChanges();

        _badgeService.Setup(b => b.CheckAndAwardAsync(_authorId, BadgeTrigger.ReactionReceived, It.IsAny<CancellationToken>()))
                     .ReturnsAsync([]);

        _notifications.Setup(n => n.CreateAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<object>(), It.IsAny<CancellationToken>()))
                      .Returns(Task.CompletedTask);

        _sut = new ByteReactedEventHandler(
            _db, _badgeService.Object, _notifications.Object, _pushDispatcher.Object,
            NullLogger<ByteReactedEventHandler>.Instance);
    }

    public void Dispose() => _db.Dispose();

    // ── Step 1: XP award ──────────────────────────────────────────────────────

    [Fact]
    public async Task Handle_AwardsXpToAuthor()
    {
        _db.XpActionTypes.Add(new XpActionType
        {
            Id = Guid.NewGuid(),
            Name = "receive_reaction",
            Label = "Receive Reaction",
            XpAmount = 2,
            IsOneTime = false,
            IsActive = true
        });
        await _db.SaveChangesAsync();

        var ev = new ByteReactedEvent(_byteId, _reactorId, _authorId, "like");
        await _sut.Handle(ev, default);

        var author = await _db.Users.FindAsync([_authorId]);
        Assert.Equal(2, author!.Xp);
    }

    // ── Step 2: Notification ──────────────────────────────────────────────────

    [Fact]
    public async Task Handle_NoPreferences_SendsNotification()
    {
        // No UserPreferences row → treats as default (notifications enabled)
        var ev = new ByteReactedEvent(_byteId, _reactorId, _authorId, "like");
        await _sut.Handle(ev, default);

        _notifications.Verify(n =>
            n.CreateAsync(_authorId, "like", It.IsAny<object>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task Handle_NotifReactionsEnabled_SendsNotification()
    {
        _db.UserPreferences.Add(new UserPreferences
        {
            UserId = _authorId,
            NotifReactions = true
        });
        await _db.SaveChangesAsync();

        var ev = new ByteReactedEvent(_byteId, _reactorId, _authorId, "like");
        await _sut.Handle(ev, default);

        _notifications.Verify(n =>
            n.CreateAsync(_authorId, "like", It.IsAny<object>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task Handle_NotifReactionsDisabled_SkipsNotification()
    {
        _db.UserPreferences.Add(new UserPreferences
        {
            UserId = _authorId,
            NotifReactions = false
        });
        await _db.SaveChangesAsync();

        var ev = new ByteReactedEvent(_byteId, _reactorId, _authorId, "like");
        await _sut.Handle(ev, default);

        _notifications.Verify(n =>
            n.CreateAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<object>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    // ── Step 3: Badge check ───────────────────────────────────────────────────

    [Fact]
    public async Task Handle_ChecksBadgeWithReactionReceivedTrigger()
    {
        var ev = new ByteReactedEvent(_byteId, _reactorId, _authorId, "like");
        await _sut.Handle(ev, default);

        _badgeService.Verify(b =>
            b.CheckAndAwardAsync(_authorId, BadgeTrigger.ReactionReceived, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task Handle_BadgeCheckFails_DoesNotThrow()
    {
        _badgeService.Setup(b => b.CheckAndAwardAsync(_authorId, BadgeTrigger.ReactionReceived, It.IsAny<CancellationToken>()))
                     .ThrowsAsync(new Exception("badge error"));

        var ev = new ByteReactedEvent(_byteId, _reactorId, _authorId, "like");

        await _sut.Handle(ev, default); // should not throw
    }
}
