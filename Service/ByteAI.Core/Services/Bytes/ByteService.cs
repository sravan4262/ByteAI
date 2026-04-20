using ByteAI.Core.Commands.Bytes;
using ByteAI.Core.Entities;
using ByteAI.Core.Events;
using ByteAI.Core.Exceptions;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Persistence;
using ByteAI.Core.Services.AI;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Pgvector;
using Pgvector.EntityFrameworkCore;

namespace ByteAI.Core.Services.Bytes;

public sealed class ByteService(AppDbContext db, IPublisher publisher, IEmbeddingService embedding, TechDomainAnchors anchors, IGroqService groq, ILogger<ByteService> logger) : IByteService
{
    public async Task UpdateEmbeddingAsync(Guid byteId, float[] embedding, CancellationToken ct = default)
    {
        var entity = await db.Bytes.FindAsync([byteId], CancellationToken.None);
        if (entity is null) return;

        entity.Embedding = new Vector(embedding);
        await db.SaveChangesAsync(ct);
    }

    public async Task<PagedResult<ByteResult>> GetBytesAsync(PaginationParams pagination, Guid? authorId, string sort, CancellationToken ct, Guid? requesterId = null)
    {
        // Privacy: if fetching a specific author's bytes, block if their profile is private and requester isn't them
        if (authorId.HasValue && requesterId != authorId.Value)
        {
            var prefs = await db.UserPreferences.FindAsync([authorId.Value], ct);
            if (prefs?.Visibility == "private")
                return new PagedResult<ByteResult>([], 0, pagination.Page, pagination.PageSize);
        }

        var query = db.Bytes.Where(b => b.IsActive).AsQueryable();

        if (authorId.HasValue)
            query = query.Where(b => b.AuthorId == authorId.Value);

        query = sort switch
        {
            "trending" => query.OrderByDescending(b => b.CreatedAt),
            _          => query.OrderByDescending(b => b.CreatedAt)
        };

        var total = await query.CountAsync(CancellationToken.None);
        var items = await query
            .Skip(pagination.Skip)
            .Take(pagination.PageSize)
            .Select(b => new ByteResult(
                b.Id, b.AuthorId, b.Title, b.Body, b.CodeSnippet, b.Language, b.Type,
                b.CreatedAt, b.UpdatedAt, b.Comments.Count(), b.UserLikes.Count(),
                requesterId.HasValue && b.UserLikes.Any(l => l.UserId == requesterId.Value),
                requesterId.HasValue && b.UserBookmarks.Any(bk => bk.UserId == requesterId.Value),
                b.Author.Username, b.Author.DisplayName ?? b.Author.Username, b.Author.AvatarUrl, b.Author.RoleTitle, b.Author.Company))
            .ToListAsync(CancellationToken.None);

        return new PagedResult<ByteResult>(items, total, pagination.Page, pagination.PageSize);
    }

    public Task<ByteResult?> GetByteByIdAsync(Guid byteId, CancellationToken ct, Guid? requesterId = null) =>
        db.Bytes
            .Where(b => b.Id == byteId && b.IsActive)
            .Select(b => new ByteResult(
                b.Id, b.AuthorId, b.Title, b.Body, b.CodeSnippet, b.Language, b.Type,
                b.CreatedAt, b.UpdatedAt, b.Comments.Count(), b.UserLikes.Count(),
                requesterId.HasValue && b.UserLikes.Any(l => l.UserId == requesterId.Value),
                requesterId.HasValue && b.UserBookmarks.Any(bk => bk.UserId == requesterId.Value),
                b.Author.Username, b.Author.DisplayName ?? b.Author.Username, b.Author.AvatarUrl, b.Author.RoleTitle, b.Author.Company))
            .FirstOrDefaultAsync(CancellationToken.None);

    public async Task<ByteResult> CreateByteAsync(Guid authorId, string title, string body, string? codeSnippet, string? language, string type, CancellationToken ct, bool force = false, List<string>? techStackNames = null)
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

        logger.LogInformation("Content validation similarity score: {Score:F4} for title: {Title}", maxSim, title);

        if (maxSim < 0.15f)
            throw new InvalidContentException("ByteAI is for tech content only. This doesn't appear to be tech-related.");

        // ── Stage 3: Groq is the real content gate ────────────────────────────
        // nomic scores general English too high against tech anchors (0.55+),
        // so embedding is only used as a cheap hard-reject at very low scores.
        // Groq decides for everything else.
        {
            var validation = await groq.ValidateTechContentAsync(title, body, ct);
            logger.LogInformation("Groq validation result: {Result}", validation);
            if (validation is not null)
            {
                if (!validation.IsCoherent)
                    throw new InvalidContentException("Content appears to be gibberish. Please write meaningful tech content.");
                if (!validation.IsTechRelated)
                    throw new InvalidContentException($"ByteAI is for tech content only. {validation.Reason}");
            }
            else
            {
                logger.LogWarning("Groq validation unavailable (API down, rate-limited, or key missing) for: {Title}", title);
                throw new ServiceUnavailableException("Content validation is temporarily unavailable. Please try again in a moment.");
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
                .FirstOrDefaultAsync(CancellationToken.None);

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

        if (techStackNames is { Count: > 0 })
        {
            var names = techStackNames.Select(n => n.ToLowerInvariant()).ToList();
            var stacks = await db.TechStacks
                .Where(t => names.Contains(t.Name.ToLower()))
                .ToListAsync(ct);

            foreach (var stack in stacks)
                db.ByteTechStacks.Add(new ByteTechStack { ByteId = entity.Id, TechStackId = stack.Id });

            await db.SaveChangesAsync(ct);
        }

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

        // Only validate when title or body actually changes
        var newTitle = !string.IsNullOrWhiteSpace(title) ? title : entity.Title;
        var newBody  = !string.IsNullOrWhiteSpace(body)  ? body  : entity.Body;
        bool contentChanged = (!string.IsNullOrWhiteSpace(title) && title != entity.Title)
                           || (!string.IsNullOrWhiteSpace(body)  && body  != entity.Body);

        if (contentChanged)
        {
            // Stage 1: entropy / gibberish check
            if (IsGibberish(newTitle, newBody))
                throw new InvalidContentException("Content appears to be gibberish. Please write meaningful tech content.");

            // Stage 2: hard-reject very low similarity
            var topicVec = await embedding.EmbedQueryAsync($"{newTitle} {newBody}", ct);
            var maxSim = anchors.MaxSimilarity(topicVec);
            logger.LogInformation("Update validation similarity: {Score:F4} for byte {ByteId}", maxSim, byteId);
            if (maxSim < 0.15f)
                throw new InvalidContentException("ByteAI is for tech content only. This doesn't appear to be tech-related.");

            // Stage 3: Groq is the authoritative gate
            var validation = await groq.ValidateTechContentAsync(newTitle, newBody, ct);
            if (validation is null)
            {
                logger.LogWarning("Groq validation unavailable during update for byte {ByteId}", byteId);
                throw new ServiceUnavailableException("Content validation is temporarily unavailable. Please try again in a moment.");
            }
            if (!validation.IsCoherent)
                throw new InvalidContentException("Content appears to be gibberish. Please write meaningful tech content.");
            if (!validation.IsTechRelated)
                throw new InvalidContentException($"ByteAI is for tech content only. {validation.Reason}");
        }

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

        var total = await query.CountAsync(CancellationToken.None);
        var items = await query
            .Skip(pagination.Skip)
            .Take(pagination.PageSize)
            .Select(b => new ByteResult(
                b.Id, b.AuthorId, b.Title, b.Body, b.CodeSnippet, b.Language, b.Type,
                b.CreatedAt, b.UpdatedAt, b.Comments.Count(), b.UserLikes.Count(), false, false,
                b.Author.Username, b.Author.DisplayName ?? b.Author.Username, b.Author.AvatarUrl, b.Author.RoleTitle, b.Author.Company))
            .ToListAsync(CancellationToken.None);

        return new PagedResult<ByteResult>(items, total, pagination.Page, pagination.PageSize);
    }

    public async Task RecordViewAsync(Guid byteId, Guid? userId, int? dwellMs, CancellationToken ct)
    {
        db.UserViews.Add(new Entities.UserView
        {
            ByteId    = byteId,
            UserId    = userId,
            ViewedAt  = DateTime.UtcNow,
            DwellMs   = dwellMs,
        });
        await db.SaveChangesAsync(ct);

        if (userId.HasValue && dwellMs >= 5000)
            await publisher.Publish(new UserViewedByteEvent(userId.Value, byteId), ct);
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

        var letters = combined.Where(char.IsLetter).ToList();
        if (letters.Count == 0) return true;

        // Shannon entropy of the character distribution
        var freq = combined.GroupBy(c => c).Select(g => (double)g.Count() / combined.Length);
        var entropy = -freq.Sum(p => p * Math.Log2(p));

        var words = combined.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var avgWordLen = words.Length > 0 ? words.Average(w => (double)w.Length) : 0;

        // Vowel ratio — normal English is ~38%, gibberish is typically <15%
        var vowels = new HashSet<char> { 'a', 'e', 'i', 'o', 'u' };
        var vowelRatio = (double)letters.Count(c => vowels.Contains(char.ToLower(c))) / letters.Count;

        // Non-alpha ratio — high punctuation/symbol density signals keyboard mashing
        var nonAlphaRatio = (double)combined.Count(c => !char.IsLetterOrDigit(c) && c != ' ') / combined.Length;

        return entropy < 3.0 || avgWordLen < 2.5 || vowelRatio < 0.15 || nonAlphaRatio > 0.25;
    }
}
