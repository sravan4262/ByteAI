using ByteAI.Core.Entities;

namespace ByteAI.Core.Business.Interfaces;

public interface IAdminBusiness
{
    Task<List<FeatureFlagType>> GetAllFeatureFlagsAsync(CancellationToken ct);
    Task<List<FeatureFlagType>> GetEnabledFeatureFlagsAsync(string? clerkId, CancellationToken ct);
    Task<FeatureFlagType> UpsertFeatureFlagAsync(string key, string name, string? description, bool globalOpen, CancellationToken ct);
    Task<FeatureFlagType> SetFeatureFlagEnabledAsync(string key, bool globalOpen, CancellationToken ct);
    Task<bool> DeleteFeatureFlagAsync(string key, CancellationToken ct);
    Task AssignFeatureFlagToUserAsync(string key, Guid userId, CancellationToken ct);
    Task RemoveFeatureFlagFromUserAsync(string key, Guid userId, CancellationToken ct);
    Task<List<string>> GetUserAssignedFeatureFlagsAsync(Guid userId, CancellationToken ct);
}
