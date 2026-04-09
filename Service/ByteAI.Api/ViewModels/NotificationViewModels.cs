namespace ByteAI.Api.ViewModels;

public sealed record NotificationResponse(
    Guid Id,
    Guid UserId,
    string Type,
    object? Payload,
    bool Read,
    DateTime CreatedAt
);
