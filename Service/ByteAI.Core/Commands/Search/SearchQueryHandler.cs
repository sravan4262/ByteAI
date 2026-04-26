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
    : IRequestHandler<SearchQuery, List<SearchResultDto>>
{
    public async Task<List<SearchResultDto>> Handle(SearchQuery request, CancellationToken cancellationToken)
    {
        Vector? queryEmbedding = null;

        // Explicit query always takes priority — embed what the user typed.
        // InterestEmbedding is only for discovery (no query), not explicit search.
        if (!string.IsNullOrWhiteSpace(request.Q))
        {
            var floats = await embedding.EmbedQueryAsync(request.Q, cancellationToken);
            queryEmbedding = new Vector(floats);
        }
        else if (request.UserId.HasValue)
        {
            // No query string — fall back to user's interest profile for personalised discovery
            var user = await db.Users
                .AsNoTracking()
                .Where(u => u.Id == request.UserId.Value)
                .Select(u => new { u.InterestEmbedding })
                .FirstOrDefaultAsync(cancellationToken);

            queryEmbedding = user?.InterestEmbedding;
        }

        var results = new List<SearchResultDto>();
        var type = request.Type.ToLowerInvariant();

        // ── Search bytes ──────────────────────────────────────────────────────
        if (type is "bytes" or "all")
        {
            var bytes = await search.SearchBytesAsync(request.Q, queryEmbedding, request.Limit, cancellationToken);
            results.AddRange(bytes.Select(b => new SearchResultDto(
                Id: b.Id,
                AuthorId: b.AuthorId,
                AuthorUsername: b.Author?.Username ?? "",
                AuthorDisplayName: b.Author?.DisplayName,
                AuthorAvatarUrl: b.Author?.AvatarUrl,
                AuthorRoleTitle: b.Author?.RoleTitle,
                AuthorCompany: b.Author?.Company,
                Title: b.Title,
                Body: b.Body,
                CodeSnippet: b.CodeSnippet,
                Language: b.Language,
                Tags: [],
                Type: b.Type,
                ContentType: "byte",
                LikeCount: 0,
                CommentCount: 0,
                CreatedAt: b.CreatedAt
            )));
        }

        // ── Search interviews ─────────────────────────────────────────────────
        if (type is "interviews" or "all")
        {
            var interviews = await search.SearchInterviewsAsync(request.Q, queryEmbedding, request.Limit, cancellationToken);
            results.AddRange(interviews.Select(i => new SearchResultDto(
                Id: i.Id,
                AuthorId: i.AuthorId,
                AuthorUsername: i.Author?.Username ?? "",
                AuthorDisplayName: i.Author?.DisplayName,
                AuthorAvatarUrl: i.Author?.AvatarUrl,
                AuthorRoleTitle: i.Author?.RoleTitle,
                AuthorCompany: i.Author?.Company,
                Title: i.Title,
                Body: i.Body,
                CodeSnippet: i.CodeSnippet,
                Language: i.Language,
                Tags: [],
                Type: i.Type,
                ContentType: "interview",
                LikeCount: 0,
                CommentCount: 0,
                CreatedAt: i.CreatedAt
            )));
        }

        // When searching all, interleave by recency so results feel natural
        if (type == "all")
            results = results.OrderByDescending(r => r.CreatedAt).Take(request.Limit).ToList();

        return results;
    }
}
