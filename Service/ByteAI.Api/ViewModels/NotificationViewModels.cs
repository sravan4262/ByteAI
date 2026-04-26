namespace ByteAI.Api.ViewModels;

public sealed record NotificationResponse(
    Guid Id,
    Guid UserId,
    string Type,
    object? Payload,
    string? ActorUsername,
    string? ActorDisplayName,
    string? ActorAvatarUrl,
    bool Read,
    DateTime CreatedAt
);
