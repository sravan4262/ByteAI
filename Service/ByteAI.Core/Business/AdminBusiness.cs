using ByteAI.Core.Business.Interfaces;
using ByteAI.Core.Entities;
using ByteAI.Core.Services.FeatureFlags;

namespace ByteAI.Core.Business;

public sealed class AdminBusiness(IFeatureFlagService featureFlagService) : IAdminBusiness
{
    public Task<List<FeatureFlagType>> GetAllFeatureFlagsAsync(CancellationToken ct) =>
        featureFlagService.GetAllAsync(ct);

    public Task<List<FeatureFlagType>> GetEnabledFeatureFlagsAsync(string? clerkId, CancellationToken ct) =>
        featureFlagService.GetEnabledAsync(clerkId, ct);

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
}
