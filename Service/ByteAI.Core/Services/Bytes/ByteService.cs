using ByteAI.Core.Commands.Bytes;
using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Pgvector;

namespace ByteAI.Core.Services.Bytes;

public sealed class ByteService(AppDbContext db, IMediator mediator) : IByteService
{
    public async Task UpdateEmbeddingAsync(Guid byteId, float[] embedding, CancellationToken ct = default)
    {
        var entity = await db.Bytes.FindAsync([byteId], ct);
        if (entity is null) return;

        entity.Embedding = new Vector(embedding);
        await db.SaveChangesAsync(ct);
    }

    public Task<PagedResult<ByteResult>> GetBytesAsync(PaginationParams pagination, Guid? authorId, string sort, CancellationToken ct)
        => mediator.Send(new GetBytesQuery(pagination, authorId, sort), ct);

    public Task<ByteResult?> GetByteByIdAsync(Guid byteId, CancellationToken ct)
        => mediator.Send(new GetByteByIdQuery(byteId), ct);

    public async Task<ByteResult> CreateByteAsync(Guid authorId, string title, string body, string? codeSnippet, string? language, string type, CancellationToken ct)
    {
        var validTypes = new[] { "article", "tutorial", "snippet", "discussion" };
        var normalised = type == "byte" ? "article" : type;
        if (!validTypes.Contains(normalised)) normalised = "article";

        var result = await mediator.Send(new CreateByteCommand(authorId, title, body, codeSnippet, language, normalised), ct);
        return new ByteResult(result.Id, result.AuthorId, result.Title, result.Body, result.CodeSnippet, result.Language, result.Type, result.CreatedAt, result.UpdatedAt, 0, 0);
    }

    public Task<Byte> UpdateByteAsync(Guid byteId, Guid authorId, string? title, string? body, string? codeSnippet, string? language, CancellationToken ct)
        => mediator.Send(new UpdateByteCommand(byteId, authorId, title, body, codeSnippet, language), ct);

    public Task<bool> DeleteByteAsync(Guid byteId, Guid authorId, CancellationToken ct)
        => mediator.Send(new DeleteByteCommand(byteId, authorId), ct);

    public Task<PagedResult<ByteResult>> GetMyBytesAsync(Guid authorId, PaginationParams pagination, CancellationToken ct)
        => mediator.Send(new GetMyBytesQuery(authorId, pagination), ct);
}
