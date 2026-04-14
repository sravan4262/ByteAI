using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ByteAI.Core.Commands.Lookup;

public sealed class GetSeniorityTypesQueryHandler(AppDbContext db)
    : IRequestHandler<GetSeniorityTypesQuery, List<SeniorityType>>
{
    public Task<List<SeniorityType>> Handle(GetSeniorityTypesQuery _, CancellationToken ct) =>
        db.SeniorityTypes.AsNoTracking().OrderBy(s => s.SortOrder).ToListAsync(CancellationToken.None);
}

public sealed class GetDomainsQueryHandler(AppDbContext db)
    : IRequestHandler<GetDomainsQuery, List<Domain>>
{
    public Task<List<Domain>> Handle(GetDomainsQuery _, CancellationToken ct) =>
        db.Domains.AsNoTracking().OrderBy(d => d.SortOrder).ToListAsync(CancellationToken.None);
}

public sealed class GetTechStacksQueryHandler(AppDbContext db)
    : IRequestHandler<GetTechStacksQuery, List<TechStack>>
{
    public Task<List<TechStack>> Handle(GetTechStacksQuery request, CancellationToken ct)
    {
        var query = db.TechStacks.AsNoTracking().AsQueryable();
        if (request.DomainId.HasValue)
            query = query.Where(t => t.Subdomain.DomainId == request.DomainId.Value);
        return query.OrderBy(t => t.SortOrder).ToListAsync(CancellationToken.None);
    }
}

public sealed class GetBadgeTypesQueryHandler(AppDbContext db)
    : IRequestHandler<GetBadgeTypesQuery, List<BadgeType>>
{
    public Task<List<BadgeType>> Handle(GetBadgeTypesQuery _, CancellationToken ct) =>
        db.BadgeTypes.AsNoTracking().OrderBy(b => b.Name).ToListAsync(CancellationToken.None);
}

public sealed class GetLevelTypesQueryHandler(AppDbContext db)
    : IRequestHandler<GetLevelTypesQuery, List<LevelType>>
{
    public Task<List<LevelType>> Handle(GetLevelTypesQuery _, CancellationToken ct) =>
        db.LevelTypes.AsNoTracking().OrderBy(l => l.Level).ToListAsync(CancellationToken.None);
}

public sealed class GetSearchTypesQueryHandler(AppDbContext db)
    : IRequestHandler<GetSearchTypesQuery, List<SearchType>>
{
    public Task<List<SearchType>> Handle(GetSearchTypesQuery _, CancellationToken ct) =>
        db.SearchTypes.AsNoTracking().OrderBy(s => s.SortOrder).ToListAsync(CancellationToken.None);
}
