using ByteAI.Api.ViewModels;
using ByteAI.Core.Commands.Bytes;
using ByteAI.Core.Entities;

namespace ByteAI.Api.Mappers;

public static class ByteMappers
{
    public static CreateByteCommand ToCommand(this CreateByteRequest request, Guid authorId) =>
        new(authorId, request.Title, request.Body, request.CodeSnippet, request.Language, request.Type);

    public static UpdateByteCommand ToCommand(this UpdateByteRequest request, Guid byteId, Guid authorId) =>
        new(byteId, authorId, request.Title, request.Body, request.CodeSnippet, request.Language);

    public static ByteResponse ToResponse(this ByteResult result) =>
        new(
            Id: result.Id,
            AuthorId: result.AuthorId,
            AuthorUsername: result.AuthorUsername,
            AuthorDisplayName: result.AuthorDisplayName,
            AuthorAvatarUrl: result.AuthorAvatarUrl,
            AuthorRole: result.AuthorRole,
            AuthorCompany: result.AuthorCompany,
            Title: result.Title,
            Body: result.Body,
            CodeSnippet: result.CodeSnippet,
            Language: result.Language,
            Type: result.Type,
            CreatedAt: result.CreatedAt,
            UpdatedAt: result.UpdatedAt,
            CommentCount: result.CommentCount,
            LikeCount: result.LikeCount,
            IsLiked: result.IsLiked,
            IsBookmarked: result.IsBookmarked
        );

    // Used for write operations (create/update) where author join is not needed
    public static ByteResponse ToResponse(this Byte entity, int commentCount = 0, int likeCount = 0) =>
        new(
            Id: entity.Id,
            AuthorId: entity.AuthorId,
            AuthorUsername: string.Empty,
            AuthorDisplayName: string.Empty,
            AuthorAvatarUrl: null,
            AuthorRole: null,
            AuthorCompany: null,
            Title: entity.Title,
            Body: entity.Body,
            CodeSnippet: entity.CodeSnippet,
            Language: entity.Language,
            Type: entity.Type,
            CreatedAt: entity.CreatedAt,
            UpdatedAt: entity.UpdatedAt,
            CommentCount: commentCount,
            LikeCount: likeCount
        );
}
