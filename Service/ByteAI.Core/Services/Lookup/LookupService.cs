using ByteAI.Core.Commands.Lookup;
using ByteAI.Core.Entities;
using MediatR;

namespace ByteAI.Core.Services.Lookup;

public sealed class LookupService(IMediator mediator) : ILookupService
{
    public Task<List<SeniorityType>> GetSeniorityTypesAsync(CancellationToken ct)
        => mediator.Send(new GetSeniorityTypesQuery(), ct);

    public Task<List<Domain>> GetDomainsAsync(CancellationToken ct)
        => mediator.Send(new GetDomainsQuery(), ct);

    public Task<List<TechStack>> GetTechStacksAsync(Guid? domainId, CancellationToken ct)
        => mediator.Send(new GetTechStacksQuery(domainId), ct);

    public Task<List<BadgeType>> GetBadgeTypesAsync(CancellationToken ct)
        => mediator.Send(new GetBadgeTypesQuery(), ct);

    public Task<List<LevelType>> GetLevelTypesAsync(CancellationToken ct)
        => mediator.Send(new GetLevelTypesQuery(), ct);

    public Task<List<SearchType>> GetSearchTypesAsync(CancellationToken ct)
        => mediator.Send(new GetSearchTypesQuery(), ct);
}
