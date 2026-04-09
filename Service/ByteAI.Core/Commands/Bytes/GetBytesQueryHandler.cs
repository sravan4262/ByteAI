using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ByteAI.Core.Commands.Bytes;

public sealed class GetBytesQueryHandler(AppDbContext db)
    : IRequestHandler<GetBytesQuery, PagedResult<Byte>>
{
    public async Task<PagedResult<Byte>> Handle(GetBytesQuery request, CancellationToken cancellationToken)
    {
        var query = db.Bytes.AsQueryable();

        if (request.AuthorId.HasValue)
            query = query.Where(b => b.AuthorId == request.AuthorId.Value);

        if (request.Tags?.Count > 0)
            query = query.Where(b => b.Tags.Any(t => request.Tags.Contains(t)));

        query = request.Sort switch
        {
            "trending" => query.OrderByDescending(b => b.LikeCount).ThenByDescending(b => b.CommentCount).ThenByDescending(b => b.CreatedAt),
            "views"    => query.OrderByDescending(b => b.ViewCount),
            _          => query.OrderByDescending(b => b.CreatedAt)
        };

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip(request.Pagination.Skip)
            .Take(request.Pagination.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<Byte>(items, total, request.Pagination.Page, request.Pagination.PageSize);
    }
}
