using ByteAI.Api.Tests.Helpers;
using ByteAI.Core.Commands.Feed;
using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using ByteEntity = ByteAI.Core.Entities.Byte;

namespace ByteAI.Api.Tests.Unit.Handlers;

public sealed class FeedQueryHandlerTests : IDisposable
{
    private readonly ByteAI.Core.Infrastructure.Persistence.AppDbContext _db;

    private readonly Guid _userId   = Guid.NewGuid();
    private readonly Guid _authorId = Guid.NewGuid();
    private readonly Guid _otherId  = Guid.NewGuid();
    private readonly Guid _byteId   = Guid.NewGuid();

    public FeedQueryHandlerTests()
    {
        _db = DbContextFactory.Create();

        _db.Users.AddRange(
            new User { Id = _userId,   SupabaseUserId = "f1", Username = "viewer", DisplayName = "Viewer" },
            new User { Id = _authorId, SupabaseUserId = "f2", Username = "author", DisplayName = "Author" },
            new User { Id = _otherId,  SupabaseUserId = "f3", Username = "other",  DisplayName = "Other"  });

        _db.Bytes.Add(new ByteEntity
        {
            Id = _byteId, AuthorId = _authorId, Title = "Active Byte",
            Body = "b", Type = "article", IsActive = true,
            CreatedAt = DateTime.UtcNow
        });

        _db.SaveChanges();
    }

    public void Dispose() => _db.Dispose();

    private GetFeedQueryHandler BuildHandler() => new(_db);
    private static PaginationParams Page1(int size = 20) => new(1, size);

    // ── for_you mode ──────────────────────────────────────────────────────────

    [Fact]
    public async Task ForYou_ReturnsActiveBytes()
    {
        _db.Bytes.Add(new ByteEntity
        {
            AuthorId = _authorId, Title = "Inactive", Body = "b", Type = "article", IsActive = false
        });
        await _db.SaveChangesAsync();

        var result = await BuildHandler().Handle(
            new GetFeedQuery(null, Page1(), Sort: "for_you"), default);

        Assert.Equal(1, result.Total);
        Assert.Equal("Active Byte", result.Items[0].Title);
    }

    [Fact]
    public async Task ForYou_OrdersByCreatedAtDesc()
    {
        var older = new ByteEntity
        {
            AuthorId = _authorId, Title = "Older", Body = "b", Type = "article",
            IsActive = true, CreatedAt = DateTime.UtcNow.AddDays(-1)
        };
        var newer = new ByteEntity
        {
            AuthorId = _authorId, Title = "Newer", Body = "b", Type = "article",
            IsActive = true, CreatedAt = DateTime.UtcNow.AddHours(1)
        };
        _db.Bytes.AddRange(older, newer);
        await _db.SaveChangesAsync();

        var result = await BuildHandler().Handle(
            new GetFeedQuery(null, Page1(), Sort: "for_you"), default);

        Assert.Equal("Newer", result.Items[0].Title);
    }

    [Fact]
    public async Task ForYou_Paginated_ReturnsCorrectPage()
    {
        for (var i = 0; i < 5; i++)
            _db.Bytes.Add(new ByteEntity
            {
                AuthorId = _authorId, Title = $"B{i}", Body = "b", Type = "article", IsActive = true,
                CreatedAt = DateTime.UtcNow.AddMinutes(-i)
            });
        await _db.SaveChangesAsync();

        // Page 2 of page-size 3 → should return 3 items (6 total active)
        var result = await BuildHandler().Handle(
            new GetFeedQuery(null, new PaginationParams(2, 3), Sort: "for_you"), default);

        Assert.Equal(6, result.Total);
        Assert.Equal(3, result.Items.Count);
    }

    // ── following mode ────────────────────────────────────────────────────────

    [Fact]
    public async Task Following_NoUserId_ReturnsEmpty()
    {
        var result = await BuildHandler().Handle(
            new GetFeedQuery(null, Page1(), Sort: "following"), default);

        Assert.Equal(0, result.Total);
        Assert.Empty(result.Items);
    }

    [Fact]
    public async Task Following_UserFollowsNobody_ReturnsEmpty()
    {
        var result = await BuildHandler().Handle(
            new GetFeedQuery(_userId, Page1(), Sort: "following"), default);

        Assert.Equal(0, result.Total);
        Assert.Empty(result.Items);
    }

    [Fact]
    public async Task Following_UserFollowsAuthor_ReturnsAuthorBytes()
    {
        _db.UserFollowings.Add(new UserFollowing { UserId = _userId, FollowingId = _authorId });
        await _db.SaveChangesAsync();

        var result = await BuildHandler().Handle(
            new GetFeedQuery(_userId, Page1(), Sort: "following"), default);

        Assert.Equal(1, result.Total);
        Assert.Equal("Active Byte", result.Items[0].Title);
    }

    [Fact]
    public async Task Following_ExcludesUnfollowedAuthors()
    {
        // userId follows otherId only — authorId byte should NOT appear
        _db.UserFollowings.Add(new UserFollowing { UserId = _userId, FollowingId = _otherId });
        await _db.SaveChangesAsync();

        var result = await BuildHandler().Handle(
            new GetFeedQuery(_userId, Page1(), Sort: "following"), default);

        Assert.Equal(0, result.Total);
    }

    // ── trending mode ─────────────────────────────────────────────────────────

    [Fact]
    public async Task Trending_NoEvents_FallsBackToRecencyOrder()
    {
        // No trending events → falls back to latest bytes
        var result = await BuildHandler().Handle(
            new GetFeedQuery(null, Page1(), Sort: "trending"), default);

        Assert.Equal(1, result.Total);
        Assert.Equal("Active Byte", result.Items[0].Title);
    }

    [Fact]
    public async Task Trending_WithRecentViews_OrdersByViewCount()
    {
        var byte2Id = Guid.NewGuid();
        _db.Bytes.Add(new ByteEntity
        {
            Id = byte2Id, AuthorId = _authorId, Title = "Less Trending",
            Body = "b", Type = "article", IsActive = true
        });

        // _byteId gets 3 views, byte2Id gets 1 view — all within 24h
        _db.UserViews.AddRange(
            new UserView { ByteId = _byteId,  UserId = _userId,   ViewedAt = DateTime.UtcNow },
            new UserView { ByteId = _byteId,  UserId = _otherId,  ViewedAt = DateTime.UtcNow },
            new UserView { ByteId = _byteId,  UserId = Guid.NewGuid(), ViewedAt = DateTime.UtcNow },
            new UserView { ByteId = byte2Id,  UserId = _userId,   ViewedAt = DateTime.UtcNow });
        await _db.SaveChangesAsync();

        var result = await BuildHandler().Handle(
            new GetFeedQuery(null, Page1(), Sort: "trending"), default);

        Assert.Equal(2, result.Total);
        Assert.Equal("Active Byte", result.Items[0].Title);
        Assert.Equal("Less Trending", result.Items[1].Title);
    }

    [Fact]
    public async Task Trending_OldViewsIgnored_FallsBackToLatest()
    {
        // View is 49h old — outside the 48h window
        _db.UserViews.Add(new UserView
        {
            ByteId = _byteId, UserId = _userId,
            ViewedAt = DateTime.UtcNow.AddHours(-49)
        });
        await _db.SaveChangesAsync();

        var result = await BuildHandler().Handle(
            new GetFeedQuery(null, Page1(), Sort: "trending"), default);

        // Falls back to recency — still returns the byte
        Assert.Equal(1, result.Total);
    }
}
