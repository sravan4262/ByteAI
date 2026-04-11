namespace ByteAI.Api.ViewModels;

public sealed record CreateReactionRequest(string Type = "like");

public sealed record ReactionResponse(Guid ByteId, Guid UserId, DateTime CreatedAt);

public sealed record ReactionsCountResponse(Guid ByteId, int LikeCount, int Total);

public sealed record LikerResponse(Guid UserId, string Username, string DisplayName, bool IsVerified);

public sealed record ToggleLikeResponse(Guid ByteId, Guid UserId, bool IsLiked);
