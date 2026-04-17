using ByteAI.Core.Business;
using ByteAI.Core.Commands.Interviews;
using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Services;
using ByteAI.Core.Services.Interviews;

namespace ByteAI.Api.Tests.Unit.Business;

public sealed class InterviewsBusinessTests
{
    private readonly Mock<IInterviewService> _interviewService = new();
    private readonly Mock<ICurrentUserService> _currentUser = new();
    private readonly InterviewsBusiness _sut;

    private readonly Guid _userId = Guid.NewGuid();
    private const string SupabaseUserId = "clerk_abc";

    public InterviewsBusinessTests()
    {
        _sut = new InterviewsBusiness(_interviewService.Object, _currentUser.Object);
    }

    // ── Auth guards ───────────────────────────────────────────────────────────

    [Theory]
    [MemberData(nameof(WriteMethods))]
    public async Task WriteMethod_UnknownClerkId_ThrowsUnauthorized(Func<InterviewsBusiness, Task> act)
    {
        _currentUser.Setup(s => s.GetCurrentUserIdAsync(ClerkId, default)).ReturnsAsync((Guid?)null);
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => act(_sut));
    }

    public static TheoryData<Func<InterviewsBusiness, Task>> WriteMethods => new()
    {
        b => b.CreateInterviewAsync(ClerkId, "t", "b", null, null, null, null, null, "article", default),
        b => b.UpdateInterviewAsync(ClerkId, Guid.NewGuid(), null, null, null, null, null, null, null, default),
        b => b.DeleteInterviewAsync(ClerkId, Guid.NewGuid(), default),
        b => b.LikeQuestionAsync(ClerkId, Guid.NewGuid(), default),
        b => b.UnlikeQuestionAsync(ClerkId, Guid.NewGuid(), default),
        b => b.ToggleBookmarkAsync(ClerkId, Guid.NewGuid(), default),
    };

    // ── GetInterviewsAsync ────────────────────────────────────────────────────

    [Fact]
    public async Task GetInterviews_WithoutClerkId_NullRequesterId()
    {
        var expected = new PagedResult<Interview>([], 0, 1, 20);
        _interviewService
            .Setup(s => s.GetInterviewsAsync(
                It.IsAny<PaginationParams>(), null, null, null, null, null, "latest", default, null))
            .ReturnsAsync(expected);

        var result = await _sut.GetInterviewsAsync(1, 20, null, null, null, null, null, "latest", default);

        Assert.Equal(expected, result);
        _currentUser.Verify(s => s.GetCurrentUserIdAsync(It.IsAny<string>(), default), Times.Never);
    }

    [Fact]
    public async Task GetInterviews_PageSizeCappedAt50()
    {
        _interviewService
            .Setup(s => s.GetInterviewsAsync(
                It.Is<PaginationParams>(p => p.PageSize == 50), null, null, null, null, null, "latest", default, null))
            .ReturnsAsync(new PagedResult<Interview>([], 0, 1, 50));

        await _sut.GetInterviewsAsync(1, 200, null, null, null, null, null, "latest", default);

        _interviewService.Verify(s =>
            s.GetInterviewsAsync(
                It.Is<PaginationParams>(p => p.PageSize == 50), null, null, null, null, null, "latest", default, null),
            Times.Once);
    }

    // ── GetCompanies / Roles / Locations ──────────────────────────────────────

    [Fact]
    public async Task GetCompanies_DelegatesToService()
    {
        var companies = new List<Company> { new() { Id = Guid.NewGuid(), Name = "Google" } };
        _interviewService.Setup(s => s.GetCompaniesAsync(default)).ReturnsAsync(companies);

        var result = await _sut.GetCompaniesAsync(default);

        Assert.Single(result);
        Assert.Equal("Google", result[0].Name);
    }

    // ── CreateInterview ───────────────────────────────────────────────────────

    [Fact]
    public async Task CreateInterview_ValidUser_DelegatesToService()
    {
        _currentUser.Setup(s => s.GetCurrentUserIdAsync(ClerkId, default)).ReturnsAsync(_userId);

        var interview = new Interview { Id = Guid.NewGuid(), AuthorId = _userId, Title = "My Interview" };
        _interviewService
            .Setup(s => s.CreateInterviewAsync(_userId, "My Interview", "body", null, null, null, null, null, "article", default))
            .ReturnsAsync(interview);

        var result = await _sut.CreateInterviewAsync(ClerkId, "My Interview", "body", null, null, null, null, null, "article", default);

        Assert.Equal(interview.Id, result.Id);
    }

    // ── DeleteInterview ───────────────────────────────────────────────────────

    [Fact]
    public async Task DeleteInterview_ValidUser_DelegatesToService()
    {
        var interviewId = Guid.NewGuid();
        _currentUser.Setup(s => s.GetCurrentUserIdAsync(ClerkId, default)).ReturnsAsync(_userId);
        _interviewService.Setup(s => s.DeleteInterviewAsync(interviewId, _userId, default)).ReturnsAsync(true);

        var result = await _sut.DeleteInterviewAsync(ClerkId, interviewId, default);

        Assert.True(result);
    }

    // ── ToggleBookmark ────────────────────────────────────────────────────────

    [Fact]
    public async Task ToggleBookmark_ValidUser_DelegatesToService()
    {
        var interviewId = Guid.NewGuid();
        _currentUser.Setup(s => s.GetCurrentUserIdAsync(ClerkId, default)).ReturnsAsync(_userId);
        _interviewService.Setup(s => s.ToggleBookmarkAsync(interviewId, _userId, default)).ReturnsAsync(true);

        var result = await _sut.ToggleBookmarkAsync(ClerkId, interviewId, default);

        Assert.True(result);
    }
}
