using ByteAI.Core.Business.Interfaces;
using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure.Persistence;
using ByteAI.Core.Services.FeatureFlags;
using Microsoft.EntityFrameworkCore;

namespace ByteAI.Core.Business;

public sealed class AdminBusiness(IFeatureFlagService featureFlagService, AppDbContext db) : IAdminBusiness
{
    private static readonly HashSet<string> ReservedRoles = ["user", "admin"];

    public async Task<UserActivityResponse> GetUserActivityAsync(int page, int pageSize, CancellationToken ct)
    {
        var offset = (page - 1) * pageSize;

        var todayCount  = await db.LoggedInToday.CountAsync(ct);
        var todayItems  = await db.LoggedInToday
            .OrderByDescending(u => u.ActivityAt)
            .Skip(offset).Take(pageSize)
            .Select(u => new ActivityUserDto(u.UserId, u.DisplayName, u.Username, u.AvatarUrl, u.Email, u.ActivityAt))
            .ToListAsync(ct);

        var onlineCount = await db.CurrentlyLoggedIn.CountAsync(ct);
        var onlineItems = await db.CurrentlyLoggedIn
            .OrderByDescending(u => u.ActivityAt)
            .Skip(offset).Take(pageSize)
            .Select(u => new ActivityUserDto(u.UserId, u.DisplayName, u.Username, u.AvatarUrl, u.Email, u.ActivityAt))
            .ToListAsync(ct);

        return new UserActivityResponse(
            LoggedInToday:     new ActivityPagedResult(todayItems,  todayCount,  page, pageSize),
            CurrentlyLoggedIn: new ActivityPagedResult(onlineItems, onlineCount, page, pageSize));
    }

    public Task<List<FeatureFlagType>> GetAllFeatureFlagsAsync(CancellationToken ct) =>
        featureFlagService.GetAllAsync(ct);

    public Task<List<FeatureFlagType>> GetEnabledFeatureFlagsAsync(string? supabaseUserId, CancellationToken ct) =>
        featureFlagService.GetEnabledAsync(supabaseUserId, ct);

    public Task<FeatureFlagType> UpsertFeatureFlagAsync(string key, string name, string? description, bool globalOpen, CancellationToken ct) =>
        featureFlagService.UpsertAsync(key, name, description, globalOpen, ct);

    public Task<FeatureFlagType> SetFeatureFlagEnabledAsync(string key, bool globalOpen, CancellationToken ct) =>
        featureFlagService.SetEnabledAsync(key, globalOpen, ct);

    public Task<bool> DeleteFeatureFlagAsync(string key, CancellationToken ct) =>
        featureFlagService.DeleteAsync(key, ct);

    public Task AssignFeatureFlagToUserAsync(string key, Guid userId, CancellationToken ct) =>
        featureFlagService.AssignToUserAsync(key, userId, ct);

    public Task RemoveFeatureFlagFromUserAsync(string key, Guid userId, CancellationToken ct) =>
        featureFlagService.RemoveFromUserAsync(key, userId, ct);

    public Task<List<string>> GetUserAssignedFeatureFlagsAsync(Guid userId, CancellationToken ct) =>
        featureFlagService.GetUserAssignedFlagsAsync(userId, ct);

    // ── Role management ──────────────────────────────────────────────────────

    public Task<List<RoleType>> GetAllRolesAsync(CancellationToken ct) =>
        db.RoleTypes.AsNoTracking()
            .OrderBy(r => r.Name)
            .ToListAsync(ct);

    public async Task<RoleType> CreateRoleAsync(string name, string label, string? description, CancellationToken ct)
    {
        var slug = name.Trim().ToLower().Replace(' ', '-');
        if (ReservedRoles.Contains(slug))
            throw new InvalidOperationException($"Role name '{slug}' is reserved and cannot be created.");

        var existing = await db.RoleTypes.AnyAsync(r => r.Name == slug, ct);
        if (existing)
            throw new InvalidOperationException($"A role with name '{slug}' already exists.");

        var role = new RoleType { Name = slug, Label = label.Trim(), Description = description?.Trim() };
        db.RoleTypes.Add(role);
        await db.SaveChangesAsync(ct);
        return role;
    }

    public async Task<List<RoleType>> GetUserRolesAsync(Guid userId, CancellationToken ct) =>
        await db.UserRoles.AsNoTracking()
            .Where(ur => ur.UserId == userId)
            .Include(ur => ur.RoleType)
            .Select(ur => ur.RoleType)
            .ToListAsync(ct);

    public async Task AssignRoleToUserAsync(Guid userId, Guid roleId, CancellationToken ct)
    {
        var role = await db.RoleTypes.FindAsync([roleId], ct)
            ?? throw new KeyNotFoundException($"Role {roleId} not found.");

        var alreadyAssigned = await db.UserRoles.AnyAsync(ur => ur.UserId == userId && ur.RoleTypeId == roleId, ct);
        if (alreadyAssigned) return;

        db.UserRoles.Add(new UserRole { UserId = userId, RoleTypeId = roleId });
        await db.SaveChangesAsync(ct);
    }

    public async Task RevokeRoleFromUserAsync(Guid userId, Guid roleId, CancellationToken ct)
    {
        var role = await db.RoleTypes.FindAsync([roleId], ct)
            ?? throw new KeyNotFoundException($"Role {roleId} not found.");

        if (role.Name == "user")
            throw new InvalidOperationException("The 'user' role cannot be revoked.");

        var entry = await db.UserRoles.FirstOrDefaultAsync(ur => ur.UserId == userId && ur.RoleTypeId == roleId, ct);
        if (entry is null) return;

        db.UserRoles.Remove(entry);
        await db.SaveChangesAsync(ct);
    }
}
