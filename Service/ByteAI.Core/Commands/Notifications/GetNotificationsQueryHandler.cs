using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ByteAI.Core.Commands.Notifications;

public sealed class GetNotificationsQueryHandler(AppDbContext db)
    : IRequestHandler<GetNotificationsQuery, PagedResult<Notification>>
{
    public async Task<PagedResult<Notification>> Handle(GetNotificationsQuery request, CancellationToken cancellationToken)
    {
        var query = db.Notifications
            .AsNoTracking()
            .Where(n => n.UserId == request.UserId);

        if (request.UnreadOnly)
            query = query.Where(n => !n.Read);

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(n => n.CreatedAt)
            .Skip(request.Pagination.Skip)
            .Take(request.Pagination.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<Notification>(items, total, request.Pagination.Page, request.Pagination.PageSize);
    }
}
