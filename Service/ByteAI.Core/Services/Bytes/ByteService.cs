using ByteAI.Core.Commands.Bytes;
using ByteAI.Core.Entities;
using ByteAI.Core.Events;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Pgvector;

namespace ByteAI.Core.Services.Bytes;

public sealed class ByteService(AppDbContext db, IPublisher publisher) : IByteService
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

    public async Task<ByteResult> CreateByteAsync(Guid authorId, string title, string body, string? codeSnippet, string? language, string type, CancellationToken ct)
    {
        var validTypes = new[] { "article", "tutorial", "snippet", "discussion" };
        var normalised = type == "byte" ? "article" : type;
        if (!validTypes.Contains(normalised)) normalised = "article";

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
            new ByteCreatedEvent(entity.Id, entity.Body, entity.CodeSnippet),
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
}
