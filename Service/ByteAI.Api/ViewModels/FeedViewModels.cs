namespace ByteAI.Api.ViewModels;

public sealed record FeedResponse(
    string Id,
    string AuthorId,
    string Title,
    string Body,
    string? CodeSnippet,
    string? Language,
    string Type,
    DateTime CreatedAt
);
