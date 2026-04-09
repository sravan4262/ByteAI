using ByteAI.Core.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Pgvector;
using Pgvector.EntityFrameworkCore;

namespace ByteAI.Core.Services.Search;

public sealed class SearchService(AppDbContext db, ILogger<SearchService> logger) : ISearchService
{
    private const int RrfK = 60; // RRF constant — standard value

    public async Task<List<Entities.Byte>> SearchBytesAsync(
        string query, Vector? queryEmbedding, int limit, CancellationToken ct = default)
    {
        // ── Full-text results ─────────────────────────────────────────────────
        var ftResults = await db.Bytes
            .AsNoTracking()
            .Where(b => EF.Functions.ToTsVector("english", b.Title + " " + b.Body)
                         .Matches(EF.Functions.PhraseToTsQuery("english", query)))
            .OrderByDescending(b => EF.Functions.ToTsVector("english", b.Title + " " + b.Body)
                                     .Rank(EF.Functions.PhraseToTsQuery("english", query)))
            .Take(limit * 2) // fetch extra for RRF merge
            .Select(b => b.Id)
            .ToListAsync(ct);

        // ── Vector results (when embedding available) ─────────────────────────
        List<Guid> vecResults = [];
        if (queryEmbedding is not null)
        {
            vecResults = await db.Bytes
                .AsNoTracking()
                .Where(b => b.Embedding != null)
                .OrderBy(b => b.Embedding!.CosineDistance(queryEmbedding))
                .Take(limit * 2)
                .Select(b => b.Id)
                .ToListAsync(ct);
        }

        // ── Reciprocal Rank Fusion ────────────────────────────────────────────
        var scores = new Dictionary<Guid, double>();

        for (int i = 0; i < ftResults.Count; i++)
            scores[ftResults[i]] = scores.GetValueOrDefault(ftResults[i]) + 1.0 / (RrfK + i + 1);

        for (int i = 0; i < vecResults.Count; i++)
            scores[vecResults[i]] = scores.GetValueOrDefault(vecResults[i]) + 1.0 / (RrfK + i + 1);

        var topIds = scores
            .OrderByDescending(kv => kv.Value)
            .Take(limit)
            .Select(kv => kv.Key)
            .ToList();

        if (topIds.Count == 0) return [];

        // ── Fetch full entities in ranked order ───────────────────────────────
        var entities = await db.Bytes
            .AsNoTracking()
            .Where(b => topIds.Contains(b.Id))
            .ToListAsync(ct);

        return entities.OrderBy(b => topIds.IndexOf(b.Id)).ToList();
    }
}
