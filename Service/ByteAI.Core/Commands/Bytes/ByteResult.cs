namespace ByteAI.Core.Commands.Bytes;

/// <summary>Projection DTO for byte queries — includes computed stats and author details.</summary>
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
    int LikeCount,
    bool IsLiked = false,
    bool IsBookmarked = false,
    string AuthorUsername = "",
    string AuthorDisplayName = "",
    string? AuthorAvatarUrl = null,
    string? AuthorRole = null,
    string? AuthorCompany = null
);
