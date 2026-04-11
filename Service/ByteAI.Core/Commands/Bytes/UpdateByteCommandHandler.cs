using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ByteAI.Core.Commands.Bytes;

public sealed class UpdateByteCommandHandler(AppDbContext db)
    : IRequestHandler<UpdateByteCommand, Byte>
{
    public async Task<Byte> Handle(UpdateByteCommand request, CancellationToken cancellationToken)
    {
        var entity = await db.Bytes.FirstOrDefaultAsync(b => b.Id == request.ByteId, cancellationToken)
            ?? throw new KeyNotFoundException($"Byte {request.ByteId} not found");

        if (entity.AuthorId != request.AuthorId)
            throw new UnauthorizedAccessException("Cannot update another user's byte");

        if (!string.IsNullOrWhiteSpace(request.Title)) entity.Title = request.Title;
        if (!string.IsNullOrWhiteSpace(request.Body)) entity.Body = request.Body;
        if (request.CodeSnippet is not null) entity.CodeSnippet = request.CodeSnippet;
        if (request.Language is not null) entity.Language = request.Language;
        entity.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(cancellationToken);
        return entity;
    }
}
