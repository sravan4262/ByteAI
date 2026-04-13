using ByteAI.Core.Entities;

namespace ByteAI.Core.Business.Interfaces;

public interface ILookupBusiness
{
    Task<List<SeniorityType>> GetSeniorityTypesAsync(CancellationToken ct);
    Task<List<Domain>> GetDomainsAsync(CancellationToken ct);
    Task<List<Subdomain>> GetSubdomainsAsync(Guid? domainId, CancellationToken ct);
    Task<List<TechStack>> GetTechStacksAsync(Guid? subdomainId, CancellationToken ct);
    Task<List<BadgeType>> GetBadgeTypesAsync(CancellationToken ct);
    Task<List<LevelType>> GetLevelTypesAsync(CancellationToken ct);
    Task<List<SearchType>> GetSearchTypesAsync(CancellationToken ct);
}
