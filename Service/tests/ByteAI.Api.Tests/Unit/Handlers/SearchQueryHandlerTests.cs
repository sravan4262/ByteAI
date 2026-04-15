using ByteAI.Api.Tests.Helpers;
using ByteAI.Core.Commands.Search;
using ByteAI.Core.Entities;
using ByteAI.Core.Services.AI;
using ByteAI.Core.Services.Search;
using Pgvector;
using ByteEntity = ByteAI.Core.Entities.Byte;

namespace ByteAI.Api.Tests.Unit.Handlers;

public sealed class SearchQueryHandlerTests : IDisposable
{
    private readonly ByteAI.Core.Infrastructure.Persistence.AppDbContext _db;
    private readonly Mock<ISearchService>   _search    = new();
    private readonly Mock<IEmbeddingService> _embedding = new();

    private readonly Guid _userId = Guid.NewGuid();
    private readonly Guid _authorId = Guid.NewGuid();

    private static ByteEntity MakeByte(Guid authorId, string title) =>
        new() { Id = Guid.NewGuid(), AuthorId = authorId, Title = title, Body = "b", Type = "article", IsActive = true };

    private static Interview MakeInterview(Guid authorId, string title) =>
        new() { Id = Guid.NewGuid(), AuthorId = authorId, Title = title, Body = "b", Type = "qa", IsActive = true };

    public SearchQueryHandlerTests()
    {
        _db = DbContextFactory.Create();

        _db.Users.Add(new User { Id = _userId,   ClerkId = "s1", Username = "searcher", DisplayName = "S" });
        _db.Users.Add(new User { Id = _authorId, ClerkId = "s2", Username = "author",   DisplayName = "A" });
        _db.SaveChanges();

        // Default: embedding returns a zero vector
        _embedding.Setup(e => e.EmbedQueryAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                  .ReturnsAsync(new float[768]);

        _search.Setup(s => s.SearchBytesAsync(It.IsAny<string>(), It.IsAny<Vector?>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
               .ReturnsAsync([]);
        _search.Setup(s => s.SearchInterviewsAsync(It.IsAny<string>(), It.IsAny<Vector?>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
               .ReturnsAsync([]);
    }

    public void Dispose() => _db.Dispose();

    private SearchQueryHandler BuildHandler() => new(_search.Object, _embedding.Object, _db);

    // ── Type = "bytes" ────────────────────────────────────────────────────────

    [Fact]
    public async Task Search_TypeBytes_CallsSearchBytesOnly()
    {
        var bytes = new List<ByteEntity> { MakeByte(_authorId, "Go Channels") };
        _search.Setup(s => s.SearchBytesAsync("go", It.IsAny<Vector?>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
               .ReturnsAsync(bytes);

        var result = await BuildHandler().Handle(new SearchQuery("go", Type: "bytes"), default);

        Assert.Single(result);
        Assert.Equal("byte", result[0].ContentType);
        _search.Verify(s => s.SearchInterviewsAsync(It.IsAny<string>(), It.IsAny<Vector?>(), It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    // ── Type = "interviews" ────────────────────────────────────────────────────

    [Fact]
    public async Task Search_TypeInterviews_CallsSearchInterviewsOnly()
    {
        var interviews = new List<Interview> { MakeInterview(_authorId, "System Design") };
        _search.Setup(s => s.SearchInterviewsAsync("design", It.IsAny<Vector?>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
               .ReturnsAsync(interviews);

        var result = await BuildHandler().Handle(new SearchQuery("design", Type: "interviews"), default);

        Assert.Single(result);
        Assert.Equal("interview", result[0].ContentType);
        _search.Verify(s => s.SearchBytesAsync(It.IsAny<string>(), It.IsAny<Vector?>(), It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    // ── Type = "all" ──────────────────────────────────────────────────────────

    [Fact]
    public async Task Search_TypeAll_MergesAndSortsByRecency()
    {
        var older = MakeByte(_authorId, "Older");       older.CreatedAt = DateTime.UtcNow.AddDays(-2);
        var newer = MakeInterview(_authorId, "Newer");  newer.CreatedAt = DateTime.UtcNow;

        _search.Setup(s => s.SearchBytesAsync(It.IsAny<string>(), It.IsAny<Vector?>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
               .ReturnsAsync([older]);
        _search.Setup(s => s.SearchInterviewsAsync(It.IsAny<string>(), It.IsAny<Vector?>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
               .ReturnsAsync([newer]);

        var result = await BuildHandler().Handle(new SearchQuery("q", Limit: 10, Type: "all"), default);

        Assert.Equal(2, result.Count);
        // Newer (interview) should come first
        Assert.Equal("interview", result[0].ContentType);
        Assert.Equal("byte", result[1].ContentType);
    }

    // ── Query present → embedding called ──────────────────────────────────────

    [Fact]
    public async Task Search_WithQuery_EmbedsQueryString()
    {
        await BuildHandler().Handle(new SearchQuery("rust async", Type: "bytes"), default);

        _embedding.Verify(e => e.EmbedQueryAsync("rust async", It.IsAny<CancellationToken>()), Times.Once);
    }

    // ── No query, with userId → uses user interest embedding ─────────────────

    [Fact]
    public async Task Search_NoQuery_WithUserId_UsesInterestEmbedding()
    {
        var vec = new float[768]; vec[0] = 0.5f;
        var user = _db.Users.Find(_userId)!;
        user.InterestEmbedding = new Vector(vec);
        await _db.SaveChangesAsync();

        await BuildHandler().Handle(new SearchQuery("", UserId: _userId, Type: "bytes"), default);

        // Embedding service NOT called — interest embedding loaded from DB instead
        _embedding.Verify(e => e.EmbedQueryAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    // ── No query, no userId → no embedding ───────────────────────────────────

    [Fact]
    public async Task Search_NoQuery_NoUserId_NoEmbedding()
    {
        await BuildHandler().Handle(new SearchQuery("", Type: "bytes"), default);

        _embedding.Verify(e => e.EmbedQueryAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
