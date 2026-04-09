using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using MediatR;

namespace ByteAI.Core.Commands.Users;

public sealed record GetFollowersQuery(Guid UserId, PaginationParams Pagination) : IRequest<PagedResult<User>>;
public sealed record GetFollowingQuery(Guid UserId, PaginationParams Pagination) : IRequest<PagedResult<User>>;
