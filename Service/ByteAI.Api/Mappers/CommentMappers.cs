using ByteAI.Api.ViewModels;
using ByteAI.Core.Entities;
using ByteAI.Core.Services.Comments;

namespace ByteAI.Api.Mappers;

public static class CommentMappers
{
    public static CommentResponse ToResponse(this Comment entity) =>
        new(
            Id: entity.Id,
            ByteId: entity.ByteId,
            AuthorId: entity.AuthorId,
            ParentId: entity.ParentId,
            Body: entity.Body,
            VoteCount: entity.VoteCount,
            CreatedAt: entity.CreatedAt
        );

    public static CommentWithAuthorResponse ToWithAuthorResponse(this CommentWithAuthor cwa)
    {
        var name = cwa.DisplayName;
        var parts = name.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var initials = parts.Length >= 2
            ? $"{parts[0][0]}{parts[1][0]}".ToUpper()
            : (name.Length > 0 ? name[0].ToString().ToUpper() : "?");

        return new CommentWithAuthorResponse(
            Id: cwa.Comment.Id,
            ByteId: cwa.Comment.ByteId,
            ParentId: cwa.Comment.ParentId,
            Body: cwa.Comment.Body,
            VoteCount: cwa.Comment.VoteCount,
            CreatedAt: cwa.Comment.CreatedAt,
            Author: new CommentAuthorSummary(
                Id: cwa.Comment.AuthorId,
                Username: cwa.Username,
                DisplayName: cwa.DisplayName,
                Initials: initials,
                AvatarUrl: cwa.AvatarUrl
            )
        );
    }
}
