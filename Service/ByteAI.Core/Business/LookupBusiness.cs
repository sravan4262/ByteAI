using ByteAI.Core.Business.Interfaces;
using ByteAI.Core.Entities;
using ByteAI.Core.Services.Lookup;

namespace ByteAI.Core.Business;

public sealed class LookupBusiness(ILookupService lookupService) : ILookupBusiness
{
    public async Task<List<SeniorityType>> GetSeniorityTypesAsync(CancellationToken ct) =>
        await lookupService.GetSeniorityTypesAsync(ct);

    public async Task<List<Domain>> GetDomainsAsync(CancellationToken ct) =>
        await lookupService.GetDomainsAsync(ct);

    public async Task<List<Subdomain>> GetSubdomainsAsync(Guid? domainId, CancellationToken ct) =>
        await lookupService.GetSubdomainsAsync(domainId, ct);

    public async Task<List<TechStack>> GetTechStacksAsync(Guid? subdomainId, CancellationToken ct) =>
        await lookupService.GetTechStacksAsync(subdomainId, ct);

    public async Task<List<BadgeType>> GetBadgeTypesAsync(CancellationToken ct) =>
        await lookupService.GetBadgeTypesAsync(ct);

    public async Task<List<LevelType>> GetLevelTypesAsync(CancellationToken ct) =>
        await lookupService.GetLevelTypesAsync(ct);

    public async Task<List<SearchType>> GetSearchTypesAsync(CancellationToken ct) =>
        await lookupService.GetSearchTypesAsync(ct);
}
