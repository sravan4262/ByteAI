using ByteAI.Api.ViewModels;
using ByteAI.Core.Commands.Bytes;
using ByteAI.Core.Entities;

namespace ByteAI.Api.Mappers;

public static class ByteMappers
{
    public static CreateByteCommand ToCommand(this CreateByteRequest request, Guid authorId) =>
        new(authorId, request.Title, request.Body, request.CodeSnippet, request.Language, request.Tags, request.Type);

    public static UpdateByteCommand ToCommand(this UpdateByteRequest request, Guid byteId, Guid authorId) =>
        new(byteId, authorId, request.Title, request.Body, request.CodeSnippet, request.Language, request.Tags);

    public static ByteResponse ToResponse(this Byte entity) =>
        new(
            Id: entity.Id,
            AuthorId: entity.AuthorId,
            Title: entity.Title,
            Body: entity.Body,
            CodeSnippet: entity.CodeSnippet,
            Language: entity.Language,
            Tags: entity.Tags ?? [],
            Type: entity.Type,
            ViewCount: entity.ViewCount,
            LikeCount: entity.LikeCount,
            CommentCount: entity.CommentCount,
            BookmarkCount: entity.BookmarkCount,
            CreatedAt: entity.CreatedAt,
            UpdatedAt: entity.UpdatedAt
        );
}
