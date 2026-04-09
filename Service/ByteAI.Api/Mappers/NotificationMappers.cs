using ByteAI.Api.ViewModels;
using ByteAI.Core.Entities;
using System.Text.Json;

namespace ByteAI.Api.Mappers;

public static class NotificationMappers
{
    public static NotificationResponse ToResponse(this Notification entity) =>
        new(
            Id: entity.Id,
            UserId: entity.UserId,
            Type: entity.Type,
            Payload: entity.Payload is null
                ? null
                : JsonSerializer.Deserialize<object>(entity.Payload.RootElement.GetRawText()),
            Read: entity.Read,
            CreatedAt: entity.CreatedAt
        );
}
