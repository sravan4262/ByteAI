namespace ByteAI.Api.ViewModels;

public sealed record BookmarkResponse(Guid ByteId, Guid UserId, DateTime CreatedAt);
