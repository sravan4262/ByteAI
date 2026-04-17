using ByteAI.Core.Business;
using ByteAI.Core.Commands.Bytes;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Services;
using ByteAI.Core.Services.Feed;

namespace ByteAI.Api.Tests.Unit.Business;

public sealed class FeedBusinessTests
{
    private readonly Mock<IFeedService> _feedService = new();
    private readonly Mock<ICurrentUserService> _currentUser = new();
    private readonly FeedBusiness _sut;

    private readonly Guid _userId = Guid.NewGuid();
    private const string SupabaseUserId = "clerk_feed";

    public FeedBusinessTests()
    {
        _sut = new FeedBusiness(_feedService.Object, _currentUser.Object);
    }

    [Fact]
    public async Task GetFeed_WithoutClerkId_PassesNullUserId()
    {
        var expected = new PagedResult<ByteResult>([], 0, 1, 20);
        _feedService
            .Setup(s => s.GetFeedAsync(null, It.IsAny<PaginationParams>(), null, "latest", default))
            .ReturnsAsync(expected);

        var result = await _sut.GetFeedAsync(null, 1, 20, null, "latest", default);

        Assert.Equal(expected, result);
        _currentUser.Verify(s => s.GetCurrentUserIdAsync(It.IsAny<string>(), default), Times.Never);
    }

    [Fact]
    public async Task GetFeed_WithClerkId_ResolvesAndPassesUserId()
    {
        _currentUser.Setup(s => s.GetCurrentUserIdAsync(ClerkId, default)).ReturnsAsync(_userId);
        var expected = new PagedResult<ByteResult>([], 0, 1, 20);
        _feedService
            .Setup(s => s.GetFeedAsync(_userId, It.IsAny<PaginationParams>(), null, "latest", default))
            .ReturnsAsync(expected);

        var result = await _sut.GetFeedAsync(ClerkId, 1, 20, null, "latest", default);

        Assert.Equal(expected, result);
    }

    [Fact]
    public async Task GetFeed_PageSizeCappedAt100()
    {
        _feedService
            .Setup(s => s.GetFeedAsync(null, It.Is<PaginationParams>(p => p.PageSize == 100), null, "latest", default))
            .ReturnsAsync(new PagedResult<ByteResult>([], 0, 1, 100));

        await _sut.GetFeedAsync(null, 1, 9999, null, "latest", default);

        _feedService.Verify(s =>
            s.GetFeedAsync(null, It.Is<PaginationParams>(p => p.PageSize == 100), null, "latest", default),
            Times.Once);
    }

    [Fact]
    public async Task GetFeed_ForwardsTagsFilter()
    {
        var tags = new List<string> { "python", "docker" };
        _feedService
            .Setup(s => s.GetFeedAsync(null, It.IsAny<PaginationParams>(), tags, "trending", default))
            .ReturnsAsync(new PagedResult<ByteResult>([], 0, 1, 20));

        await _sut.GetFeedAsync(null, 1, 20, tags, "trending", default);

        _feedService.Verify(s =>
            s.GetFeedAsync(null, It.IsAny<PaginationParams>(), tags, "trending", default),
            Times.Once);
    }
}
