namespace ByteAI.Api.ViewModels;

public sealed record CreateCommentRequest(string Body, Guid? ParentCommentId = null);

public sealed record UpdateCommentRequest(string Body);

public sealed record CommentResponse(
    Guid Id,
    Guid ByteId,
    Guid AuthorId,
    Guid? ParentId,
    string Body,
    int VoteCount,
    DateTime CreatedAt
);

public sealed record CommentAuthorSummary(
    Guid Id,
    string Username,
    string DisplayName,
    string Initials,
    string? AvatarUrl
);

public sealed record CommentWithAuthorResponse(
    Guid Id,
    Guid ByteId,
    Guid? ParentId,
    string Body,
    int VoteCount,
    DateTime CreatedAt,
    CommentAuthorSummary Author
);
