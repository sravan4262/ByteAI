namespace ByteAI.Api.ViewModels;

public sealed record CreateReactionRequest(string Type = "like");

public sealed record ReactionResponse(Guid ByteId, Guid UserId, string Type, DateTime CreatedAt);

public sealed record ReactionsCountResponse(Guid ByteId, int LikeCount, int Total);
