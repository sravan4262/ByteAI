using ByteAI.Core.Infrastructure.Persistence;
using MediatR;
using Microsoft.Extensions.Logging;

namespace ByteAI.Core.Events;

public sealed class ContentBookmarkedEventHandler(
    AppDbContext db,
    ILogger<ContentBookmarkedEventHandler> logger)
    : INotificationHandler<ContentBookmarkedEvent>
{
    public async Task Handle(ContentBookmarkedEvent notification, CancellationToken cancellationToken)
    {
        var actionName = notification.ContentType == BookmarkedContentType.Byte
            ? "byte_saved_by_user"
            : "interview_saved_by_user";

        await XpAwarder.AwardAsync(db, notification.ContentAuthorId, actionName, logger, cancellationToken);
    }
}
