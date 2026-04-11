using MediatR;

namespace ByteAI.Core.Commands.Search;

public sealed record SearchQuery(
    string Q,
    int Limit = 20,
    Guid? UserId = null,        // if provided, user's interest_embedding used for vector search
    string Type = "all"         // "bytes" | "interviews" | "all"
) : IRequest<List<SearchResultDto>>;

/// <summary>
/// Unified search result — produced by both bytes and interviews searches.
/// ContentType discriminates the source table: "byte" or "interview".
/// </summary>
public sealed record SearchResultDto(
    Guid Id,
    Guid AuthorId,
    string Title,
    string Body,
    string? CodeSnippet,
    string? Language,
    string[] Tags,
    string Type,
    string ContentType,      // "byte" | "interview"
    int LikeCount,
    int CommentCount,
    DateTime CreatedAt
);
