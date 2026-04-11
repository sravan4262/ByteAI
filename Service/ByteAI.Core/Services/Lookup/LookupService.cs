using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ByteAI.Core.Services.Lookup;

public sealed class LookupService(AppDbContext db) : ILookupService
{
    public Task<List<SeniorityType>> GetSeniorityTypesAsync(CancellationToken ct) =>
        db.SeniorityTypes.AsNoTracking().OrderBy(s => s.SortOrder).ToListAsync(ct);

    public Task<List<Domain>> GetDomainsAsync(CancellationToken ct) =>
        db.Domains.AsNoTracking().OrderBy(d => d.SortOrder).ToListAsync(ct);

    public Task<List<TechStack>> GetTechStacksAsync(Guid? domainId, CancellationToken ct)
    {
        var query = db.TechStacks.AsNoTracking().AsQueryable();
        if (domainId.HasValue)
            query = query.Where(t => t.DomainId == domainId.Value);
        return query.OrderBy(t => t.SortOrder).ToListAsync(ct);
    }

    public Task<List<BadgeType>> GetBadgeTypesAsync(CancellationToken ct) =>
        db.BadgeTypes.AsNoTracking().OrderBy(b => b.Name).ToListAsync(ct);

    public Task<List<LevelType>> GetLevelTypesAsync(CancellationToken ct) =>
        db.LevelTypes.AsNoTracking().OrderBy(l => l.Level).ToListAsync(ct);

    public Task<List<SearchType>> GetSearchTypesAsync(CancellationToken ct) =>
        db.SearchTypes.AsNoTracking().OrderBy(s => s.SortOrder).ToListAsync(ct);
}
