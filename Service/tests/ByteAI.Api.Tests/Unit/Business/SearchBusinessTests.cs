using ByteAI.Core.Business;
using ByteAI.Core.Commands.Search;
using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure.Services;
using ByteAI.Core.Services.AI;
using ByteAI.Core.Services.Search;
using Pgvector;
using ByteEntity = ByteAI.Core.Entities.Byte;

namespace ByteAI.Api.Tests.Unit.Business;

public sealed class SearchBusinessTests
{
    private readonly Mock<ISearchService> _searchService = new();
    private readonly Mock<IEmbeddingService> _embedding = new();
    private readonly Mock<ICurrentUserService> _currentUser = new();
    private readonly SearchBusiness _sut;

    public SearchBusinessTests()
    {
        _sut = new SearchBusiness(_searchService.Object, _embedding.Object, _currentUser.Object);
    }

    // ── SearchContentAsync — bytes ─────────────────────────────────────────────

    [Fact]
    public async Task SearchContent_BytesType_OnlyQueriesBytes()
    {
        _embedding.Setup(e => e.EmbedQueryAsync("react hooks", default))
                  .ReturnsAsync(new float[768]);

        var byteItems = new List<ByteEntity>
        {
            new() { Id = Guid.NewGuid(), Title = "React Hooks", Body = "body", Type = "article", AuthorId = Guid.NewGuid(), CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
        };
        _searchService
            .Setup(s => s.SearchBytesAsync("react hooks", It.IsAny<Vector?>(), 10, default, It.IsAny<Guid?>()))
            .ReturnsAsync(byteItems);

        var results = await _sut.SearchContentAsync("react hooks", "bytes", 10, default);

        Assert.Single(results);
        Assert.Equal("byte", results[0].ContentType);
        Assert.Equal("React Hooks", results[0].Title);
        _searchService.Verify(s => s.SearchInterviewsAsync(It.IsAny<string>(), It.IsAny<Vector?>(), It.IsAny<int>(), default, It.IsAny<Guid?>()), Times.Never);
    }

    // ── SearchContentAsync — interviews ───────────────────────────────────────

    [Fact]
    public async Task SearchContent_InterviewsType_OnlyQueriesInterviews()
    {
        _embedding.Setup(e => e.EmbedQueryAsync("system design", default))
                  .ReturnsAsync(new float[768]);

        var interviews = new List<Interview>
        {
            new() { Id = Guid.NewGuid(), Title = "System Design", Body = "body", Type = "article", AuthorId = Guid.NewGuid(), CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
        };
        _searchService
            .Setup(s => s.SearchInterviewsAsync("system design", It.IsAny<Vector?>(), 10, default, It.IsAny<Guid?>()))
            .ReturnsAsync(interviews);

        var results = await _sut.SearchContentAsync("system design", "interviews", 10, default);

        Assert.Single(results);
        Assert.Equal("interview", results[0].ContentType);
        _searchService.Verify(s => s.SearchBytesAsync(It.IsAny<string>(), It.IsAny<Vector?>(), It.IsAny<int>(), default, It.IsAny<Guid?>()), Times.Never);
    }

    // ── SearchContentAsync — all ──────────────────────────────────────────────

    [Fact]
    public async Task SearchContent_AllType_QueriesBothAndMerges()
    {
        _embedding.Setup(e => e.EmbedQueryAsync("python", default)).ReturnsAsync(new float[768]);

        _searchService
            .Setup(s => s.SearchBytesAsync("python", It.IsAny<Vector?>(), 5, default, It.IsAny<Guid?>()))
            .ReturnsAsync([new() { Id = Guid.NewGuid(), Title = "Python Tips", Body = "b", Type = "article", AuthorId = Guid.NewGuid(), CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }]);
        _searchService
            .Setup(s => s.SearchInterviewsAsync("python", It.IsAny<Vector?>(), 5, default, It.IsAny<Guid?>()))
            .ReturnsAsync([new() { Id = Guid.NewGuid(), Title = "Python Interview", Body = "b", Type = "article", AuthorId = Guid.NewGuid(), CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }]);

        var results = await _sut.SearchContentAsync("python", "all", 5, default);

        Assert.Equal(2, results.Count);
        Assert.Contains(results, r => r.ContentType == "byte");
        Assert.Contains(results, r => r.ContentType == "interview");
    }

    [Fact]
    public async Task SearchContent_AllType_ResultsCappedAtLimit()
    {
        _embedding.Setup(e => e.EmbedQueryAsync("go", default)).ReturnsAsync(new float[768]);

        var manyBytes = Enumerable.Range(0, 5).Select(_ =>
            new ByteEntity { Id = Guid.NewGuid(), Title = "Go", Body = "b", Type = "article", AuthorId = Guid.NewGuid(), CreatedAt = DateTime.UtcNow.AddSeconds(-1), UpdatedAt = DateTime.UtcNow }).ToList();
        var manyInterviews = Enumerable.Range(0, 5).Select(_ =>
            new Interview { Id = Guid.NewGuid(), Title = "Go Interview", Body = "b", Type = "article", AuthorId = Guid.NewGuid(), CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }).ToList();

        _searchService.Setup(s => s.SearchBytesAsync("go", It.IsAny<Vector?>(), 5, default, It.IsAny<Guid?>())).ReturnsAsync(manyBytes);
        _searchService.Setup(s => s.SearchInterviewsAsync("go", It.IsAny<Vector?>(), 5, default, It.IsAny<Guid?>())).ReturnsAsync(manyInterviews);

        var results = await _sut.SearchContentAsync("go", "all", 5, default);

        Assert.True(results.Count <= 5);
    }

    // ── SearchPeopleAsync ─────────────────────────────────────────────────────

    [Fact]
    public async Task SearchPeople_DelegatesToService()
    {
        var users = new List<User> { new() { Id = Guid.NewGuid(), Username = "alice" } };
        _searchService.Setup(s => s.SearchPeopleAsync("alice", 10, default, It.IsAny<Guid?>())).ReturnsAsync(users);

        var result = await _sut.SearchPeopleAsync("alice", 10, default);

        Assert.Single(result);
        Assert.Equal("alice", result[0].Username);
    }

    // ── Empty query ───────────────────────────────────────────────────────────

    [Fact]
    public async Task SearchContent_EmptyQuery_SkipsEmbedding()
    {
        _searchService.Setup(s => s.SearchBytesAsync("", null, 10, default, It.IsAny<Guid?>())).ReturnsAsync([]);

        await _sut.SearchContentAsync("", "bytes", 10, default);

        _embedding.Verify(e => e.EmbedQueryAsync(It.IsAny<string>(), default), Times.Never);
    }
}
