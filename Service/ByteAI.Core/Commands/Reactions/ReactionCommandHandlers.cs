using ByteAI.Core.Entities;
using ByteAI.Core.Events;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ByteAI.Core.Commands.Reactions;

public sealed class CreateReactionCommandHandler(AppDbContext db, IPublisher publisher)
    : IRequestHandler<CreateReactionCommand, ToggleLikeResult>
{
    public async Task<ToggleLikeResult> Handle(CreateReactionCommand request, CancellationToken cancellationToken)
    {
        var existing = await db.UserLikes
            .FirstOrDefaultAsync(r => r.ByteId == request.ByteId && r.UserId == request.UserId, cancellationToken);

        // Toggle: if already liked, unlike
        if (existing is not null)
        {
            db.UserLikes.Remove(existing);
            await db.SaveChangesAsync(cancellationToken);
            return new ToggleLikeResult(request.ByteId, request.UserId, IsLiked: false);
        }

        var byteEntity = await db.Bytes.FindAsync([request.ByteId], cancellationToken)
            ?? throw new KeyNotFoundException($"Byte {request.ByteId} not found");

        var like = new UserLike { ByteId = request.ByteId, UserId = request.UserId, CreatedAt = DateTime.UtcNow };
        db.UserLikes.Add(like);
        await db.SaveChangesAsync(cancellationToken);

        var author = await db.Users.FindAsync([byteEntity.AuthorId], cancellationToken);
        if (author is not null)
            await publisher.Publish(new ByteReactedEvent(request.ByteId, request.UserId, author.Id, request.Type), cancellationToken);

        // Update user's interest embedding toward this byte's content (fire-and-forget)
        _ = publisher.Publish(new UserEngagedWithByteEvent(request.UserId, request.ByteId), cancellationToken);

        return new ToggleLikeResult(request.ByteId, request.UserId, IsLiked: true);
    }
}

public sealed class DeleteReactionCommandHandler(AppDbContext db)
    : IRequestHandler<DeleteReactionCommand, bool>
{
    public async Task<bool> Handle(DeleteReactionCommand request, CancellationToken cancellationToken)
    {
        var like = await db.UserLikes
            .FirstOrDefaultAsync(r => r.ByteId == request.ByteId && r.UserId == request.UserId, cancellationToken);

        if (like is null) return false;

        db.UserLikes.Remove(like);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }
}

public sealed class GetByteReactionsQueryHandler(AppDbContext db)
    : IRequestHandler<GetByteReactionsQuery, ReactionsCount>
{
    public async Task<ReactionsCount> Handle(GetByteReactionsQuery request, CancellationToken cancellationToken)
    {
        var likeCount = await db.UserLikes
            .CountAsync(r => r.ByteId == request.ByteId, cancellationToken);

        return new ReactionsCount(request.ByteId, likeCount, likeCount);
    }
}

public sealed class GetByteLikersQueryHandler(AppDbContext db)
    : IRequestHandler<GetByteLikersQuery, List<LikerInfo>>
{
    public async Task<List<LikerInfo>> Handle(GetByteLikersQuery request, CancellationToken ct) =>
        await db.UserLikes
            .Where(l => l.ByteId == request.ByteId)
            .ExcludeBlockedFor(request.RequesterId, db, l => l.UserId)
            .OrderByDescending(l => l.CreatedAt)
            .Select(l => new LikerInfo(l.UserId, l.User.Username, l.User.DisplayName, l.User.IsVerified))
            .ToListAsync(CancellationToken.None);
}
