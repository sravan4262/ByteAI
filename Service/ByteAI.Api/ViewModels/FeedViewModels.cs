namespace ByteAI.Api.ViewModels;

public sealed record FeedResponse(
    string Id,
    string AuthorId,
    string Title,
    string Body,
    string? CodeSnippet,
    string? Language,
    List<string> Tags,
    string Type,
    int LikeCount,
    int CommentCount,
    int BookmarkCount,
    int ViewCount,
    DateTime CreatedAt
);
