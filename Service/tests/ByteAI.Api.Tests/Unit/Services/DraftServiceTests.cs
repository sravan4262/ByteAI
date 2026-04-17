using ByteAI.Api.Tests.Helpers;
using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Services.Drafts;

namespace ByteAI.Api.Tests.Unit.Services;

public sealed class DraftServiceTests : IDisposable
{
    private readonly ByteAI.Core.Infrastructure.Persistence.AppDbContext _db;
    private readonly DraftService _sut;
    private readonly Guid _authorId = Guid.NewGuid();

    public DraftServiceTests()
    {
        _db = DbContextFactory.Create();
        _sut = new DraftService(_db);

        _db.Users.Add(new User { Id = _authorId, SupabaseUserId = "d1", Username = "drafter", DisplayName = "Drafter" });
        _db.SaveChanges();
    }

    public void Dispose() => _db.Dispose();

    // ── SaveDraftAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task SaveDraft_NoDraftId_CreatesNewDraft()
    {
        var result = await _sut.SaveDraftAsync(_authorId, null, "Title", "Body", null, null, [], default);

        Assert.NotEqual(Guid.Empty, result.Id);
        Assert.Equal("Title", result.Title);
        Assert.Single(_db.Drafts);
    }

    [Fact]
    public async Task SaveDraft_WithExistingDraftId_UpdatesInPlace()
    {
        var first = await _sut.SaveDraftAsync(_authorId, null, "v1", "body", null, null, [], default);
        var second = await _sut.SaveDraftAsync(_authorId, first.Id, "v2", "body2", null, null, [], default);

        Assert.Equal(first.Id, second.Id);
        Assert.Single(_db.Drafts);
        Assert.Equal("v2", second.Title);
    }

    [Fact]
    public async Task SaveDraft_DraftIdBelongsToDifferentAuthor_CreatesNew()
    {
        var otherId = Guid.NewGuid();
        _db.Users.Add(new User { Id = otherId, SupabaseUserId = "o1", Username = "other", DisplayName = "Other" });
        await _db.SaveChangesAsync();

        var existing = await _sut.SaveDraftAsync(otherId, null, "other draft", "b", null, null, [], default);
        // Trying to update with wrong authorId → treated as not found → new draft created
        await _sut.SaveDraftAsync(_authorId, existing.Id, "mine", "b", null, null, [], default);

        Assert.Equal(2, _db.Drafts.Count());
    }

    [Fact]
    public async Task SaveDraft_WithTags_PersistsTags()
    {
        var result = await _sut.SaveDraftAsync(_authorId, null, "T", "B", null, null, ["go", "docker"], default);

        Assert.Contains("go", result.Tags);
        Assert.Contains("docker", result.Tags);
    }

    // ── GetMyDraftsAsync ──────────────────────────────────────────────────────

    [Fact]
    public async Task GetMyDrafts_ReturnsOnlyThisAuthorsDrafts()
    {
        var otherId = Guid.NewGuid();
        _db.Users.Add(new User { Id = otherId, SupabaseUserId = "o2", Username = "other2", DisplayName = "Other2" });
        await _db.SaveChangesAsync();

        await _sut.SaveDraftAsync(_authorId, null, "mine", "b", null, null, [], default);
        await _sut.SaveDraftAsync(otherId,   null, "theirs", "b", null, null, [], default);

        var result = await _sut.GetMyDraftsAsync(_authorId, new PaginationParams(1, 20), default);

        Assert.Equal(1, result.Total);
        Assert.Equal("mine", result.Items[0].Title);
    }

    [Fact]
    public async Task GetMyDrafts_Empty_ReturnsZero()
    {
        var result = await _sut.GetMyDraftsAsync(_authorId, new PaginationParams(1, 20), default);
        Assert.Equal(0, result.Total);
    }

    // ── DeleteDraftAsync ──────────────────────────────────────────────────────

    [Fact]
    public async Task DeleteDraft_OwnDraft_RemovesAndReturnsTrue()
    {
        var draft = await _sut.SaveDraftAsync(_authorId, null, "del", "b", null, null, [], default);

        var result = await _sut.DeleteDraftAsync(draft.Id, _authorId, default);

        Assert.True(result);
        Assert.Empty(_db.Drafts);
    }

    [Fact]
    public async Task DeleteDraft_NotFound_ReturnsFalse()
    {
        var result = await _sut.DeleteDraftAsync(Guid.NewGuid(), _authorId, default);
        Assert.False(result);
    }

    [Fact]
    public async Task DeleteDraft_WrongAuthor_ReturnsFalse()
    {
        var draft = await _sut.SaveDraftAsync(_authorId, null, "x", "b", null, null, [], default);

        var result = await _sut.DeleteDraftAsync(draft.Id, Guid.NewGuid(), default);

        Assert.False(result);
        Assert.Single(_db.Drafts);
    }
}
