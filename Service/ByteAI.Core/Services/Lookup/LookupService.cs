using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ByteAI.Core.Services.Lookup;

public sealed class LookupService(AppDbContext db) : ILookupService
{
    public Task<List<SeniorityType>> GetSeniorityTypesAsync(CancellationToken ct) =>
        db.SeniorityTypes.AsNoTracking().OrderBy(s => s.SortOrder).ToListAsync(CancellationToken.None);

    public Task<List<Domain>> GetDomainsAsync(CancellationToken ct) =>
        db.Domains.AsNoTracking().OrderBy(d => d.SortOrder).ToListAsync(CancellationToken.None);

    public Task<List<Subdomain>> GetSubdomainsAsync(Guid? domainId, CancellationToken ct)
    {
        var query = db.SubDomains.AsNoTracking().AsQueryable();
        if (domainId.HasValue)
            query = query.Where(s => s.DomainId == domainId.Value);
        return query.OrderBy(s => s.SortOrder).ToListAsync(CancellationToken.None);
    }

    public Task<List<TechStack>> GetTechStacksAsync(Guid? subdomainId, CancellationToken ct)
    {
        var query = db.TechStacks.AsNoTracking().AsQueryable();
        if (subdomainId.HasValue)
            query = query.Where(t => t.SubdomainId == subdomainId.Value);
        return query.OrderBy(t => t.SortOrder).ToListAsync(CancellationToken.None);
    }

    public Task<List<BadgeType>> GetBadgeTypesAsync(CancellationToken ct) =>
        db.BadgeTypes.AsNoTracking().OrderBy(b => b.Name).ToListAsync(CancellationToken.None);

    public Task<List<LevelType>> GetLevelTypesAsync(CancellationToken ct) =>
        db.LevelTypes.AsNoTracking().OrderBy(l => l.Level).ToListAsync(CancellationToken.None);

    public Task<List<SearchType>> GetSearchTypesAsync(CancellationToken ct) =>
        db.SearchTypes.AsNoTracking().OrderBy(s => s.SortOrder).ToListAsync(CancellationToken.None);
}
