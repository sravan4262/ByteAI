using ByteAI.Api.ViewModels;

namespace ByteAI.Api.Mappers;

public static class FeedMappers
{
    public static FeedResponse ToFeedResponse(this Byte entity) =>
        new(
            Id: entity.Id.ToString(),
            AuthorId: entity.AuthorId.ToString(),
            Title: entity.Title,
            Body: entity.Body,
            CodeSnippet: entity.CodeSnippet,
            Language: entity.Language,
            Tags: entity.Tags ?? [],
            Type: entity.Type,
            LikeCount: entity.LikeCount,
            CommentCount: entity.CommentCount,
            BookmarkCount: entity.BookmarkCount,
            ViewCount: entity.ViewCount,
            CreatedAt: entity.CreatedAt
        );

    public static SearchResponse ToSearchResponse(this Byte entity) =>
        new(
            Id: entity.Id,
            AuthorId: entity.AuthorId,
            Title: entity.Title,
            Body: entity.Body,
            CodeSnippet: entity.CodeSnippet,
            Language: entity.Language,
            Tags: entity.Tags ?? [],
            Type: entity.Type,
            LikeCount: entity.LikeCount,
            CommentCount: entity.CommentCount,
            CreatedAt: entity.CreatedAt
        );
}
