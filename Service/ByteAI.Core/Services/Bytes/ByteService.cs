using ByteAI.Core.Commands.Bytes;
using ByteAI.Core.Entities;
using ByteAI.Core.Events;
using ByteAI.Core.Exceptions;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Persistence;
using ByteAI.Core.Services.AI;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Pgvector;
using Pgvector.EntityFrameworkCore;

namespace ByteAI.Core.Services.Bytes;

public sealed class ByteService(AppDbContext db, IPublisher publisher, IEmbeddingService embedding, TechDomainAnchors anchors, IGroqService groq) : IByteService
{
    public async Task UpdateEmbeddingAsync(Guid byteId, float[] embedding, CancellationToken ct = default)
    {
        var entity = await db.Bytes.FindAsync([byteId], ct);
        if (entity is null) return;

        entity.Embedding = new Vector(embedding);
        await db.SaveChangesAsync(ct);
    }

    public async Task<PagedResult<ByteResult>> GetBytesAsync(PaginationParams pagination, Guid? authorId, string sort, CancellationToken ct)
    {
        var query = db.Bytes.Where(b => b.IsActive).AsQueryable();

        if (authorId.HasValue)
            query = query.Where(b => b.AuthorId == authorId.Value);

        query = sort switch
        {
            "trending" => query.OrderByDescending(b => b.CreatedAt),
            _          => query.OrderByDescending(b => b.CreatedAt)
        };

        var total = await query.CountAsync(ct);
        var items = await query
            .Skip(pagination.Skip)
            .Take(pagination.PageSize)
            .Select(b => new ByteResult(
                b.Id, b.AuthorId, b.Title, b.Body, b.CodeSnippet, b.Language, b.Type,
                b.CreatedAt, b.UpdatedAt, b.Comments.Count(), b.UserLikes.Count()))
            .ToListAsync(ct);

        return new PagedResult<ByteResult>(items, total, pagination.Page, pagination.PageSize);
    }

    public Task<ByteResult?> GetByteByIdAsync(Guid byteId, CancellationToken ct) =>
        db.Bytes
            .Where(b => b.Id == byteId && b.IsActive)
            .Select(b => new ByteResult(
                b.Id, b.AuthorId, b.Title, b.Body, b.CodeSnippet, b.Language, b.Type,
                b.CreatedAt, b.UpdatedAt, b.Comments.Count(), b.UserLikes.Count()))
            .FirstOrDefaultAsync(ct);

    public async Task<ByteResult> CreateByteAsync(Guid authorId, string title, string body, string? codeSnippet, string? language, string type, CancellationToken ct, bool force = false)
    {
        var validTypes = new[] { "article", "tutorial", "snippet", "discussion" };
        var normalised = type == "byte" ? "article" : type;
        if (!validTypes.Contains(normalised)) normalised = "article";

        // ── Stage 1: Anti-gibberish entropy check ─────────────────────────────
        if (IsGibberish(title, body))
            throw new InvalidContentException("Content appears to be gibberish. Please write meaningful tech content.");

        // ── Stage 2: Tech-relevance embedding check ───────────────────────────
        var topicText = $"{title} {body}";
        var topicVec = await embedding.EmbedQueryAsync(topicText, ct);
        var maxSim = anchors.MaxSimilarity(topicVec);

        if (maxSim < 0.20f)
            throw new InvalidContentException("ByteAI is for tech content only. This doesn't appear to be tech-related.");

        // ── Stage 3: Borderline — escalate to Groq for binary classification ──
        if (maxSim < 0.30f)
        {
            var validation = await groq.ValidateTechContentAsync(title, body, ct);
            if (validation is not null)
            {
                if (!validation.IsCoherent)
                    throw new InvalidContentException("Content appears to be gibberish. Please write meaningful tech content.");
                if (!validation.IsTechRelated)
                    throw new InvalidContentException($"ByteAI is for tech content only. {validation.Reason}");
            }
        }

        // ── Near-duplicate detection (skip if force=true) ─────────────────────
        if (!force)
        {
            var content = title + " " + body + (codeSnippet ?? "");
            var queryVec = new Vector(await embedding.EmbedQueryAsync(content, ct));

            var nearest = await db.Bytes
                .AsNoTracking()
                .Where(b => b.Embedding != null && b.Embedding.CosineDistance(queryVec) < 0.08)
                .OrderBy(b => b.Embedding!.CosineDistance(queryVec))
                .Select(b => new { b.Id, b.Title, Distance = b.Embedding!.CosineDistance(queryVec) })
                .FirstOrDefaultAsync(ct);

            if (nearest is not null)
                throw new DuplicateContentException(nearest.Id, nearest.Title, 1.0 - nearest.Distance);
        }

        var entity = new Byte
        {
            Id = Guid.NewGuid(),
            AuthorId = authorId,
            Title = title,
            Body = body,
            CodeSnippet = codeSnippet,
            Language = language,
            Type = normalised,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        db.Bytes.Add(entity);
        await db.SaveChangesAsync(ct);

        await publisher.Publish(
            new ByteCreatedEvent(entity.Id, entity.AuthorId, entity.Title, entity.Body, entity.CodeSnippet),
            ct);

        return new ByteResult(entity.Id, entity.AuthorId, entity.Title, entity.Body, entity.CodeSnippet, entity.Language, entity.Type, entity.CreatedAt, entity.UpdatedAt, 0, 0);
    }

    public async Task<Byte> UpdateByteAsync(Guid byteId, Guid authorId, string? title, string? body, string? codeSnippet, string? language, CancellationToken ct)
    {
        var entity = await db.Bytes.FirstOrDefaultAsync(b => b.Id == byteId, ct)
            ?? throw new KeyNotFoundException($"Byte {byteId} not found");

        if (entity.AuthorId != authorId)
            throw new UnauthorizedAccessException("Cannot update another user's byte");

        if (!string.IsNullOrWhiteSpace(title)) entity.Title = title;
        if (!string.IsNullOrWhiteSpace(body)) entity.Body = body;
        if (codeSnippet is not null) entity.CodeSnippet = codeSnippet;
        if (language is not null) entity.Language = language;
        entity.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        return entity;
    }

    public async Task<bool> DeleteByteAsync(Guid byteId, Guid authorId, CancellationToken ct)
    {
        var entity = await db.Bytes.FirstOrDefaultAsync(b => b.Id == byteId, ct);
        if (entity is null) return false;

        if (entity.AuthorId != authorId)
            throw new UnauthorizedAccessException("Cannot delete another user's byte");

        entity.IsActive = false;
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<PagedResult<ByteResult>> GetMyBytesAsync(Guid authorId, PaginationParams pagination, CancellationToken ct)
    {
        var query = db.Bytes
            .Where(b => b.AuthorId == authorId && b.IsActive)
            .OrderByDescending(b => b.CreatedAt);

        var total = await query.CountAsync(ct);
        var items = await query
            .Skip(pagination.Skip)
            .Take(pagination.PageSize)
            .Select(b => new ByteResult(
                b.Id, b.AuthorId, b.Title, b.Body, b.CodeSnippet, b.Language, b.Type,
                b.CreatedAt, b.UpdatedAt, b.Comments.Count(), b.UserLikes.Count()))
            .ToListAsync(ct);

        return new PagedResult<ByteResult>(items, total, pagination.Page, pagination.PageSize);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /// <summary>
    /// Returns true if the combined title+body looks like gibberish:
    /// too short, very low character entropy, or suspiciously short average word length.
    /// This is a cheap pre-filter — runs before any embedding or Groq call.
    /// </summary>
    private static bool IsGibberish(string title, string body)
    {
        var combined = $"{title} {body}";
        if (combined.TrimEnd().Length < 15) return true;

        // Shannon entropy of the character distribution
        var freq = combined.GroupBy(c => c).Select(g => (double)g.Count() / combined.Length);
        var entropy = -freq.Sum(p => p * Math.Log2(p));

        var words = combined.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var avgWordLen = words.Length > 0 ? words.Average(w => (double)w.Length) : 0;

        return entropy < 3.0 || avgWordLen < 2.5;
    }
}
