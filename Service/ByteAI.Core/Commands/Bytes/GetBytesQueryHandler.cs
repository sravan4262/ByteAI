using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ByteAI.Core.Commands.Bytes;

public sealed class GetBytesQueryHandler(AppDbContext db)
    : IRequestHandler<GetBytesQuery, PagedResult<ByteResult>>
{
    public async Task<PagedResult<ByteResult>> Handle(GetBytesQuery request, CancellationToken cancellationToken)
    {
        var query = db.Bytes.Where(b => b.IsActive).AsQueryable();

        if (request.AuthorId.HasValue)
            query = query.Where(b => b.AuthorId == request.AuthorId.Value);

        query = request.Sort switch
        {
            "trending" => query.OrderByDescending(b => b.CreatedAt),
            _          => query.OrderByDescending(b => b.CreatedAt)
        };

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip(request.Pagination.Skip)
            .Take(request.Pagination.PageSize)
            .Select(b => new ByteResult(
                b.Id, b.AuthorId, b.Title, b.Body, b.CodeSnippet, b.Language, b.Type,
                b.CreatedAt, b.UpdatedAt, b.Comments.Count(), b.UserLikes.Count()))
            .ToListAsync(cancellationToken);

        return new PagedResult<ByteResult>(items, total, request.Pagination.Page, request.Pagination.PageSize);
    }
}

public sealed class GetMyBytesQueryHandler(AppDbContext db)
    : IRequestHandler<GetMyBytesQuery, PagedResult<ByteResult>>
{
    public async Task<PagedResult<ByteResult>> Handle(GetMyBytesQuery request, CancellationToken cancellationToken)
    {
        var query = db.Bytes
            .Where(b => b.AuthorId == request.AuthorId && b.IsActive)
            .OrderByDescending(b => b.CreatedAt);

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip(request.Pagination.Skip)
            .Take(request.Pagination.PageSize)
            .Select(b => new ByteResult(
                b.Id, b.AuthorId, b.Title, b.Body, b.CodeSnippet, b.Language, b.Type,
                b.CreatedAt, b.UpdatedAt, b.Comments.Count(), b.UserLikes.Count()))
            .ToListAsync(cancellationToken);

        return new PagedResult<ByteResult>(items, total, request.Pagination.Page, request.Pagination.PageSize);
    }
}
