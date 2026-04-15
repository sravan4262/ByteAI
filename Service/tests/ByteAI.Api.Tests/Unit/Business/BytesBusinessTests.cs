using ByteAI.Core.Business;
using ByteAI.Core.Commands.Bytes;
using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Services;
using ByteAI.Core.Services.Bytes;

namespace ByteAI.Api.Tests.Unit.Business;

public sealed class BytesBusinessTests
{
    private readonly Mock<IByteService> _byteService = new();
    private readonly Mock<ICurrentUserService> _currentUser = new();
    private readonly BytesBusiness _sut;

    private readonly Guid _userId = Guid.NewGuid();
    private const string ClerkId = "clerk_test_123";

    public BytesBusinessTests()
    {
        _sut = new BytesBusiness(_byteService.Object, _currentUser.Object);
    }

    // ── ResolveUserIdAsync guard ──────────────────────────────────────────────

    [Fact]
    public async Task CreateByte_UnknownClerkId_ThrowsUnauthorized()
    {
        _currentUser.Setup(s => s.GetCurrentUserIdAsync(ClerkId, default)).ReturnsAsync((Guid?)null);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _sut.CreateByteAsync(ClerkId, "title", "body", null, null, "article", default));
    }

    [Fact]
    public async Task UpdateByte_UnknownClerkId_ThrowsUnauthorized()
    {
        _currentUser.Setup(s => s.GetCurrentUserIdAsync(ClerkId, default)).ReturnsAsync((Guid?)null);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _sut.UpdateByteAsync(ClerkId, Guid.NewGuid(), null, null, null, null, default));
    }

    [Fact]
    public async Task DeleteByte_UnknownClerkId_ThrowsUnauthorized()
    {
        _currentUser.Setup(s => s.GetCurrentUserIdAsync(ClerkId, default)).ReturnsAsync((Guid?)null);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _sut.DeleteByteAsync(ClerkId, Guid.NewGuid(), default));
    }

    [Fact]
    public async Task GetMyBytes_UnknownClerkId_ThrowsUnauthorized()
    {
        _currentUser.Setup(s => s.GetCurrentUserIdAsync(ClerkId, default)).ReturnsAsync((Guid?)null);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _sut.GetMyBytesAsync(ClerkId, 1, 20, default));
    }

    // ── GetBytesAsync ─────────────────────────────────────────────────────────

    [Fact]
    public async Task GetBytes_WithoutClerkId_PassesNullRequesterId()
    {
        var expected = new PagedResult<ByteResult>([], 0, 1, 20);
        _byteService
            .Setup(s => s.GetBytesAsync(It.IsAny<PaginationParams>(), null, "latest", default, null))
            .ReturnsAsync(expected);

        var result = await _sut.GetBytesAsync(1, 20, null, "latest", default);

        Assert.Equal(expected, result);
        _currentUser.Verify(s => s.GetCurrentUserIdAsync(It.IsAny<string>(), default), Times.Never);
    }

    [Fact]
    public async Task GetBytes_WithClerkId_ResolvesRequesterIdAndPasses()
    {
        _currentUser.Setup(s => s.GetCurrentUserIdAsync(ClerkId, default)).ReturnsAsync(_userId);
        var expected = new PagedResult<ByteResult>([], 0, 1, 20);
        _byteService
            .Setup(s => s.GetBytesAsync(It.IsAny<PaginationParams>(), null, "latest", default, _userId))
            .ReturnsAsync(expected);

        var result = await _sut.GetBytesAsync(1, 20, null, "latest", default, ClerkId);

        Assert.Equal(expected, result);
    }

    [Fact]
    public async Task GetBytes_PageSizeCappedAt100()
    {
        _byteService
            .Setup(s => s.GetBytesAsync(It.Is<PaginationParams>(p => p.PageSize == 100), null, "latest", default, null))
            .ReturnsAsync(new PagedResult<ByteResult>([], 0, 1, 100));

        await _sut.GetBytesAsync(1, 500, null, "latest", default);

        _byteService.Verify(s =>
            s.GetBytesAsync(It.Is<PaginationParams>(p => p.PageSize == 100), null, "latest", default, null), Times.Once);
    }

    // ── GetByteByIdAsync ──────────────────────────────────────────────────────

    [Fact]
    public async Task GetByteById_WithoutClerkId_PassesNullRequesterId()
    {
        var byteId = Guid.NewGuid();
        _byteService.Setup(s => s.GetByteByIdAsync(byteId, default, null)).ReturnsAsync((ByteResult?)null);

        var result = await _sut.GetByteByIdAsync(byteId, default);

        Assert.Null(result);
    }

    // ── CreateByteAsync ───────────────────────────────────────────────────────

    [Fact]
    public async Task CreateByte_ValidUser_DelegatesAndMapsResult()
    {
        _currentUser.Setup(s => s.GetCurrentUserIdAsync(ClerkId, default)).ReturnsAsync(_userId);

        var serviceResult = new ByteResult(
            Guid.NewGuid(), _userId, "title", "body", null, null, "article",
            DateTime.UtcNow, DateTime.UtcNow, 0, 0);

        _byteService
            .Setup(s => s.CreateByteAsync(_userId, "title", "body", null, null, "article", default, false))
            .ReturnsAsync(serviceResult);

        var result = await _sut.CreateByteAsync(ClerkId, "title", "body", null, null, "article", default);

        Assert.Equal(serviceResult.Id, result.Id);
        Assert.Equal(serviceResult.AuthorId, result.AuthorId);
        Assert.Equal("title", result.Title);
    }

    // ── DeleteByteAsync ───────────────────────────────────────────────────────

    [Fact]
    public async Task DeleteByte_ValidUser_DelegatesToService()
    {
        var byteId = Guid.NewGuid();
        _currentUser.Setup(s => s.GetCurrentUserIdAsync(ClerkId, default)).ReturnsAsync(_userId);
        _byteService.Setup(s => s.DeleteByteAsync(byteId, _userId, default)).ReturnsAsync(true);

        var result = await _sut.DeleteByteAsync(ClerkId, byteId, default);

        Assert.True(result);
    }

    // ── GetMyBytesAsync ───────────────────────────────────────────────────────

    [Fact]
    public async Task GetMyBytes_ValidUser_PageSizeCappedAt100()
    {
        _currentUser.Setup(s => s.GetCurrentUserIdAsync(ClerkId, default)).ReturnsAsync(_userId);
        var expected = new PagedResult<ByteResult>([], 0, 1, 100);
        _byteService
            .Setup(s => s.GetMyBytesAsync(_userId, It.Is<PaginationParams>(p => p.PageSize == 100), default))
            .ReturnsAsync(expected);

        var result = await _sut.GetMyBytesAsync(ClerkId, 1, 999, default);

        Assert.Equal(expected, result);
    }
}
