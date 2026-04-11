using ByteAI.Core.Entities;

namespace ByteAI.Core.Services.Lookup;

public interface ILookupService
{
    Task<List<SeniorityType>> GetSeniorityTypesAsync(CancellationToken ct);
    Task<List<Domain>> GetDomainsAsync(CancellationToken ct);
    Task<List<TechStack>> GetTechStacksAsync(Guid? domainId, CancellationToken ct);
    Task<List<BadgeType>> GetBadgeTypesAsync(CancellationToken ct);
    Task<List<LevelType>> GetLevelTypesAsync(CancellationToken ct);
    Task<List<SearchType>> GetSearchTypesAsync(CancellationToken ct);
}
