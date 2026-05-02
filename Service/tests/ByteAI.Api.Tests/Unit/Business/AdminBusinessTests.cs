using ByteAI.Api.Tests.Helpers;
using ByteAI.Core.Business;
using ByteAI.Core.Entities;
using ByteAI.Core.Services.FeatureFlags;
using ByteAI.Core.Services.Supabase;
using Microsoft.Extensions.Logging.Abstractions;

namespace ByteAI.Api.Tests.Unit.Business;

/// <summary>
/// AdminBusiness has direct AppDbContext usage for role management,
/// so we use InMemory for the role tests and Moq for feature-flag delegation.
/// </summary>
public sealed class AdminBusinessTests : IDisposable
{
    private readonly Mock<IFeatureFlagService> _flagService = new();
    private readonly Mock<ISupabaseAdminService> _supabaseAdmin = new();
    private readonly ByteAI.Core.Infrastructure.Persistence.AppDbContext _db;
    private readonly AdminBusiness _sut;

    public AdminBusinessTests()
    {
        _db = DbContextFactory.Create();
        _sut = new AdminBusiness(
            _flagService.Object,
            _supabaseAdmin.Object,
            NullLogger<AdminBusiness>.Instance,
            _db);
    }

    public void Dispose() => _db.Dispose();

    // ── Feature-flag delegation ───────────────────────────────────────────────

    [Fact]
    public async Task GetAllFeatureFlags_DelegatesToFlagService()
    {
        var flags = new List<FeatureFlagType> { new() { Key = "dark_mode", Name = "Dark Mode" } };
        _flagService.Setup(s => s.GetAllAsync(default)).ReturnsAsync(flags);

        var result = await _sut.GetAllFeatureFlagsAsync(default);

        Assert.Single(result);
        Assert.Equal("dark_mode", result[0].Key);
    }

    [Fact]
    public async Task UpsertFeatureFlag_DelegatesToFlagService()
    {
        var flag = new FeatureFlagType { Key = "beta", Name = "Beta", GlobalOpen = true };
        _flagService.Setup(s => s.UpsertAsync("beta", "Beta", null, true, default)).ReturnsAsync(flag);

        var result = await _sut.UpsertFeatureFlagAsync("beta", "Beta", null, true, default);

        Assert.Equal("beta", result.Key);
    }

    [Fact]
    public async Task DeleteFeatureFlag_DelegatesToFlagService()
    {
        _flagService.Setup(s => s.DeleteAsync("beta", default)).ReturnsAsync(true);

        var result = await _sut.DeleteFeatureFlagAsync("beta", default);

        Assert.True(result);
    }

    // ── Role management (direct DB) ───────────────────────────────────────────

    [Fact]
    public async Task GetAllRoles_EmptyDb_ReturnsEmptyList()
    {
        var result = await _sut.GetAllRolesAsync(default);

        Assert.Empty(result);
    }

    [Fact]
    public async Task CreateRole_NewRole_PersistsToDb()
    {
        var role = await _sut.CreateRoleAsync("moderator", "Moderator", "Can moderate content", default);

        Assert.NotEqual(Guid.Empty, role.Id);
        Assert.Equal("moderator", role.Name);
        Assert.Equal("Moderator", role.Label);
    }

    [Fact]
    public async Task CreateRole_ReservedName_Admin_ThrowsInvalidOperation()
    {
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _sut.CreateRoleAsync("admin", "Admin", null, default));
    }

    [Fact]
    public async Task CreateRole_ReservedName_User_ThrowsInvalidOperation()
    {
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _sut.CreateRoleAsync("user", "User", null, default));
    }

    [Fact]
    public async Task CreateRole_DuplicateName_ThrowsInvalidOperation()
    {
        await _sut.CreateRoleAsync("moderator", "Moderator", null, default);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _sut.CreateRoleAsync("moderator", "Moderator 2", null, default));
    }

    [Fact]
    public async Task CreateRole_NormalizesNameToLowerKebabCase()
    {
        var role = await _sut.CreateRoleAsync("Content Editor", "Content Editor", null, default);

        Assert.Equal("content-editor", role.Name);
    }

    [Fact]
    public async Task AssignRoleToUser_RoleNotFound_ThrowsKeyNotFound()
    {
        var userId = Guid.NewGuid();
        var fakeRoleId = Guid.NewGuid();

        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => _sut.AssignRoleToUserAsync(userId, fakeRoleId, default));
    }

    [Fact]
    public async Task AssignRoleToUser_ValidRole_CreatesUserRole()
    {
        var role = await _sut.CreateRoleAsync("moderator", "Moderator", null, default);
        var userId = Guid.NewGuid();

        // Should not throw
        await _sut.AssignRoleToUserAsync(userId, role.Id, default);

        var userRoles = await _sut.GetUserRolesAsync(userId, default);
        Assert.Single(userRoles);
        Assert.Equal("moderator", userRoles[0].Name);
    }

    [Fact]
    public async Task AssignRoleToUser_AssignTwice_IdempotentNoDuplicate()
    {
        var role = await _sut.CreateRoleAsync("moderator", "Moderator", null, default);
        var userId = Guid.NewGuid();

        await _sut.AssignRoleToUserAsync(userId, role.Id, default);
        await _sut.AssignRoleToUserAsync(userId, role.Id, default); // second call

        var userRoles = await _sut.GetUserRolesAsync(userId, default);
        Assert.Single(userRoles); // only one assignment
    }

    [Fact]
    public async Task RevokeRoleFromUser_RoleNotFound_ThrowsKeyNotFound()
    {
        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => _sut.RevokeRoleFromUserAsync(Guid.NewGuid(), Guid.NewGuid(), default));
    }

    [Fact]
    public async Task RevokeRoleFromUser_UserRole_RemovesIt()
    {
        var role = await _sut.CreateRoleAsync("moderator", "Moderator", null, default);
        var userId = Guid.NewGuid();
        await _sut.AssignRoleToUserAsync(userId, role.Id, default);

        await _sut.RevokeRoleFromUserAsync(userId, role.Id, default);

        var userRoles = await _sut.GetUserRolesAsync(userId, default);
        Assert.Empty(userRoles);
    }

    [Fact]
    public async Task RevokeRoleFromUser_UserRole_ThrowsForUserRole()
    {
        // Insert a "user" role directly (it's reserved)
        var userRole = new RoleType { Name = "user", Label = "User" };
        _db.RoleTypes.Add(userRole);
        await _db.SaveChangesAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _sut.RevokeRoleFromUserAsync(Guid.NewGuid(), userRole.Id, default));
    }
}
