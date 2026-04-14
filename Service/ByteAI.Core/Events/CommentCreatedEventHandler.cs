using ByteAI.Core.Infrastructure.Persistence;
using MediatR;
using Microsoft.Extensions.Logging;

namespace ByteAI.Core.Events;

public sealed class CommentCreatedEventHandler(
    AppDbContext db,
    ILogger<CommentCreatedEventHandler> logger)
    : INotificationHandler<CommentCreatedEvent>
{
    public async Task Handle(CommentCreatedEvent notification, CancellationToken cancellationToken)
    {
        // XP for the person who wrote the comment
        await XpAwarder.AwardAsync(db, notification.AuthorId, "post_comment", logger, cancellationToken);

        // XP for the content author (their post received a comment)
        await XpAwarder.AwardAsync(db, notification.ContentAuthorId, "receive_comment", logger, cancellationToken);
    }
}
