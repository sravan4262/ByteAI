using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ByteAI.Core.Services.FeatureFlags;

public sealed class FeatureFlagService(AppDbContext db) : IFeatureFlagService
{
    public async Task<List<FeatureFlagType>> GetAllAsync(CancellationToken ct) =>
        await db.FeatureFlagTypes
            .AsNoTracking()
            .OrderBy(f => f.Key)
            .ToListAsync(ct);

    public async Task<List<FeatureFlagType>> GetEnabledAsync(string? clerkId, CancellationToken ct)
    {
        var query = db.FeatureFlagTypes.AsNoTracking().Where(f => f.GlobalOpen);

        if (!string.IsNullOrEmpty(supabaseUserId))
        {
            var userFlags = db.UserFeatureFlags
                .AsNoTracking()
                .Where(uf => uf.User.SupabaseUserId == clerkId)
                .Select(uf => uf.FeatureFlagType);
            
            query = query.Union(userFlags);
        }

        return await query.OrderBy(f => f.Key).ToListAsync(ct);
    }

    public async Task<FeatureFlagType> UpsertAsync(
        string key, string name, string? description, bool globalOpen, CancellationToken ct)
    {
        var existing = await db.FeatureFlagTypes.FirstOrDefaultAsync(f => f.Key == key, ct);

        if (existing is null)
        {
            existing = new FeatureFlagType
            {
                Key = key,
                Name = name,
                Description = description,
                GlobalOpen = globalOpen,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            db.FeatureFlagTypes.Add(existing);
        }
        else
        {
            existing.Name = name;
            existing.Description = description;
            existing.GlobalOpen = globalOpen;
            existing.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(ct);
        return existing;
    }

    public async Task<FeatureFlagType> SetEnabledAsync(string key, bool globalOpen, CancellationToken ct)
    {
        var flag = await db.FeatureFlagTypes.FirstOrDefaultAsync(f => f.Key == key, ct)
            ?? throw new KeyNotFoundException($"Feature flag '{key}' not found.");

        flag.GlobalOpen = globalOpen;
        flag.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        return flag;
    }

    public async Task<bool> DeleteAsync(string key, CancellationToken ct)
    {
        var flag = await db.FeatureFlagTypes.FirstOrDefaultAsync(f => f.Key == key, ct);
        if (flag is null) return false;

        db.FeatureFlagTypes.Remove(flag);
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task AssignToUserAsync(string key, Guid userId, CancellationToken ct)
    {
        var flag = await db.FeatureFlagTypes.FirstOrDefaultAsync(f => f.Key == key, ct)
            ?? throw new KeyNotFoundException($"Feature flag '{key}' not found.");

        var exists = await db.UserFeatureFlags.AnyAsync(uf => uf.UserId == userId && uf.FeatureFlagTypeId == flag.Id, ct);
        if (!exists)
        {
            db.UserFeatureFlags.Add(new UserFeatureFlag
            {
                UserId = userId,
                FeatureFlagTypeId = flag.Id
            });
            await db.SaveChangesAsync(ct);
        }
    }

    public async Task RemoveFromUserAsync(string key, Guid userId, CancellationToken ct)
    {
        var flag = await db.FeatureFlagTypes.FirstOrDefaultAsync(f => f.Key == key, ct)
            ?? throw new KeyNotFoundException($"Feature flag '{key}' not found.");

        var existing = await db.UserFeatureFlags.FirstOrDefaultAsync(uf => uf.UserId == userId && uf.FeatureFlagTypeId == flag.Id, ct);
        if (existing is not null)
        {
            db.UserFeatureFlags.Remove(existing);
            await db.SaveChangesAsync(ct);
        }
    }

    public async Task<List<string>> GetUserAssignedFlagsAsync(Guid userId, CancellationToken ct)
    {
        var flagKeys = await db.UserFeatureFlags
            .AsNoTracking()
            .Where(uf => uf.UserId == userId)
            .Select(uf => uf.FeatureFlagType.Key)
            .ToListAsync(ct);
        return flagKeys;
    }
}
