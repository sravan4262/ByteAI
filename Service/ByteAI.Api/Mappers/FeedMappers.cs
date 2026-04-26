using ByteAI.Api.ViewModels;
using ByteAI.Core.Commands.Search;

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
            Type: entity.Type,
            CreatedAt: entity.CreatedAt
        );

    public static SearchResponse ToSearchResponse(this SearchResultDto dto) =>
        new(
            Id: dto.Id,
            AuthorId: dto.AuthorId,
            AuthorUsername: dto.AuthorUsername,
            AuthorDisplayName: dto.AuthorDisplayName,
            AuthorAvatarUrl: dto.AuthorAvatarUrl,
            AuthorRoleTitle: dto.AuthorRoleTitle,
            AuthorCompany: dto.AuthorCompany,
            Title: dto.Title,
            Body: dto.Body,
            CodeSnippet: dto.CodeSnippet,
            Language: dto.Language,
            Tags: [.. dto.Tags],
            Type: dto.Type,
            ContentType: dto.ContentType,
            LikeCount: dto.LikeCount,
            CommentCount: dto.CommentCount,
            CreatedAt: dto.CreatedAt
        );
}
