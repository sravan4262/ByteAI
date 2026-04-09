namespace ByteAI.Api.ViewModels;

public sealed record SearchResponse(
    Guid Id,
    Guid AuthorId,
    string Title,
    string Body,
    string? CodeSnippet,
    string? Language,
    List<string> Tags,
    string Type,
    int LikeCount,
    int CommentCount,
    DateTime CreatedAt
);
