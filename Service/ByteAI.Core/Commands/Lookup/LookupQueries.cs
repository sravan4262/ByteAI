using ByteAI.Core.Entities;
using MediatR;

namespace ByteAI.Core.Commands.Lookup;

public sealed record GetSeniorityTypesQuery : IRequest<List<SeniorityType>>;
public sealed record GetDomainsQuery : IRequest<List<Domain>>;
public sealed record GetTechStacksQuery(Guid? DomainId = null) : IRequest<List<TechStack>>;
public sealed record GetBadgeTypesQuery : IRequest<List<BadgeType>>;
public sealed record GetLevelTypesQuery : IRequest<List<LevelType>>;
public sealed record GetSearchTypesQuery : IRequest<List<SearchType>>;
