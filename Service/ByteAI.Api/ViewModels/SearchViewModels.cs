namespace ByteAI.Api.ViewModels;

public sealed record UserSearchResponse(
    Guid Id,
    string Username,
    string DisplayName,
    string? Bio,
    string? AvatarUrl,
    bool IsVerified
);

public sealed record SearchResponse(
    Guid Id,
    Guid AuthorId,
    string AuthorUsername,
    string? AuthorDisplayName,
    string? AuthorAvatarUrl,
    string? AuthorRoleTitle,
    string? AuthorCompany,
    string Title,
    string Body,
    string? CodeSnippet,
    string? Language,
    List<string> Tags,
    string Type,
    string ContentType,     // "byte" | "interview"
    int LikeCount,
    int CommentCount,
    DateTime CreatedAt
);
