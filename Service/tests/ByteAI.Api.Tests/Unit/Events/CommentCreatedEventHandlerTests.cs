using ByteAI.Api.Tests.Helpers;
using ByteAI.Core.Entities;
using ByteAI.Core.Events;
using Microsoft.Extensions.Logging.Abstractions;

namespace ByteAI.Api.Tests.Unit.Events;

/// <summary>
/// Tests CommentCreatedEventHandler:
///  - Awards XP to the comment author (post_comment)
///  - Awards XP to the content author (receive_comment)
/// </summary>
public sealed class CommentCreatedEventHandlerTests : IDisposable
{
    private readonly ByteAI.Core.Infrastructure.Persistence.AppDbContext _db;
    private readonly CommentCreatedEventHandler _sut;

    private readonly Guid _commentAuthorId = Guid.NewGuid();
    private readonly Guid _contentAuthorId = Guid.NewGuid();

    public CommentCreatedEventHandlerTests()
    {
        _db = DbContextFactory.Create();

        _db.Users.AddRange(
            new User { Id = _commentAuthorId, SupabaseUserId = "clerk_c1", Username = "commenter", DisplayName = "Commenter", Xp = 0 },
            new User { Id = _contentAuthorId, SupabaseUserId = "clerk_c2", Username = "content_author", DisplayName = "Content Author", Xp = 0 });
        _db.SaveChanges();

        _sut = new CommentCreatedEventHandler(_db, NullLogger<CommentCreatedEventHandler>.Instance);
    }

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task Handle_AwardsXpToCommentAuthor()
    {
        _db.XpActionTypes.Add(new XpActionType
        {
            Id = Guid.NewGuid(),
            Name = "post_comment",
            Label = "Post Comment",
            XpAmount = 5,
            IsOneTime = false,
            IsActive = true
        });
        await _db.SaveChangesAsync();

        var ev = new CommentCreatedEvent(Guid.NewGuid(), _commentAuthorId, _contentAuthorId);
        await _sut.Handle(ev, default);

        var commenter = await _db.Users.FindAsync([_commentAuthorId]);
        Assert.Equal(5, commenter!.Xp);
    }

    [Fact]
    public async Task Handle_AwardsXpToContentAuthor()
    {
        _db.XpActionTypes.Add(new XpActionType
        {
            Id = Guid.NewGuid(),
            Name = "receive_comment",
            Label = "Receive Comment",
            XpAmount = 3,
            IsOneTime = false,
            IsActive = true
        });
        await _db.SaveChangesAsync();

        var ev = new CommentCreatedEvent(Guid.NewGuid(), _commentAuthorId, _contentAuthorId);
        await _sut.Handle(ev, default);

        var contentAuthor = await _db.Users.FindAsync([_contentAuthorId]);
        Assert.Equal(3, contentAuthor!.Xp);
    }

    [Fact]
    public async Task Handle_AwardsBothXpTypes_Simultaneously()
    {
        _db.XpActionTypes.AddRange(
            new XpActionType { Id = Guid.NewGuid(), Name = "post_comment", Label = "Post Comment", XpAmount = 5, IsOneTime = false, IsActive = true },
            new XpActionType { Id = Guid.NewGuid(), Name = "receive_comment", Label = "Receive Comment", XpAmount = 3, IsOneTime = false, IsActive = true });
        await _db.SaveChangesAsync();

        var ev = new CommentCreatedEvent(Guid.NewGuid(), _commentAuthorId, _contentAuthorId);
        await _sut.Handle(ev, default);

        var commenter = await _db.Users.FindAsync([_commentAuthorId]);
        var contentAuthor = await _db.Users.FindAsync([_contentAuthorId]);
        Assert.Equal(5, commenter!.Xp);
        Assert.Equal(3, contentAuthor!.Xp);
    }

    [Fact]
    public async Task Handle_SameUserCommentingOnOwnContent_XpAccumulatesCorrectly()
    {
        // Same user is both comment author AND content author
        _db.XpActionTypes.AddRange(
            new XpActionType { Id = Guid.NewGuid(), Name = "post_comment", Label = "Post Comment", XpAmount = 5, IsOneTime = false, IsActive = true },
            new XpActionType { Id = Guid.NewGuid(), Name = "receive_comment", Label = "Receive Comment", XpAmount = 3, IsOneTime = false, IsActive = true });
        await _db.SaveChangesAsync();

        var ev = new CommentCreatedEvent(Guid.NewGuid(), _commentAuthorId, _commentAuthorId);
        await _sut.Handle(ev, default);

        var user = await _db.Users.FindAsync([_commentAuthorId]);
        Assert.Equal(8, user!.Xp); // 5 (post_comment) + 3 (receive_comment)
    }

    [Fact]
    public async Task Handle_NoXpActions_DoesNotThrowAndNoXpAwarded()
    {
        var ev = new CommentCreatedEvent(Guid.NewGuid(), _commentAuthorId, _contentAuthorId);
        await _sut.Handle(ev, default); // should not throw

        var commenter = await _db.Users.FindAsync([_commentAuthorId]);
        Assert.Equal(0, commenter!.Xp);
    }
}
