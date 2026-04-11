namespace ByteAI.Core.Commands.Bytes;

/// <summary>Projection DTO for byte queries — includes computed stats like comment count and like count.</summary>
public sealed record ByteResult(
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
