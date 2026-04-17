using ByteAI.Api.Tests.Helpers;
using ByteAI.Core.Entities;
using ByteAI.Core.Events;
using ByteAI.Core.Services.AI;
using ByteAI.Core.Services.Badges;
using ByteAI.Core.Services.Bytes;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace ByteAI.Api.Tests.Unit.Events;

/// <summary>
/// Tests ByteCreatedEventHandler:
///  Step 1 — embed content and store (sync, awaited)
///  Step 2 — auto-tag via Groq (fire-and-forget Task.Run, not directly testable here)
///  Step 3 — quality score via Groq (fire-and-forget Task.Run)
///  Step 4 — XP to author
///  Step 5 — badge check
///  Step 6 — feed cache invalidation (feedCache is null in tests → skipped)
///
/// Fire-and-forget steps 2 and 3 are not awaited, so we don't assert their effects here.
/// We verify steps 1, 4, and 5.
/// </summary>
public sealed class ByteCreatedEventHandlerTests : IDisposable
{
    private readonly ByteAI.Core.Infrastructure.Persistence.AppDbContext _db;
    private readonly Mock<IEmbeddingService> _embedding = new();
    private readonly Mock<IGroqService> _groq = new();
    private readonly Mock<IByteService> _byteService = new();
    private readonly Mock<IBadgeService> _badgeService = new();
    private readonly Mock<IServiceScopeFactory> _scopeFactory = new();
    private readonly ByteCreatedEventHandler _sut;

    private readonly Guid _byteId = Guid.NewGuid();
    private readonly Guid _authorId = Guid.NewGuid();

    public ByteCreatedEventHandlerTests()
    {
        _db = DbContextFactory.Create();

        // Seed author user
        _db.Users.Add(new User
        {
            Id = _authorId,
            SupabaseUserId = "supabase_created",
            Username = "author",
            DisplayName = "Author"
        });
        _db.SaveChanges();

        // Embedding returns a fixed vector
        _embedding.Setup(e => e.EmbedDocumentAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                  .ReturnsAsync(new float[768]);

        // Badge check returns empty
        _badgeService.Setup(b => b.CheckAndAwardAsync(_authorId, BadgeTrigger.BytePosted, It.IsAny<CancellationToken>()))
                     .ReturnsAsync([]);

        // IServiceScopeFactory: scope opens a new scope that can resolve AppDbContext
        // (needed for fire-and-forget tasks 2 & 3 — but those are fire-and-forget so we just need no crash)
        var scope = new Mock<IServiceScope>();
        var provider = new Mock<IServiceProvider>();
        provider.Setup(p => p.GetService(typeof(ByteAI.Core.Infrastructure.Persistence.AppDbContext))).Returns(DbContextFactory.Create());
        scope.Setup(s => s.ServiceProvider).Returns(provider.Object);
        _scopeFactory.Setup(f => f.CreateScope()).Returns(scope.Object);

        _sut = new ByteCreatedEventHandler(
            _db, _embedding.Object, _groq.Object, _byteService.Object,
            _badgeService.Object, _scopeFactory.Object,
            NullLogger<ByteCreatedEventHandler>.Instance);
    }

    public void Dispose() => _db.Dispose();

    // ── Step 1: embedding store ───────────────────────────────────────────────

    [Fact]
    public async Task Handle_CallsEmbedDocumentAndStoresEmbedding()
    {
        var floats = new float[768];
        floats[0] = 0.9f;
        _embedding.Setup(e => e.EmbedDocumentAsync("Test Title Test Body", It.IsAny<CancellationToken>()))
                  .ReturnsAsync(floats);

        var notification = new ByteCreatedEvent(_byteId, _authorId, "Test Title", "Test Body", null);

        await _sut.Handle(notification, default);

        _byteService.Verify(b => b.UpdateEmbeddingAsync(_byteId, floats, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_EmbeddingFails_DoesNotThrow()
    {
        _embedding.Setup(e => e.EmbedDocumentAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                  .ThrowsAsync(new InvalidOperationException("embedding failed"));

        var notification = new ByteCreatedEvent(_byteId, _authorId, "Title", "Body", null);

        // Should not throw — embedding errors are caught and logged
        await _sut.Handle(notification, default);
    }

    // ── Step 4: XP award ──────────────────────────────────────────────────────

    [Fact]
    public async Task Handle_AwardsXpToAuthor_WhenXpActionExists()
    {
        _db.XpActionTypes.Add(new XpActionType
        {
            Id = Guid.NewGuid(),
            Name = "post_byte",
            Label = "Post Byte",
            XpAmount = 10,
            IsOneTime = false,
            IsActive = true
        });
        await _db.SaveChangesAsync();

        var notification = new ByteCreatedEvent(_byteId, _authorId, "Title", "Body", null);

        await _sut.Handle(notification, default);

        var user = await _db.Users.FindAsync([_authorId]);
        Assert.Equal(10, user!.Xp); // post_byte XP awarded
    }

    [Fact]
    public async Task Handle_FirstByteIsOneTime_AwardsOnlyOnce()
    {
        _db.XpActionTypes.AddRange(
            new XpActionType { Id = Guid.NewGuid(), Name = "post_byte", Label = "Post Byte", XpAmount = 10, IsOneTime = false, IsActive = true },
            new XpActionType { Id = Guid.NewGuid(), Name = "first_byte", Label = "First Byte", XpAmount = 50, IsOneTime = true, IsActive = true });
        await _db.SaveChangesAsync();

        var notification = new ByteCreatedEvent(_byteId, _authorId, "Title", "Body", null);

        await _sut.Handle(notification, default);
        await _sut.Handle(new ByteCreatedEvent(Guid.NewGuid(), _authorId, "Title2", "Body2", null), default);

        var user = await _db.Users.FindAsync([_authorId]);
        // post_byte: 10 × 2 = 20, first_byte: 50 × 1 = 50, total = 70
        Assert.Equal(70, user!.Xp);
    }

    // ── Step 5: Badge check ───────────────────────────────────────────────────

    [Fact]
    public async Task Handle_CallsBadgeCheckWithBytePostedTrigger()
    {
        var notification = new ByteCreatedEvent(_byteId, _authorId, "Title", "Body", null);

        await _sut.Handle(notification, default);

        _badgeService.Verify(b =>
            b.CheckAndAwardAsync(_authorId, BadgeTrigger.BytePosted, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task Handle_BadgeCheckFails_DoesNotThrow()
    {
        _badgeService.Setup(b => b.CheckAndAwardAsync(It.IsAny<Guid>(), It.IsAny<BadgeTrigger>(), It.IsAny<CancellationToken>()))
                     .ThrowsAsync(new Exception("badge service down"));

        var notification = new ByteCreatedEvent(_byteId, _authorId, "Title", "Body", null);

        // Should not throw
        await _sut.Handle(notification, default);
    }
}
