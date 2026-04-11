using ByteAI.Core.Business.Interfaces;
using ByteAI.Core.Commands.Search;
using ByteAI.Core.Entities;
using ByteAI.Core.Services.AI;
using ByteAI.Core.Services.Search;
using Pgvector;

namespace ByteAI.Core.Business;

public sealed class SearchBusiness(ISearchService searchService, IEmbeddingService embeddingService) : ISearchBusiness
{
    public async Task<List<SearchResultDto>> SearchContentAsync(string q, string type, int limit, CancellationToken ct)
    {
        Pgvector.Vector? queryEmbedding = null;
        if (!string.IsNullOrWhiteSpace(q))
        {
            var floats = await embeddingService.EmbedQueryAsync(q, ct);
            queryEmbedding = new Pgvector.Vector(floats);
        }

        var results = new List<SearchResultDto>();
        var typeLower = type.ToLowerInvariant();

        if (typeLower is "bytes" or "all")
        {
            var bytes = await searchService.SearchBytesAsync(q, queryEmbedding, limit, ct);
            results.AddRange(bytes.Select(b => new SearchResultDto(
                Id: b.Id,
                AuthorId: b.AuthorId,
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

        if (typeLower is "interviews" or "all")
        {
            var interviews = await searchService.SearchInterviewsAsync(q, queryEmbedding, limit, ct);
            results.AddRange(interviews.Select(i => new SearchResultDto(
                Id: i.Id,
                AuthorId: i.AuthorId,
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

        if (typeLower == "all")
            results = results.OrderByDescending(r => r.CreatedAt).Take(limit).ToList();

        return results;
    }

    public async Task<List<User>> SearchPeopleAsync(string q, int limit, CancellationToken ct) =>
        await searchService.SearchPeopleAsync(q, limit, ct);
}
