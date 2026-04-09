namespace ByteAI.Api.ViewModels;

public sealed record CreateByteRequest(
    string Title,
    string Body,
    string? CodeSnippet,
    string? Language,
    List<string> Tags,
    string Type = "article"
);

public sealed record UpdateByteRequest(
    string? Title,
    string? Body,
    string? CodeSnippet,
    string? Language,
    List<string>? Tags
);

public sealed record ByteResponse(
    Guid Id,
    Guid AuthorId,
    string Title,
    string Body,
    string? CodeSnippet,
    string? Language,
    List<string> Tags,
    string Type,
    int ViewCount,
    int LikeCount,
    int CommentCount,
    int BookmarkCount,
    DateTime CreatedAt,
    DateTime UpdatedAt
);
