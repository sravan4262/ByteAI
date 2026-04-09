using ByteAI.Core.Entities;
using ByteAI.Core.Events;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ByteAI.Core.Commands.Reactions;

public sealed class CreateReactionCommandHandler(AppDbContext db, IPublisher publisher)
    : IRequestHandler<CreateReactionCommand, Reaction>
{
    public async Task<Reaction> Handle(CreateReactionCommand request, CancellationToken cancellationToken)
    {
        var byteEntity = await db.Bytes.FindAsync([request.ByteId], cancellationToken)
            ?? throw new KeyNotFoundException($"Byte {request.ByteId} not found");

        var existing = await db.Reactions
            .FirstOrDefaultAsync(r => r.ByteId == request.ByteId && r.UserId == request.UserId, cancellationToken);

        if (existing is not null)
            throw new InvalidOperationException("User already reacted to this byte");

        var reaction = new Reaction { ByteId = request.ByteId, UserId = request.UserId, Type = request.Type, CreatedAt = DateTime.UtcNow };
        byteEntity.LikeCount++;

        db.Reactions.Add(reaction);
        db.Bytes.Update(byteEntity);
        await db.SaveChangesAsync(cancellationToken);

        var author = await db.Users.FindAsync([byteEntity.AuthorId], cancellationToken);
        if (author is not null)
            await publisher.Publish(new ByteReactedEvent(request.ByteId, request.UserId, author.Id, request.Type), cancellationToken);

        return reaction;
    }
}

public sealed class DeleteReactionCommandHandler(AppDbContext db)
    : IRequestHandler<DeleteReactionCommand, bool>
{
    public async Task<bool> Handle(DeleteReactionCommand request, CancellationToken cancellationToken)
    {
        var reaction = await db.Reactions
            .FirstOrDefaultAsync(r => r.ByteId == request.ByteId && r.UserId == request.UserId, cancellationToken);

        if (reaction is null) return false;

        var byteEntity = await db.Bytes.FindAsync([request.ByteId], cancellationToken);
        if (byteEntity is not null)
        {
            byteEntity.LikeCount = Math.Max(0, byteEntity.LikeCount - 1);
            db.Bytes.Update(byteEntity);
        }

        db.Reactions.Remove(reaction);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }
}

public sealed class GetByteReactionsQueryHandler(AppDbContext db)
    : IRequestHandler<GetByteReactionsQuery, ReactionsCount>
{
    public async Task<ReactionsCount> Handle(GetByteReactionsQuery request, CancellationToken cancellationToken)
    {
        var reactions = await db.Reactions
            .Where(r => r.ByteId == request.ByteId)
            .GroupBy(r => r.Type)
            .Select(g => new { Type = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);

        var likeCount = reactions.FirstOrDefault(r => r.Type == "like")?.Count ?? 0;
        return new ReactionsCount(request.ByteId, likeCount, reactions.Sum(r => r.Count));
    }
}
