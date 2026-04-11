namespace ByteAI.Api.ViewModels;

public sealed record CreateByteRequest(
    string Title,
    string Body,
    string? CodeSnippet,    // plain string — frontend must send as string, not object
    string? Language,
    string Type = "article" // article | tutorial | snippet | discussion
);

public sealed record UpdateByteRequest(
    string? Title,
    string? Body,
    string? CodeSnippet,
    string? Language
);

public sealed record ByteResponse(
    Guid Id,
    Guid AuthorId,
    string Title,
    string Body,
    string? CodeSnippet,
    string? Language,
    string Type,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    int CommentCount,
    int LikeCount
);
