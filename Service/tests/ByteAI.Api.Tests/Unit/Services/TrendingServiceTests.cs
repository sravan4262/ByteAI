using ByteAI.Api.Tests.Helpers;
using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Services.Trending;

namespace ByteAI.Api.Tests.Unit.Services;

public sealed class TrendingServiceTests : IDisposable
{
    private readonly ByteAI.Core.Infrastructure.Persistence.AppDbContext _db;
    private readonly TrendingService _sut;

    public TrendingServiceTests()
    {
        _db = DbContextFactory.Create();
        _sut = new TrendingService(_db);
    }

    public void Dispose() => _db.Dispose();

    // ── RecordClickAsync ──────────────────────────────────────────────────────

    [Fact]
    public async Task RecordClick_PersistsTrendingEvent()
    {
        var contentId = Guid.NewGuid();
        await _sut.RecordClickAsync(contentId, "byte", null, default);

        var evt = _db.TrendingEvents.Single();
        Assert.Equal(contentId, evt.ContentId);
        Assert.Equal("byte", evt.ContentType);
    }

    [Fact]
    public async Task RecordClick_WithUserId_StoresUserId()
    {
        var userId = Guid.NewGuid();
        await _sut.RecordClickAsync(Guid.NewGuid(), "byte", userId, default);

        Assert.Equal(userId, _db.TrendingEvents.Single().UserId);
    }

    [Fact]
    public async Task RecordClick_MultipleClicks_PersistsAll()
    {
        await _sut.RecordClickAsync(Guid.NewGuid(), "byte", null, default);
        await _sut.RecordClickAsync(Guid.NewGuid(), "byte", null, default);
        await _sut.RecordClickAsync(Guid.NewGuid(), "byte", null, default);

        Assert.Equal(3, _db.TrendingEvents.Count());
    }

    // ── GetTrendingIdsAsync ───────────────────────────────────────────────────

    [Fact]
    public async Task GetTrendingIds_OrdersByClickCountDescending()
    {
        var hot  = Guid.NewGuid();
        var cold = Guid.NewGuid();
        var now  = DateTime.UtcNow;

        // hot: 3 clicks, cold: 1 click — all within 24h
        _db.TrendingEvents.AddRange(
            new TrendingEvent { Id = Guid.NewGuid(), ContentId = hot,  ContentType = "byte", ClickedAt = now },
            new TrendingEvent { Id = Guid.NewGuid(), ContentId = hot,  ContentType = "byte", ClickedAt = now },
            new TrendingEvent { Id = Guid.NewGuid(), ContentId = hot,  ContentType = "byte", ClickedAt = now },
            new TrendingEvent { Id = Guid.NewGuid(), ContentId = cold, ContentType = "byte", ClickedAt = now });
        await _db.SaveChangesAsync();

        var result = await _sut.GetTrendingIdsAsync(new PaginationParams(1, 10), "byte", default);

        Assert.Equal(hot,  result[0]);
        Assert.Equal(cold, result[1]);
    }

    [Fact]
    public async Task GetTrendingIds_ExcludesClicksOlderThan24h()
    {
        var stale = Guid.NewGuid();
        var fresh = Guid.NewGuid();
        var now   = DateTime.UtcNow;

        _db.TrendingEvents.AddRange(
            new TrendingEvent { Id = Guid.NewGuid(), ContentId = stale, ContentType = "byte", ClickedAt = now.AddHours(-25) },
            new TrendingEvent { Id = Guid.NewGuid(), ContentId = fresh, ContentType = "byte", ClickedAt = now });
        await _db.SaveChangesAsync();

        var result = await _sut.GetTrendingIdsAsync(new PaginationParams(1, 10), "byte", default);

        Assert.Single(result);
        Assert.Equal(fresh, result[0]);
    }

    [Fact]
    public async Task GetTrendingIds_FiltersByContentType()
    {
        var byteId      = Guid.NewGuid();
        var interviewId = Guid.NewGuid();
        var now         = DateTime.UtcNow;

        _db.TrendingEvents.AddRange(
            new TrendingEvent { Id = Guid.NewGuid(), ContentId = byteId,      ContentType = "byte",      ClickedAt = now },
            new TrendingEvent { Id = Guid.NewGuid(), ContentId = interviewId, ContentType = "interview", ClickedAt = now });
        await _db.SaveChangesAsync();

        var result = await _sut.GetTrendingIdsAsync(new PaginationParams(1, 10), "byte", default);

        Assert.Single(result);
        Assert.Equal(byteId, result[0]);
    }

    [Fact]
    public async Task GetTrendingIds_Empty_ReturnsEmpty()
    {
        var result = await _sut.GetTrendingIdsAsync(new PaginationParams(1, 10), "byte", default);
        Assert.Empty(result);
    }
}
