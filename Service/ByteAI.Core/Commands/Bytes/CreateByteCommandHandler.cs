using ByteAI.Core.Entities;
using ByteAI.Core.Events;
using ByteAI.Core.Infrastructure.Persistence;
using MediatR;

namespace ByteAI.Core.Commands.Bytes;

public sealed class CreateByteCommandHandler(AppDbContext db, IPublisher publisher)
    : IRequestHandler<CreateByteCommand, Byte>
{
    public async Task<Byte> Handle(CreateByteCommand request, CancellationToken cancellationToken)
    {
        var entity = new Byte
        {
            Id = Guid.NewGuid(),
            AuthorId = request.AuthorId,
            Title = request.Title,
            Body = request.Body,
            CodeSnippet = request.CodeSnippet,
            Language = request.Language,
            Type = request.Type,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        db.Bytes.Add(entity);
        await db.SaveChangesAsync(cancellationToken);

        await publisher.Publish(
            new ByteCreatedEvent(entity.Id, entity.Body, entity.CodeSnippet),
            cancellationToken);

        return entity;
    }
}
