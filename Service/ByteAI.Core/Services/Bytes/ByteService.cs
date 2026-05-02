using ByteAI.Core.Commands.Bytes;
using ByteAI.Core.Entities;
using ByteAI.Core.Events;
using ByteAI.Core.Exceptions;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Persistence;
using ByteAI.Core.Moderation;
using ByteAI.Core.Services.AI;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Pgvector;
using Pgvector.EntityFrameworkCore;

namespace ByteAI.Core.Services.Bytes;

public sealed class ByteService(AppDbContext db, IPublisher publisher, IEmbeddingService embedding, IModerationService moderation) : IByteService
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

        // ── Unified moderation (Layer 1 deterministic + Gemini) ───────────────
        // Throws ContentModerationException → 422 CONTENT_REJECTED on a hard block
        // (off-topic, profanity, toxicity, hate, sexual, harm, PII, spam, gibberish, prompt-injection).
        // On Medium severity (Layer 1 PII / URL spam) the call records a flag row
        // for moderator review and returns; the post still goes through.
        await moderation.EnforceAsync(db, $"{title}\n\n{body}", ModerationContext.Byte, authorId: authorId, ct: ct);

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
            var inputs = techStackNames
                .Where(n => !string.IsNullOrWhiteSpace(n))
                .Select(n => (Original: n.Trim(), Slug: SlugifyTechStack(n)))
                .GroupBy(p => p.Slug)
                .Select(g => g.First())
                .ToList();

            var slugs = inputs.Select(i => i.Slug).ToList();
            var existing = await db.TechStacks
                .Where(t => slugs.Contains(t.Name))
                .ToListAsync(ct);
            var existingSlugs = existing.Select(t => t.Name).ToHashSet();

            var newStacks = inputs
                .Where(i => !existingSlugs.Contains(i.Slug))
                .Select(i => new TechStack
                {
                    Id = Guid.NewGuid(),
                    SubdomainId = null,
                    Name = i.Slug,
                    Label = TitleCaseLabel(i.Original),
                    SortOrder = 999,
                })
                .ToList();

            if (newStacks.Count > 0)
            {
                db.TechStacks.AddRange(newStacks);
                await db.SaveChangesAsync(ct);
            }

            foreach (var stack in existing.Concat(newStacks))
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
            await moderation.EnforceAsync(db, $"{newTitle}\n\n{newBody}", ModerationContext.Byte, contentId: byteId, authorId: authorId, ct: ct);
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
        var now = DateTime.UtcNow;

        // Anonymous: no dedup possible (no identity), and no EMA. Just record for analytics.
        if (!userId.HasValue)
        {
            db.UserViews.Add(new Entities.UserView { ByteId = byteId, UserId = null, ViewedAt = now, DwellMs = dwellMs });
            await db.SaveChangesAsync(ct);
            return;
        }

        // Dedup at (user_id, byte_id) per 24h: collapse repeated opens into one row, taking the longest dwell.
        // Prevents tab-loop gaming of trending and rabbit-hole drift in the interest-embedding EMA.
        var since24h = now.AddHours(-24);
        var existing = await db.UserViews
            .Where(v => v.UserId == userId.Value && v.ByteId == byteId && v.ViewedAt >= since24h)
            .OrderByDescending(v => v.ViewedAt)
            .FirstOrDefaultAsync(ct);

        bool emaShouldFire;
        if (existing is null)
        {
            db.UserViews.Add(new Entities.UserView
            {
                ByteId   = byteId,
                UserId   = userId,
                ViewedAt = now,
                DwellMs  = dwellMs,
            });
            emaShouldFire = dwellMs >= 5000;
        }
        else
        {
            var prevDwell = existing.DwellMs ?? 0;
            var newDwell  = Math.Max(prevDwell, dwellMs ?? 0);
            existing.ViewedAt = now;
            existing.DwellMs  = newDwell;
            // Fire EMA only on the transition into "qualified read" — never twice for the same (user, byte) per day.
            emaShouldFire = prevDwell < 5000 && newDwell >= 5000;
        }

        await db.SaveChangesAsync(ct);

        if (emaShouldFire)
            await publisher.Publish(new UserViewedByteEvent(userId.Value, byteId), ct);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private static string SlugifyTechStack(string raw)
    {
        var trimmed = raw.Trim().ToLowerInvariant();
        var chars = trimmed.Select(c =>
            char.IsLetterOrDigit(c) ? c :
            (c == ' ' || c == '-' || c == '_' || c == '.' || c == '/') ? '_' :
            '\0').Where(c => c != '\0').ToArray();
        var slug = new string(chars);
        while (slug.Contains("__")) slug = slug.Replace("__", "_");
        return slug.Trim('_');
    }

    private static string TitleCaseLabel(string raw) =>
        System.Globalization.CultureInfo.InvariantCulture.TextInfo
            .ToTitleCase(raw.Trim().ToLower());
}
