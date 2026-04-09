using ByteAI.Core.Infrastructure.Persistence;
using ByteAI.Core.Services.AI;
using ByteAI.Core.Services.Search;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Pgvector;

namespace ByteAI.Core.Commands.Search;

public sealed class SearchQueryHandler(
    ISearchService search,
    IEmbeddingService embedding,
    AppDbContext db)
    : IRequestHandler<SearchQuery, List<Entities.Byte>>
{
    public async Task<List<Entities.Byte>> Handle(SearchQuery request, CancellationToken cancellationToken)
    {
        Vector? queryEmbedding = null;

        // Use user's interest_embedding as fallback, or embed the query string
        if (request.UserId.HasValue)
        {
            var user = await db.Users
                .AsNoTracking()
                .Where(u => u.Id == request.UserId.Value)
                .Select(u => new { u.InterestEmbedding })
                .FirstOrDefaultAsync(cancellationToken);

            queryEmbedding = user?.InterestEmbedding;
        }

        // Embed the search query for vector search
        if (queryEmbedding is null && !string.IsNullOrWhiteSpace(request.Q))
        {
            var floats = await embedding.EmbedAsync(request.Q, cancellationToken);
            queryEmbedding = new Vector(floats);
        }

        return await search.SearchBytesAsync(request.Q, queryEmbedding, request.Limit, cancellationToken);
    }
}
