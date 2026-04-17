using ByteAI.Api.Tests.Helpers;
using ByteAI.Core.Entities;
using ByteAI.Core.Services.FeatureFlags;

namespace ByteAI.Api.Tests.Unit.Services;

public sealed class FeatureFlagServiceTests : IDisposable
{
    private readonly ByteAI.Core.Infrastructure.Persistence.AppDbContext _db;
    private readonly FeatureFlagService _sut;

    public FeatureFlagServiceTests()
    {
        _db = DbContextFactory.Create();
        _sut = new FeatureFlagService(_db);
    }

    public void Dispose() => _db.Dispose();

    // ── GetAllAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAll_EmptyDb_ReturnsEmpty()
    {
        var result = await _sut.GetAllAsync(default);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetAll_ReturnsAllFlagsOrderedByKey()
    {
        _db.FeatureFlagTypes.AddRange(
            new FeatureFlagType { Key = "zz_flag", Name = "ZZ", GlobalOpen = true },
            new FeatureFlagType { Key = "aa_flag", Name = "AA", GlobalOpen = false });
        await _db.SaveChangesAsync();

        var result = await _sut.GetAllAsync(default);

        Assert.Equal(2, result.Count);
        Assert.Equal("aa_flag", result[0].Key); // ordered by key
    }

    // ── UpsertAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task Upsert_NewFlag_CreatesIt()
    {
        var flag = await _sut.UpsertAsync("new_flag", "New Flag", "desc", true, default);

        Assert.NotEqual(Guid.Empty, flag.Id);
        Assert.Equal("new_flag", flag.Key);
        Assert.True(flag.GlobalOpen);
    }

    [Fact]
    public async Task Upsert_ExistingFlag_UpdatesItInPlace()
    {
        await _sut.UpsertAsync("flag_a", "Flag A", null, false, default);
        var updated = await _sut.UpsertAsync("flag_a", "Flag A Updated", "new desc", true, default);

        Assert.Equal("Flag A Updated", updated.Name);
        Assert.Equal("new desc", updated.Description);
        Assert.True(updated.GlobalOpen);

        var all = await _sut.GetAllAsync(default);
        Assert.Single(all); // only one record
    }

    // ── SetEnabledAsync ───────────────────────────────────────────────────────

    [Fact]
    public async Task SetEnabled_ExistingFlag_TogglesGlobalOpen()
    {
        await _sut.UpsertAsync("beta", "Beta", null, false, default);

        var result = await _sut.SetEnabledAsync("beta", true, default);

        Assert.True(result.GlobalOpen);
    }

    [Fact]
    public async Task SetEnabled_MissingFlag_ThrowsKeyNotFound()
    {
        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => _sut.SetEnabledAsync("nonexistent", true, default));
    }

    // ── DeleteAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task Delete_ExistingFlag_RemovesAndReturnsTrue()
    {
        await _sut.UpsertAsync("to_delete", "To Delete", null, false, default);

        var result = await _sut.DeleteAsync("to_delete", default);

        Assert.True(result);
        var all = await _sut.GetAllAsync(default);
        Assert.Empty(all);
    }

    [Fact]
    public async Task Delete_NonExistentFlag_ReturnsFalse()
    {
        var result = await _sut.DeleteAsync("ghost", default);
        Assert.False(result);
    }

    // ── AssignToUserAsync ─────────────────────────────────────────────────────

    [Fact]
    public async Task AssignToUser_FlagNotFound_ThrowsKeyNotFound()
    {
        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => _sut.AssignToUserAsync("missing_flag", Guid.NewGuid(), default));
    }

    [Fact]
    public async Task AssignToUser_ValidFlag_CreatesUserFeatureFlag()
    {
        await _sut.UpsertAsync("beta", "Beta", null, false, default);
        var userId = Guid.NewGuid();

        await _sut.AssignToUserAsync("beta", userId, default);

        var keys = await _sut.GetUserAssignedFlagsAsync(userId, default);
        Assert.Single(keys);
        Assert.Equal("beta", keys[0]);
    }

    [Fact]
    public async Task AssignToUser_AssignTwice_IdempotentNoDuplicate()
    {
        await _sut.UpsertAsync("beta", "Beta", null, false, default);
        var userId = Guid.NewGuid();

        await _sut.AssignToUserAsync("beta", userId, default);
        await _sut.AssignToUserAsync("beta", userId, default);

        var keys = await _sut.GetUserAssignedFlagsAsync(userId, default);
        Assert.Single(keys);
    }

    // ── RemoveFromUserAsync ───────────────────────────────────────────────────

    [Fact]
    public async Task RemoveFromUser_AssignedFlag_RemovesIt()
    {
        await _sut.UpsertAsync("beta", "Beta", null, false, default);
        var userId = Guid.NewGuid();
        await _sut.AssignToUserAsync("beta", userId, default);

        await _sut.RemoveFromUserAsync("beta", userId, default);

        var keys = await _sut.GetUserAssignedFlagsAsync(userId, default);
        Assert.Empty(keys);
    }

    // ── GetEnabledAsync ───────────────────────────────────────────────────────

    [Fact]
    public async Task GetEnabled_NoSupabaseUserId_OnlyGlobalOpenFlags()
    {
        _db.FeatureFlagTypes.AddRange(
            new FeatureFlagType { Key = "open_flag", Name = "Open", GlobalOpen = true },
            new FeatureFlagType { Key = "closed_flag", Name = "Closed", GlobalOpen = false });
        await _db.SaveChangesAsync();

        var result = await _sut.GetEnabledAsync(null, default);

        Assert.Single(result);
        Assert.Equal("open_flag", result[0].Key);
    }
}
