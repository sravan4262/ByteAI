using ByteAI.Core.Entities;

namespace ByteAI.Core.Services.FeatureFlags;

public interface IFeatureFlagService
{
    /// <summary>Returns all feature flags (used by admin endpoints).</summary>
    Task<List<FeatureFlagType>> GetAllAsync(CancellationToken ct);

    /// <summary>Returns only enabled feature flags (used by the public polling endpoint).</summary>
    Task<List<FeatureFlagType>> GetEnabledAsync(string? supabaseUserId, CancellationToken ct);

    /// <summary>Creates or replaces a feature flag by key.</summary>
    Task<FeatureFlagType> UpsertAsync(string key, string name, string? description, bool globalOpen, CancellationToken ct);

    /// <summary>Toggles the GlobalOpen state of an existing flag.</summary>
    Task<FeatureFlagType> SetEnabledAsync(string key, bool globalOpen, CancellationToken ct);

    /// <summary>Deletes a flag by key. Returns false if not found.</summary>
    Task<bool> DeleteAsync(string key, CancellationToken ct);

    /// <summary>Grants a user access to a specific feature flag when it is not globally open.</summary>
    Task AssignToUserAsync(string key, Guid userId, CancellationToken ct);

    /// <summary>Revokes a user's access to a specific feature flag.</summary>
    Task RemoveFromUserAsync(string key, Guid userId, CancellationToken ct);

    /// <summary>Returns the list of feature flag keys assigned to a specific user.</summary>
    Task<List<string>> GetUserAssignedFlagsAsync(Guid userId, CancellationToken ct);
}
