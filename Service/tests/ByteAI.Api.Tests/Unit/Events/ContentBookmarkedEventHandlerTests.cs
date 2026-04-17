using ByteAI.Api.Tests.Helpers;
using ByteAI.Core.Entities;
using ByteAI.Core.Events;
using Microsoft.Extensions.Logging.Abstractions;

namespace ByteAI.Api.Tests.Unit.Events;

/// <summary>
/// Tests ContentBookmarkedEventHandler:
///  - Awards XP to content author with action "byte_saved_by_user" for Byte bookmarks
///  - Awards XP to content author with action "interview_saved_by_user" for Interview bookmarks
/// </summary>
public sealed class ContentBookmarkedEventHandlerTests : IDisposable
{
    private readonly ByteAI.Core.Infrastructure.Persistence.AppDbContext _db;
    private readonly ContentBookmarkedEventHandler _sut;

    private readonly Guid _saverId = Guid.NewGuid();
    private readonly Guid _contentAuthorId = Guid.NewGuid();

    public ContentBookmarkedEventHandlerTests()
    {
        _db = DbContextFactory.Create();

        _db.Users.AddRange(
            new User { Id = _saverId, SupabaseUserId = "supabase_saver", Username = "saver", DisplayName = "Saver" },
            new User { Id = _contentAuthorId, SupabaseUserId = "supabase_creator", Username = "creator", DisplayName = "Creator", Xp = 0 });
        _db.SaveChanges();

        _sut = new ContentBookmarkedEventHandler(_db, NullLogger<ContentBookmarkedEventHandler>.Instance);
    }

    public void Dispose() => _db.Dispose();

    // ── Byte bookmark ─────────────────────────────────────────────────────────

    [Fact]
    public async Task Handle_ByteBookmark_AwardsXpWithByteSavedAction()
    {
        _db.XpActionTypes.Add(new XpActionType
        {
            Id = Guid.NewGuid(),
            Name = "byte_saved_by_user",
            Label = "Byte Saved",
            XpAmount = 2,
            IsOneTime = false,
            IsActive = true
        });
        await _db.SaveChangesAsync();

        var ev = new ContentBookmarkedEvent(_saverId, _contentAuthorId, BookmarkedContentType.Byte);
        await _sut.Handle(ev, default);

        var author = await _db.Users.FindAsync([_contentAuthorId]);
        Assert.Equal(2, author!.Xp);
    }

    // ── Interview bookmark ────────────────────────────────────────────────────

    [Fact]
    public async Task Handle_InterviewBookmark_AwardsXpWithInterviewSavedAction()
    {
        _db.XpActionTypes.Add(new XpActionType
        {
            Id = Guid.NewGuid(),
            Name = "interview_saved_by_user",
            Label = "Interview Saved",
            XpAmount = 3,
            IsOneTime = false,
            IsActive = true
        });
        await _db.SaveChangesAsync();

        var ev = new ContentBookmarkedEvent(_saverId, _contentAuthorId, BookmarkedContentType.Interview);
        await _sut.Handle(ev, default);

        var author = await _db.Users.FindAsync([_contentAuthorId]);
        Assert.Equal(3, author!.Xp);
    }

    // ── No XP action configured ───────────────────────────────────────────────

    [Fact]
    public async Task Handle_NoXpAction_DoesNotThrow()
    {
        var ev = new ContentBookmarkedEvent(_saverId, _contentAuthorId, BookmarkedContentType.Byte);
        await _sut.Handle(ev, default); // should not throw

        var author = await _db.Users.FindAsync([_contentAuthorId]);
        Assert.Equal(0, author!.Xp); // no change
    }

    // ── Action type distinction ───────────────────────────────────────────────

    [Fact]
    public async Task Handle_ByteBookmark_DoesNotUseInterviewAction()
    {
        _db.XpActionTypes.AddRange(
            new XpActionType { Id = Guid.NewGuid(), Name = "byte_saved_by_user", Label = "Byte Saved", XpAmount = 2, IsOneTime = false, IsActive = true },
            new XpActionType { Id = Guid.NewGuid(), Name = "interview_saved_by_user", Label = "Interview Saved", XpAmount = 99, IsOneTime = false, IsActive = true });
        await _db.SaveChangesAsync();

        var ev = new ContentBookmarkedEvent(_saverId, _contentAuthorId, BookmarkedContentType.Byte);
        await _sut.Handle(ev, default);

        var author = await _db.Users.FindAsync([_contentAuthorId]);
        Assert.Equal(2, author!.Xp); // only byte_saved XP, not 99
    }

    // ── Multiple bookmarks ────────────────────────────────────────────────────

    [Fact]
    public async Task Handle_MultipleBookmarks_AccumulatesXp()
    {
        _db.XpActionTypes.Add(new XpActionType
        {
            Id = Guid.NewGuid(),
            Name = "byte_saved_by_user",
            Label = "Byte Saved",
            XpAmount = 2,
            IsOneTime = false,
            IsActive = true
        });
        await _db.SaveChangesAsync();

        await _sut.Handle(new ContentBookmarkedEvent(_saverId, _contentAuthorId, BookmarkedContentType.Byte), default);
        await _sut.Handle(new ContentBookmarkedEvent(Guid.NewGuid(), _contentAuthorId, BookmarkedContentType.Byte), default);

        var author = await _db.Users.FindAsync([_contentAuthorId]);
        Assert.Equal(4, author!.Xp); // 2 × 2
    }
}
