using ByteAI.Api.ViewModels;
using ByteAI.Core.Services.Notifications;
using System.Text.Json;

namespace ByteAI.Api.Mappers;

public static class NotificationMappers
{
    public static NotificationResponse ToResponse(this NotificationWithActor pair)
    {
        var n = pair.Notification;
        return new NotificationResponse(
            Id: n.Id,
            UserId: n.UserId,
            Type: n.Type,
            Payload: n.Payload is null
                ? null
                : JsonSerializer.Deserialize<object>(n.Payload.RootElement.GetRawText()),
            // Live actor data joined at read time — falls through to null if the actor is gone
            // (deleted user, anonymous notification, etc.) and the UI shows the initials fallback.
            ActorUsername:    pair.Actor?.Username,
            ActorDisplayName: pair.Actor?.DisplayName ?? pair.Actor?.Username,
            ActorAvatarUrl:   pair.Actor?.AvatarUrl,
            Read: n.Read,
            CreatedAt: n.CreatedAt
        );
    }
}
