namespace ByteAI.Api.ViewModels;

public sealed record CreateByteRequest(
    string Title,
    string Body,
    string? CodeSnippet,    // plain string — frontend must send as string, not object
    string? Language,
    string Type = "article", // article | tutorial | snippet | discussion
    List<string>? TechStackNames = null
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
    string AuthorUsername,
    string AuthorDisplayName,
    string? AuthorAvatarUrl,
    string? AuthorRole,
    string? AuthorCompany,
    string Title,
    string Body,
    string? CodeSnippet,
    string? Language,
    string Type,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    int CommentCount,
    int LikeCount,
    bool IsLiked = false,
    bool IsBookmarked = false
);
