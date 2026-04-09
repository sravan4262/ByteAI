using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using MediatR;

namespace ByteAI.Core.Commands.Notifications;

public sealed record GetNotificationsQuery(
    Guid UserId,
    PaginationParams Pagination,
    bool UnreadOnly = false
) : IRequest<PagedResult<Notification>>;
